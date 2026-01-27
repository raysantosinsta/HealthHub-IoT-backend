import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VitalType, RiskLevel, VitalSign } from '@prisma/client';

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);

  constructor(private prisma: PrismaService) {}

  async generatePrediction(patientId: string) {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    try {
      // 1️⃣ Buscar histórico incluindo o padrão de atividade (Contexto)
      const vitals = await this.prisma.vitalSign.findMany({
        where: {
          patientId: patientId,
          type: VitalType.HEART_RATE,
          timestamp: { gte: last14Days },
          // Opcional: focar a predição apenas em estados estáveis (Repouso/Sono)
          // para evitar ruído de exercícios físicos
          activityPattern: {
            slug: { in: ['repouso', 'dormindo'] } 
          }
        },
        include: { activityPattern: true },
        orderBy: { timestamp: 'asc' },
      });

      if (vitals.length < 10) {
        this.logger.warn(`Dados insuficientes (contexto estável) para predição em ${patientId}`);
        return null;
      }

      // 2️⃣ Separar janelas de tempo
      const week1 = vitals.filter((v) => v.timestamp < last7Days);
      const week2 = vitals.filter((v) => v.timestamp >= last7Days);

      // Calculamos as médias contextuais
      const avgWeek1 = this.average(week1);
      const avgWeek2 = this.average(week2);

      const trend = avgWeek2 - avgWeek1;

      // 3️⃣ Cálculo de score de risco com base no novo Schema
      let score = 0;
      let reason = '';

      // Se a média subiu mais de 8 BPM em estado de repouso, é um alerta
      if (trend > 8) {
        score += 0.6;
        reason += `Aumento na linha de base em repouso (+${trend.toFixed(1)} BPM). `;
      }

      // Se a média em repouso está acima de 90, algo está errado (estresse crônico ou clínico)
      if (avgWeek2 > 90) {
        score += 0.4;
        reason += `Frequência cardíaca basal elevada (${avgWeek2.toFixed(1)} BPM). `;
      }

      // 4️⃣ Verificação de anomalias de oxigênio (Opcional, mas recomendado)
      const lowOxygenCount = await this.prisma.vitalSign.count({
        where: {
          patientId,
          type: VitalType.OXYGEN_SATURATION,
          value: { lt: 92 }, // Saturação abaixo de 92%
          timestamp: { gte: last7Days }
        }
      });

      if (lowOxygenCount > 5) {
        score += 0.5;
        reason += `Detectados ${lowOxygenCount} episódios de saturação baixa na semana. `;
      }

      if (score === 0) {
        reason = 'Padrão estável em repouso e níveis de oxigênio normais.';
      }

      // 5️⃣ Classificação
      let riskLevel: RiskLevel = RiskLevel.LOW;
      if (score >= 0.8) riskLevel = RiskLevel.HIGH;
      else if (score >= 0.4) riskLevel = RiskLevel.MODERATE;

      // 6️⃣ Persistir predição
      const prediction = await this.prisma.healthPrediction.create({
        data: {
          patientId: patientId,
          riskLevel: riskLevel,
          score: Math.min(score, 1.0), // Garante que o score não passe de 1.0
          reason: reason,
        },
      });

      this.logger.log(`📊 Predição Contextualizada: ${patientId} -> ${riskLevel} (Score: ${score})`);

      return prediction;
    } catch (error) {
      this.logger.error(`Erro ao gerar predição para ${patientId}:`, error);
      return null;
    }
  }

  private average(data: any[]) {
    if (data.length === 0) return 0;
    return data.reduce((sum, v) => sum + v.value, 0) / data.length;
  }
}