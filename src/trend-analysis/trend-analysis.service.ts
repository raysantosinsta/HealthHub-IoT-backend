import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { TelegramService } from 'src/telegram/telegram.service';

@Injectable()
export class TrendAnalysisService {
  private readonly logger = new Logger(TrendAnalysisService.name);

  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  // // Roda todos os dias às 08:00 da manhã
  // @Cron(CronExpression.EVERY_DAY_AT_8AM)
  // async analyzeOxygenTrends() {
  //   this.logger.log('📉 Iniciando análise de tendências de saúde...');

  //   // 1. Pega todos os pacientes ativos
  //   const patients = await this.prisma.patient.findMany({ where: { active: true } });

  //   for (const patient of patients) {
  //     await this.checkPatientTrend(patient);
  //   }
  // }

  // private async checkPatientTrend(patient: any) {
  //   const now = new Date();
    
  //   // Definindo janelas de tempo (Hoje, Ontem, Anteontem)
  //   const day1Start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Últimas 24h
  //   const day2Start = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 24h-48h atrás
  //   const day3Start = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 48h-72h atrás

  //   // Consultas agregadas ao Banco (Muito rápido, o banco que calcula)
  //   const avgDay1 = await this.getAverageSpo2(patient.id, day1Start, now);
  //   const avgDay2 = await this.getAverageSpo2(patient.id, day2Start, day1Start);
  //   const avgDay3 = await this.getAverageSpo2(patient.id, day3Start, day2Start);

  //   // Se não tiver dados suficientes nos 3 dias, aborta
  //   if (!avgDay1 || !avgDay2 || !avgDay3) return;

  //   // --- A LÓGICA DE OURO: DETECÇÃO DE DECLÍNIO ---
    
  //   // Regra: Caiu do dia 3 pro 2 E caiu do dia 2 pro 1?
  //   const isDeclining = avgDay2 < avgDay3 && avgDay1 < avgDay2;
    
  //   // Cálculo da queda total
  //   const totalDrop = avgDay3 - avgDay1;

  //   // Gatilho: Se está caindo consistentemente E a queda total é maior que 3%
  //   // Exemplo: Estava em 98%, foi pra 96%, agora está em 94% (Queda de 4%)
  //   if (isDeclining && totalDrop >= 3) {
  //     const msg = `📉 ALERTA DE TENDÊNCIA: A saturação do paciente ${patient.name} está caindo progressivamente.\n\n` +
  //                 `- 3 dias atrás: ${avgDay3.toFixed(1)}%\n` +
  //                 `- Ontem: ${avgDay2.toFixed(1)}%\n` +
  //                 `- Hoje (média): ${avgDay1.toFixed(1)}%\n\n` +
  //                 `⚠️ Queda total de ${totalDrop.toFixed(1)}%. Risco de infecção ou problema respiratório silencioso.`;
      
  //     await this.telegram.sendMessage(msg);
  //     this.logger.warn(`Tendência de queda detectada para ${patient.name}`);
  //   }
  // }

  // MUDANÇA 1: Rodar a cada 10 segundos para você ver o log rápido
  @Cron(CronExpression.EVERY_10_SECONDS)
  async analyzeOxygenTrends() {
    this.logger.log('🧪 MODO TESTE: Analisando tendências por MINUTO...');
    const patients = await this.prisma.patient.findMany({ where: { active: true } });

    for (const patient of patients) {
      await this.checkPatientTrend(patient);
    }
  }

  private async checkPatientTrend(patient: any) {
    const now = new Date();
    
    // MUDANÇA 2: Janelas de 1 Minuto (em vez de 24h)
    const ONE_MINUTE = 60 * 1000;

    // Janela 1: Do "agora" até 1 min atrás
    const period1Start = new Date(now.getTime() - ONE_MINUTE); 
    
    // Janela 2: De 1 min atrás até 2 min atrás
    const period2Start = new Date(now.getTime() - ONE_MINUTE * 2); 
    
    // Janela 3: De 2 min atrás até 3 min atrás
    const period3Start = new Date(now.getTime() - ONE_MINUTE * 3); 

    // Consultas (Lógica permanece a mesma, só mudou a data)
    const avgRecent = await this.getAverageSpo2(patient.id, period1Start, now);         // Último minuto
    const avgMid    = await this.getAverageSpo2(patient.id, period2Start, period1Start); // Penúltimo minuto
    const avgOld    = await this.getAverageSpo2(patient.id, period3Start, period2Start); // Antepenúltimo minuto

    this.logger.debug(`Paciente ${patient.name} - Médias: ${avgOld?.toFixed(1)} -> ${avgMid?.toFixed(1)} -> ${avgRecent?.toFixed(1)}`);

    if (!avgRecent || !avgMid || !avgOld) return;

    // Regra: Caindo consecutivamente
    const isDeclining = avgMid < avgOld && avgRecent < avgMid;
    const totalDrop = avgOld - avgRecent;

    // Reduzi a tolerância de queda para 1% para facilitar o teste
    if (isDeclining && totalDrop >= 1) {
      const msg = `🧪 TESTE DE TENDÊNCIA: Queda rápida detectada!\n\n` +
                  `- 3 min atrás: ${avgOld.toFixed(1)}%\n` +
                  `- 2 min atrás: ${avgMid.toFixed(1)}%\n` +
                  `- Último min: ${avgRecent.toFixed(1)}%\n\n` +
                  `⚠️ Queda total de ${totalDrop.toFixed(1)}%.`;
      
      await this.telegram.sendMessage(msg);
      this.logger.warn(`Tendência de queda detectada para ${patient.name}`);
    }
  }

  // Função auxiliar para pegar média no Prisma
  private async getAverageSpo2(patientId: string, start: Date, end: Date): Promise<number | null> {
    const result = await this.prisma.vitalSign.aggregate({
      _avg: {
        value: true,
      },
      where: {
        patientId: patientId,
        type: 'OXYGEN_SATURATION',
        timestamp: {
          gte: start,
          lt: end,
        },
      },
    });

    return result._avg.value;
  }
}