import { Injectable, Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramService {
  private bot: Telegraf;
  private readonly logger = new Logger(TelegramService.name);

  constructor() {
    // Certifique-se de que a variável está no seu arquivo .env
    const token = '8571038162:AAGkjF7x09XTl5visUH_QKlirANt-JHoh2Q';
    if (!token) {
      this.logger.error('TELEGRAM_BOT_TOKEN não encontrado no arquivo .env');
    }
    this.bot = new Telegraf(token);
  }

  async sendMessage(text: string) {
    try {
      // Remova o '#' e garanta que o ID está correto
      // Dica: use o bot @userinfobot no Telegram para descobrir seu ID real
      const chatId = '8434476278'; 
      
      await this.bot.telegram.sendMessage(chatId, text);
      this.logger.log(`Notificação enviada via Telegram: ${text}`);
    } catch (error) {
      this.logger.error('Falha ao enviar mensagem no Telegram', error);
    }
  }
}