import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { subDays } from 'date-fns'; // Dica: instale date-fns para facilitar datas

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private prisma: PrismaService) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash', // Flash é mais resiliente para análise de dados
      generationConfig: { responseMimeType: "application/json" }
    });
  }

  async getPatientGuidance(patientId: string, onlyContext: boolean = false) {
    try {
      const sevenDaysAgo = subDays(new Date(), 7);

      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          currentActivity: true, 
          customThresholds: true,
          vitals: { 
            take: 50, // Pegamos uma amostra maior para média histórica
            orderBy: { timestamp: 'desc' } 
          },
        },
      });

      if (!patient) throw new Error('Paciente não encontrado');

      const lastVital = patient.vitals[0];
      const historicalVitals = patient.vitals.filter(v => v.timestamp >= sevenDaysAgo);
      
      // Cálculo de média simples dos últimos 7 dias
      const avgBpm7Days = historicalVitals.length > 0 
        ? Math.round(historicalVitals.reduce((acc, curr) => acc + curr.value, 0) / historicalVitals.length)
        : null;

      const currentActivity = patient.currentActivity?.name || 'Não informado';
      const threshold = patient.customThresholds.find(t => t.activityPatternId === patient.currentActivityId);
      const limitsInfo = threshold ? `BPM ${threshold.bpmMin}-${threshold.bpmMax}` : 'Padrão 60-100';

      const context = {
        lastVital: lastVital?.value || 0,
        avgBpm7Days: avgBpm7Days,
        activity: currentActivity,
        limits: limitsInfo
      };

      if (onlyContext) return { context };

      // PROMPT HÍBRIDO: Tempo Real + 7 Dias
      const prompt = `
        Analise a saúde do paciente:
        - Agora: ${context.lastVital} BPM (${currentActivity})
        - Média 7 dias: ${context.avgBpm7Days || 'Sem dados'} BPM
        - Limites: ${limitsInfo}
        
        Compare o valor atual com a média histórica dele. 
        Se o valor atual for muito diferente da média de 7 dias (mesmo dentro do limite), mencione isso.
        Responda em JSON: { "status": "NORMAL"|"ATENCAO"|"ALERTA", "message": "...", "action": "..." }
      `;

      try {
        const result = await this.model.generateContent(prompt);
        const aiData = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
        return { ...aiData, context };
      } catch (aiError) {
        this.logger.warn("IA falhou, usando análise histórica local.");
        return this.analyzeLocallyWithHistory(context, threshold);
      }

    } catch (error) {
      this.logger.error(`Erro crítico: ${error.message}`);
      return { status: "ERRO", message: "Sistema indisponível", action: "Checagem manual", context: null };
    }
  }

  // Fallback que usa a média de 7 dias se a IA falhar
  private analyzeLocallyWithHistory(context: any, threshold: any) {
    const val = context.lastVital;
    const avg = context.avgBpm7Days;
    
    // Se o valor atual está 20% acima da média dele de 7 dias
    const isAbnormalToHistory = avg && (val > avg * 1.2);

    if (threshold && val > threshold.bpmMax) {
      return {
        status: "ALERTA",
        message: `Batimento de ${val} BPM está acima do seu limite e da sua média semanal de ${avg} BPM.`,
        action: "Repouse imediatamente."
      };
    }

    if (isAbnormalToHistory) {
      return {
        status: "ATENCAO",
        message: `Seus batimentos estão ${val} BPM, o que é consideravelmente maior que sua média semanal (${avg} BPM).`,
        action: "Verifique se você tomou café ou está sob estresse."
      };
    }

    return {
      status: "NORMAL",
      message: "Seus sinais estão consistentes com seu histórico da semana.",
      action: "Continue com suas atividades."
    };
  }
}