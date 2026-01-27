import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PredictionService } from 'src/prediction/prediction.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PredictionScheduler {
  private readonly logger = new Logger(PredictionScheduler.name);

  constructor(
    private prisma: PrismaService,
    private predictionService: PredictionService,
  ) {}

  /**
   * Executa a análise preditiva para todos os pacientes ativos.
   * Agendado para as 02h da manhã (horário de baixo tráfego).
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyPredictions() {
    this.logger.log('🔮 Iniciando rotina de análise preditiva contextual...');

    try {
      // 1. Buscamos apenas pacientes ativos que tiveram sinais vitais 
      // registrados nas últimas 24 horas (evita processar quem está com sensor desligado)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const patients = await this.prisma.patient.findMany({
        where: { 
          active: true,
          vitals: {
            some: {
              timestamp: { gte: yesterday }
            }
          }
        },
        select: { id: true, name: true },
      });

      if (patients.length === 0) {
        this.logger.log('ℹ️ Nenhum paciente ativo com dados recentes para analisar.');
        return;
      }

      this.logger.log(`📊 Processando predições para ${patients.length} pacientes...`);

      let successCount = 0;
      let errorCount = 0;

      // 2. Processamento sequencial com "throttling" (pausa) para não fritar o CPU/Banco
      for (const patient of patients) {
        try {
          const prediction = await this.predictionService.generatePrediction(patient.id);
          
          if (prediction) {
            successCount++;
          }
          
          // Pausa de 150ms para controle de concorrência no banco
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (error) {
          errorCount++;
          this.logger.error(`❌ Erro no paciente ${patient.name} (${patient.id}): ${error.message}`);
        }
      }

      this.logger.log(`✅ Ciclo concluído. Sucesso: ${successCount} | Falhas: ${errorCount}`);
      
    } catch (error) {
      this.logger.error('❌ Falha crítica no Scheduler de Predições:', error.message);
    }
  }
}