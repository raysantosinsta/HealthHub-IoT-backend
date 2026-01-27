import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private prisma: PrismaService) {
    // Recomendo usar process.env.GEMINI_API_KEY
    this.genAI = new GoogleGenerativeAI('AIzaSyBQE_HsqnN6-q9dBRV66zyABmGKiji4uAU');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async getClinicalAnalysis(patientId: string) {
    try {
      // 1. Busca profunda baseada no seu novo Schema
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          currentActivity: true, // Padrão de atividade atual (ex: Repouso)
          customThresholds: {
            include: { activityPattern: true }, // Todos os limites configurados
          },
          vitals: {
            take: 25,
            orderBy: { timestamp: 'desc' },
            include: { activityPattern: true }, // Contexto de cada sinal gravado
          },
          predictions: {
            take: 1,
            orderBy: { generatedAt: 'desc' },
          },
        },
      });

      if (!patient) throw new Error('Paciente não encontrado');

      // Calcular idade
      const age = new Date().getFullYear() - new Date(patient.birthDate).getFullYear();

      // Identificar o limite específico para a atividade que ele está fazendo AGORA
      const currentThreshold = patient.customThresholds.find(
        (t) => t.activityPatternId === patient.currentActivityId
      );

      // Formatar limites para o prompt
      const thresholdContext = currentThreshold
        ? `LIMITES PARA ${patient.currentActivity?.name}: BPM entre ${currentThreshold.bpmMin}-${currentThreshold.bpmMax} e SpO2 mín de ${currentThreshold.spo2Min}%`
        : `LIMITES: Não há limites específicos para a atividade '${patient.currentActivity?.name || 'Desconhecida'}'. Use padrões clínicos geriátricos.`;

      // Formatar vitais com o contexto da atividade no momento da leitura
      const vitalsText = patient.vitals
        .map(v => {
          const time = new Date(v.timestamp).toLocaleString('pt-BR');
          return `- ${time}: ${v.type} = ${v.value}${v.unit} (Atividade: ${v.activityPattern?.name || 'N/A'})`;
        })
        .join('\n');

      const lastPrediction = patient.predictions[0];
      const riskContext = lastPrediction 
        ? `Predição IA de Risco: ${lastPrediction.riskLevel} (Score: ${lastPrediction.score}). Motivo: ${lastPrediction.reason}`
        : 'Sem predições de risco calculadas.';

      // 2. Prompt com foco no Schema de Atividades
      const prompt = `
        ATUE COMO: Especialista em Geriatria e Telemonitoramento.
        
        PACIENTE: ${patient.name}
        IDADE: ${age} anos
        ESTADO ATUAL NO APP: ${patient.currentActivity?.name || 'Não selecionado'}
        
        ${thresholdContext}
        
        CONTEXTO DE RISCO:
        ${riskContext}
        
        HISTÓRICO RECENTE (Últimas 25 leituras):
        ${vitalsText}
        
        INSTRUÇÕES DE ANÁLISE:
        1. Verifique se os vitais são coerentes com a atividade (ex: FC alta enquanto dorme é sinal de alerta).
        2. Analise tendências de queda na SpO2 (mesmo dentro do limite, quedas graduais importam).
        3. Como o paciente tem ${age} anos, considere riscos de desidratação, infecção urinária silenciosa (taquicardia súbita) ou dor.
        
        RETORNE APENAS JSON:
        {
          "status_resumo": "Estável/Atenção/Crítico",
          "analise_detalhada": "Explicação clínica baseada nos dados e atividade...",
          "recomendacao_enfermagem": "Ação prática...",
          "alerta_geriatrico": "Ponto focal para idosos..."
        }
      `;

      // 3. Execução
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);

    } catch (error) {
      this.logger.error(`Erro na análise IA: ${error.message}`);
      return {
        status_resumo: "Erro",
        analise_detalhada: "Não foi possível processar a análise clínica devido a um erro técnico.",
        recomendacao_enfermagem: "Verifique o dashboard de vitais manualmente.",
        alerta_geriatrico: "Erro de conexão com o motor de inteligência."
      };
    }
  }
}