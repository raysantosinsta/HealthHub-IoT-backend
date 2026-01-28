import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReportsEmailService } from 'src/reports-email/reports-email.service';
import { PdfService } from 'src/reports-pdf/reports-pdf.service';
import { VitalType } from '@prisma/client';

@Injectable()
export class WeeklyReportService {
  private readonly logger = new Logger(WeeklyReportService.name);

  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
    private emailService: ReportsEmailService,
  ) {}

  @Cron('0 0 8 * * 1')
  async generateAndSendReports() {
    this.logger.log('📅 Iniciando geração de relatórios semanais...');

    try {
      const patients = await this.prisma.patient.findMany({
        where: { active: true },
        include: { company: true },
      });

      for (const patient of patients) {
        await this.processPatientReport(patient);
        // Delay para evitar sobrecarga no envio de e-mails
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      this.logger.error('Erro ao buscar pacientes:', error.message);
    }
  }

  public async processPatientReport(patient: any, emailOverride?: string) {
    this.logger.log(`🔍 Processando relatório: ${patient.name}`);

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 1. Busca todos os vitais da semana com o padrão de atividade incluído
      const vitals = await this.prisma.vitalSign.findMany({
        where: {
          patientId: patient.id,
          timestamp: { gte: sevenDaysAgo },
        },
        include: { activityPattern: true },
      });

      if (vitals.length === 0) {
        this.logger.warn(`⚠️ Sem dados para ${patient.name}.`);
        return;
      }

      // 2. Busca a última predição da IA para extrair o risco e o motivo
      const lastPrediction = await this.prisma.healthPrediction.findFirst({
        where: { patientId: patient.id },
        orderBy: { generatedAt: 'desc' },
      });

      // 3. LÓGICA DE CÁLCULO BASEADA NO CONTEXTO
      const restingVitals = vitals.filter(
        (v) =>
          v.type === VitalType.HEART_RATE &&
          ['repouso', 'dormindo'].includes(v.activityPattern?.slug || ''),
      );

      const activeVitals = vitals.filter(
        (v) =>
          v.type === VitalType.HEART_RATE &&
          !['repouso', 'dormindo'].includes(v.activityPattern?.slug || ''),
      );

      const spo2Vitals = vitals.filter(
        (v) => v.type === VitalType.OXYGEN_SATURATION,
      );

      // Monta o objeto de stats para o PDF
      const stats = {
        avgRestingBpm: this.calcAvg(restingVitals),
        avgActiveBpm: this.calcAvg(activeVitals),
        avgSpo2: this.calcAvg(spo2Vitals),
        criticalAlertsCount: vitals.filter(
          (v) => v.value === 0 && v.unit === 'FALL_EVENT',
        ).length, // Exemplo: quedas
        maxBpm: Math.max(
          ...vitals
            .filter((v) => v.type === VitalType.HEART_RATE)
            .map((v) => v.value),
          0,
        ),
        lastAiReason: lastPrediction?.reason || 'Análise de tendência estável.',
        riskLevel: lastPrediction?.riskLevel || 'LOW',
      };

      // 4. Gera PDF
      const pdfBuffer = await this.pdfService.generateWeeklyReport(
        patient.name,
        stats,
        patient.company?.name, // ← Passe o nome da empresa
        new Date(),
      );

      // 5. Definição de Destinatário (Hierarquia: Override > Empresa > Paciente)
      const emailDestino =
        emailOverride ||
        patient.company?.email ||
        patient.email ||
        'seu-email-teste@gmail.com';

      // 6. Envia o e-mail
      await this.emailService.sendReportWithAttachment(
        emailDestino,
        patient.name,
        pdfBuffer,
      );

      this.logger.log(`✅ Relatório enviado para ${emailDestino}`);
    } catch (error) {
      this.logger.error(
        `❌ Erro no WeeklyService para ${patient.name}: ${error.message}`,
      );
    }
  }

  private calcAvg(readings: any[]): number {
    if (readings.length === 0) return 0;
    const sum = readings.reduce((acc, curr) => acc + curr.value, 0);
    return sum / readings.length;
  }
}
