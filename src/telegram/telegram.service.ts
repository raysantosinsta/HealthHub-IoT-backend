import { Injectable, Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramService {
  private bot: Telegraf;
  private readonly logger = new Logger(TelegramService.name);

  constructor() {
    // 1. SEMPRE use variáveis de ambiente. Expor tokens no código é um risco de segurança.
    const token = process.env.TELEGRAM_BOT_TOKEN || '8571038162:AAGkjF7x09XTl5visUH_QKlirANt-JHoh2Q';
    this.bot = new Telegraf(token);
  }

  /**
   * Envia uma mensagem para um chat específico.
   * Agora aceita um chatId opcional, permitindo enviar alertas para diferentes grupos.
   */
  async sendMessage(text: string, specificChatId?: string) {
    try {
      // 2. Fallback: Se não vier um ID específico, usa o seu ID padrão (para testes ou admin)
      const targetChat = specificChatId || '8434476278'; 
      
      // 3. Adicionamos parse_mode para permitir negrito e emojis formatados
      await this.bot.telegram.sendMessage(targetChat, text, {
        parse_mode: 'Markdown',
      });
      
      this.logger.log(`📢 Notificação Telegram enviada para ${targetChat}`);
    } catch (error) {
      this.logger.error('❌ Falha ao enviar mensagem no Telegram', error.message);
    }
  }

  /**
   * Método útil para enviar alertas críticos formatados
   */
  async sendCriticalAlert(patientName: string, detail: string, activity: string) {
    const message = 
      `🚨 *ALERTA CRÍTICO* 🚨\n\n` +
      `👤 *Paciente:* ${patientName}\n` +
      `🏃 *Atividade:* ${activity}\n` +
      `⚠️ *Detalhe:* ${detail}\n\n` +
      `📅 _Verifique o painel de monitoramento imediatamente._`;
    
    return this.sendMessage(message);
  }
}