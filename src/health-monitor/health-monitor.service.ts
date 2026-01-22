import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { TelegramService } from "src/telegram/telegram.service";

// Interface para o Buffer
interface VitalReading {
  bpm: number;
  spo2: number;
  timestamp: Date;
}

@Injectable()
export class HealthMonitorService {
  private readonly logger = new Logger(HealthMonitorService.name);

  // MEMÓRIA TEMPORÁRIA: Guarda as leituras de cada paciente
  // Chave = ID do Paciente, Valor = Array de leituras
  private buffer = new Map<string, VitalReading[]>();

  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  async monitorVitals(patientId: string, data: { bpm: number; spo2: number }) {
    // Validação básica para ignorar zeros/ruído
    if (data.bpm <= 0 || data.spo2 <= 0) return;

    // 1. BUSCAR PADRÃO CLÍNICO DO PACIENTE
    // (Em produção, idealmente usaríamos Cache/Redis para não bater no banco toda hora)
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { name: true, bpmMin: true, bpmMax: true, spo2Min: true }
    });

    if (!patient) {
      this.logger.warn(`Paciente ${patientId} não encontrado no banco.`);
      return;
    }

    // 2. COMPARAÇÃO EM TEMPO REAL (Requisito 2)
    // Verificamos o dado BRUTO imediatamente para segurança
    await this.checkClinicalStandards(patientId, patient, data);

    // 3. BUFFER E CÁLCULO DE MÉDIA (Requisito 1)
    this.addToBuffer(patientId, data);
  }

  // --- LÓGICA DE BUFFER (AGRUPAR 10 LEITURAS) ---
  // --- LÓGICA DE BUFFER (AGRUPAR 10 LEITURAS) ---
  private async addToBuffer(patientId: string, data: { bpm: number; spo2: number }) {
    // Se não existe buffer para esse paciente, cria um array vazio
    if (!this.buffer.has(patientId)) {
      this.buffer.set(patientId, []);
    }

    // O "!" no final avisa ao TypeScript que temos certeza que não é undefined
    const patientReadings = this.buffer.get(patientId)!; 
    
    patientReadings.push({ ...data, timestamp: new Date() });

    // Se atingiu 10 leituras, processa a média e salva
    if (patientReadings.length >= 10) {
      await this.saveAverages(patientId, patientReadings);
      // Limpa o buffer para começar o próximo lote
      this.buffer.set(patientId, []);
      this.logger.log(`💾 Lote de 10 leituras processado e salvo para ${patientId}`);
    }
  }

  private async saveAverages(patientId: string, readings: VitalReading[]) {
    // Calcula as médias
    const totalBpm = readings.reduce((sum, r) => sum + r.bpm, 0);
    const totalSpo2 = readings.reduce((sum, r) => sum + r.spo2, 0);
    
    const avgBpm = Math.round(totalBpm / readings.length);
    const avgSpo2 = Math.round(totalSpo2 / readings.length);

    // Salva BPM Médio
    await this.prisma.vitalSign.create({
      data: {
        type: 'HEART_RATE',
        value: avgBpm,
        unit: 'bpm',
        patientId: patientId,
      },
    });

    // Salva SpO2 Médio
    await this.prisma.vitalSign.create({
      data: {
        type: 'OXYGEN_SATURATION',
        value: avgSpo2,
        unit: '%',
        patientId: patientId,
      },
    });
  }

  // --- LÓGICA DE VALIDAÇÃO CLÍNICA ---
  private async checkClinicalStandards(patientId: string, patient: any, data: { bpm: number; spo2: number }) {
    // Valida BPM (Personalizado do Paciente)
    if (data.bpm > patient.bpmMax) {
      await this.telegram.sendMessage(`❤️ TAQUICARDIA: ${patient.name} está com ${data.bpm} BPM (Limite: ${patient.bpmMax})`);
    } else if (data.bpm < patient.bpmMin) {
      await this.telegram.sendMessage(`💙 BRADICARDIA: ${patient.name} está com ${data.bpm} BPM (Mínimo: ${patient.bpmMin})`);
    }

    // Valida Oxigênio (Personalizado do Paciente)
    if (data.spo2 < patient.spo2Min) {
      await this.telegram.sendMessage(`⚠️ HIPÓXIA: ${patient.name} está com saturação ${data.spo2}% (Mínimo aceitável: ${patient.spo2Min}%)`);
    }
  }

  async monitorFall(patientId: string, data: any) {
    if (data.status === 'QUEDA_CONFIRMADA') {
      this.logger.warn(`Queda detectada para ${patientId}`);
      await this.telegram.sendMessage(`🚨 EMERGÊNCIA: Queda detectada para o paciente ID: ${patientId}`);
    }
  }
}