import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class ReportsEmailService {
  private readonly logger = new Logger(ReportsEmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const host = process.env.SMTP_HOST;

    this.transporter = nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, 
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false 
      },
      // ADICIONADO: Timeout para evitar que a requisição fique "pendurada"
      connectionTimeout: 10000, // 10 segundos
    });
  }

  /**
   * Verifica se o transporte está pronto na inicialização
   */
  async onModuleInit() {
    try {
      await this.transporter.verify();
      this.logger.log('✅ Conexão com servidor de e-mail validada.');
    } catch (error) {
      this.logger.error('❌ Falha ao validar configuração de e-mail (SMTP):', error.message);
    }
  }

  async sendReportWithAttachment(to: string, patientName: string, pdfBuffer: Buffer) {
    this.logger.log(`🚀 Enviando relatório para: [${to}]`);

    if (!to || !to.includes('@')) {
      this.logger.error(`❌ E-mail inválido: "${to}"`);
      throw new Error('E-mail de destino inválido');
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.MAIL_FROM || `"Health Monitor" <${process.env.SMTP_USER}>`,
        to: to,
        subject: `📄 Relatório de Saúde - ${patientName}`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #2c3e50;">Relatório de Saúde Gerado</h2>
            <p>Olá,</p>
            <p>O relatório de sinais vitais e histórico de <strong>${patientName}</strong> foi gerado com sucesso e está disponível em anexo.</p>
            <hr style="border: 0; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #7f8c8d;">Este é um e-mail automático enviado pelo sistema <strong>HealthMonitor</strong>.</p>
          </div>
        `,
        attachments: [
          {
            filename: `Relatorio_${patientName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      this.logger.log(`✅ E-mail enviado com sucesso! MessageId: ${info.messageId}`);
      return info;

    } catch (error) {
      this.logger.error(`❌ Erro no envio do e-mail: ${error.message}`);
      throw error;
    }
  }
}