/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class ReportsEmailService {
  private readonly logger = new Logger(ReportsEmailService.name);
  
  // Usando EXATAMENTE a mesma configuração que funciona no seu MailService
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async sendReportWithAttachment(to: string, patientName: string, pdfBuffer: Buffer) {
    try {
      this.logger.log(`Tentando enviar e-mail para ${to}...`);

      const info = await this.transporter.sendMail({
        from: process.env.MAIL_FROM || '"Health Monitor" <noreply@saas.com>',
        to: to,
        subject: `📄 Relatório de Saúde Semanal - ${patientName}`,
        // HTML Profissional similar ao seu de reset de senha
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F5F7FA; }
            .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background-color: #4A90E2; padding: 20px; text-align: center; color: white; }
            .content { padding: 30px; color: #333; line-height: 1.6; }
            .footer { background-color: #f0f2f5; padding: 15px; text-align: center; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <br>
          <div class="container">
            <div class="header">
               <h1>Relatório Médico</h1>
            </div>
            <div class="content">
              <p>Olá,</p>
              <p>Segue em anexo o relatório semanal detalhado dos sinais vitais do paciente <strong>${patientName}</strong>.</p>
              <p>Este relatório contém:</p>
              <ul>
                <li>Média de Batimentos Cardíacos</li>
                <li>Qualidade do Sono</li>
                <li>Momentos de Estresse</li>
                <li>Saturação de Oxigênio</li>
              </ul>
              <p>Por favor, analise os dados em anexo.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Health Monitor SaaS. Monitoramento Inteligente.</p>
            </div>
          </div>
          <br>
        </body>
        </html>
        `,
        attachments: [
          {
            filename: `Relatorio_${patientName.replace(/\s/g, '_')}_${Date.now()}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      this.logger.log(`✅ E-mail enviado com sucesso! MessageID: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`❌ ERRO AO ENVIAR E-MAIL: ${error.message}`, error.stack);
      // Logar as credenciais mascaradas para debug (sem mostrar a senha real)
      this.logger.error(`Config usada: User=${process.env.SMTP_USER}, Host=${process.env.SMTP_HOST}`);
      throw error;
    }
  }
}