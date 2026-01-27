import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { TelegramService } from 'src/telegram/telegram.service';
import { VitalType } from '@prisma/client';

@Injectable()
export class TrendAnalysisService {
  private readonly logger = new Logger(TrendAnalysisService.name);

  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  // Ajustado para rodar a cada 30 segundos (Equilíbrio entre tempo real e carga no banco)
  @Cron(CronExpression.EVERY_30_SECONDS)
  async analyzeOxygenTrends() {
    try {
      const patients = await this.prisma.patient.findMany({
        where: { active: true },
        include: { currentActivity: true } // Inclui a atividade atual para o alerta
      });

      for (const patient of patients) {
        await this.checkPatientTrend(patient);
      }
    } catch (error) {
      this.logger.error('Erro ao buscar pacientes para análise de tendência:', error);
    }
  }

  private async checkPatientTrend(patient: any) {
    const now = new Date();
    const INTERVAL = 2 * 60 * 1000; // Analisando janelas de 2 minutos

    const p1End = now;
    const p1Start = new Date(now.getTime() - INTERVAL);
    const p2Start = new Date(now.getTime() - INTERVAL * 2);
    const p3Start = new Date(now.getTime() - INTERVAL * 3);

    const avgRecent = await this.getAverageSpo2(patient.id, p1Start, p1End);
    const avgMid = await this.getAverageSpo2(patient.id, p2Start, p1Start);
    const avgOld = await this.getAverageSpo2(patient.id, p3Start, p2Start);

    if (avgRecent === null || avgMid === null || avgOld === null) return;

    // Lógica de detecção de queda progressiva
    const isDeclining = avgRecent < avgMid && avgMid < avgOld;
    const totalDrop = avgOld - avgRecent;

    // Se houver queda progressiva e a saturação atual estiver abaixo de 94% (Limite clínico comum)
    if (isDeclining && (totalDrop >= 2 || avgRecent < 94)) {
      const activityName = patient.currentActivity?.name || 'Não informada';
      
      const msg =
        `⚠️ *TENDÊNCIA DE QUEDA DE SpO2* ⚠️\n\n` +
        `👤 *Paciente:* ${patient.name}\n` +
        `🏃 *Atividade Atual:* ${activityName}\n` +
        `📉 *Histórico (6min):* ${avgOld.toFixed(1)}% → ${avgMid.toFixed(1)}% → *${avgRecent.toFixed(1)}%*\n\n` +
        `❗ _Queda total de ${totalDrop.toFixed(1)}% detectada._`;

      await this.telegram.sendMessage(msg);
      this.logger.warn(`Tendência de queda crítica para ${patient.name} (${activityName})`);
    }
  }

  private async getAverageSpo2(patientId: string, start: Date, end: Date): Promise<number | null> {
    try {
      const result = await this.prisma.vitalSign.aggregate({
        _avg: { value: true },
        where: {
          patientId: patientId,
          type: VitalType.OXYGEN_SATURATION,
          timestamp: { gte: start, lt: end },
        },
      });
      return result._avg.value || null;
    } catch (error) {
      this.logger.error(`Erro na média SpO2 (${patientId}):`, error);
      return null;
    }
  }
}