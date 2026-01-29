import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TelegramService } from 'src/telegram/telegram.service';
import { VitalType, RiskLevel, Prisma } from '@prisma/client';
import { PredictionService } from 'src/prediction/prediction.service';

// Interface para o Buffer de leitura em memória
interface VitalReading {
  bpm: number;
  spo2: number;
  timestamp: Date;
  activityPatternId: string | null;
}

// Tipagem avançada do Prisma para garantir que as relações existam no objeto patient
type PatientWithRelations = Prisma.PatientGetPayload<{
  include: {
    currentActivity: true;
    customThresholds: true;
  };
}>;

@Injectable()
export class HealthMonitorService {
  private readonly logger = new Logger(HealthMonitorService.name);
  // Buffer para acumular leituras antes de salvar a média no banco (otimização)
  private buffer = new Map<string, VitalReading[]>();

  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
    private predictionService: PredictionService,
  ) {}

  /**
   * Ponto de entrada principal vindo do Gateway (MQTT)
   */
  async monitorVitals(deviceId: string, data: { bpm: number; spo2: number }) {
    if (data.bpm <= 0 || data.spo2 <= 0) return null;

    try {
      // 1. Busca via Device para encontrar o Paciente dono do sensor
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId },
        include: {
          patient: {
            include: {
              currentActivity: true,
              customThresholds: true,
            },
          },
        },
      });

      const patient = device?.patient as PatientWithRelations | null;

      if (!patient) {
        this.logger.warn(`⚠️ Dispositivo ${deviceId} não está vinculado a nenhum paciente.`);
        return null;
      }

      // 2. Localiza os limites (thresholds) personalizados para a atividade que o paciente está fazendo agora
      const activeThreshold = patient.customThresholds.find(
        (t) => t.activityPatternId === patient.currentActivityId,
      );

      // 3. Validação Clínica em Tempo Real (Dispara Telegram se necessário)
      await this.checkClinicalStandards(patient, activeThreshold, data);

      // 4. Adiciona ao buffer para posterior salvamento de médias
      await this.addToBuffer(patient.id, {
        bpm: data.bpm,
        spo2: data.spo2,
        activityPatternId: patient.currentActivityId,
        timestamp: new Date(),
      });

      // 5. Retorna o paciente para o Gateway emitir via WebSocket
      return patient;

    } catch (error) {
      this.logger.error(`❌ Erro no processamento de vitais: ${error.message}`);
      return null;
    }
  }

  /**
   * Analisa os sinais contra os limites configurados
   */
  private async checkClinicalStandards(
    patient: PatientWithRelations,
    threshold: any,
    data: { bpm: number; spo2: number }
  ) {
    // Fallback para valores padrão caso não haja threshold específico configurado
    const limits = {
      bpmMin: threshold?.bpmMin ?? 60,
      bpmMax: threshold?.bpmMax ?? 100,
      spo2Min: threshold?.spo2Min ?? 94,
    };

    const activityName = patient.currentActivity?.name || 'Repouso';
    console.log(activityName, "ACTIVITY NAME")

    // Verificação de Batimentos
    if (data.bpm > limits.bpmMax) {
      await this.telegram.sendMessage(
        `🚨 *TAQUICARDIA* 🚨\n👤 *Paciente:* ${patient.name}\n💓 *BPM:* ${data.bpm} (Máx: ${limits.bpmMax})\n🏃 *Atividade:* ${activityName}`
      );
    } else if (data.bpm < limits.bpmMin) {
      await this.telegram.sendMessage(
        `🚨 *BRADICARDIA* 🚨\n👤 *Paciente:* ${patient.name}\n💓 *BPM:* ${data.bpm} (Mín: ${limits.bpmMin})\n🏃 *Atividade:* ${activityName}`
      );
    }

    // Verificação de Oxigênio
    if (data.spo2 < limits.spo2Min) {
      await this.telegram.sendMessage(
        `⚠️ *HIPÓXIA* ⚠️\n👤 *Paciente:* ${patient.name}\n🩸 *SpO2:* ${data.spo2}% (Mín: ${limits.spo2Min}%)\n🏃 *Atividade:* ${activityName}`
      );
    }
  }

  /**
   * Monitoramento de Quedas
   */
  async monitorFall(deviceId: string, data: any) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: { patient: true }
    });

    const patient = device?.patient;

    if (patient) {
      await this.telegram.sendMessage(`🆘 *QUEDA DETECTADA* 🆘\n👤 *Paciente:* ${patient.name}\n📍 Verifique o local imediatamente!`);
      
      // Registra o evento de queda no banco
      await this.prisma.vitalSign.create({
        data: {
          type: VitalType.HEART_RATE,
          value: 0,
          unit: 'FALL_EVENT',
          patientId: patient.id,
        },
      });
    }
    return patient;
  }

  /**
   * Gerenciamento de Buffer (Acumula 10 leituras antes de gravar no DB)
   */
  private async addToBuffer(patientId: string, data: VitalReading) {
    if (!this.buffer.has(patientId)) {
      this.buffer.set(patientId, []);
    }

    const readings = this.buffer.get(patientId)!;
    readings.push(data);

    // Quando atingir 10 amostras, tira a média e salva permanentemente
    if (readings.length >= 10) {
      await this.saveAverages(patientId, readings);
      this.buffer.set(patientId, []);
    }
  }

  private async saveAverages(patientId: string, readings: VitalReading[]) {
    try {
      const avgBpm = Math.round(readings.reduce((s, r) => s + r.bpm, 0) / readings.length);
      const avgSpo2 = Math.round(readings.reduce((s, r) => s + r.spo2, 0) / readings.length);
      const contextId = readings[readings.length - 1].activityPatternId;

      // Salva as médias no banco
      await this.prisma.vitalSign.createMany({
        data: [
          {
            type: VitalType.HEART_RATE,
            value: avgBpm,
            unit: 'bpm',
            patientId,
            activityPatternId: contextId,
          },
          {
            type: VitalType.OXYGEN_SATURATION,
            value: avgSpo2,
            unit: '%',
            patientId,
            activityPatternId: contextId,
          },
        ],
      });

      // Chama a IA para analisar a nova média salva
      const prediction = await this.predictionService.generatePrediction(patientId);
      if (prediction && prediction.riskLevel === RiskLevel.HIGH) {
        await this.telegram.sendMessage(
          `🤖 *IA - ALERTA DE RISCO* 🤖\n👤 *Paciente:* ${patientId}\n📉 *Análise:* ${prediction.reason}`
        );
      }
    } catch (error) {
      this.logger.error(`Erro ao salvar médias no banco: ${error.message}`);
    }
  }

  /**
   * Métodos auxiliares de consulta
   */
  async getRecentVitals(patientId: string, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.prisma.vitalSign.findMany({
      where: { patientId, timestamp: { gte: since } },
      include: { activityPattern: true },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }

  async forceSaveAllBuffers() {
    for (const [pid, readings] of this.buffer.entries()) {
      if (readings.length > 0) {
        await this.saveAverages(pid, readings);
        this.buffer.set(pid, []);
      }
    }
  }
}