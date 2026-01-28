import { Injectable } from '@nestjs/common';
const PDFDocument = require('pdfkit');
// const { Table } = require('pdfkit-table'); // Instale: npm install pdfkit-table

@Injectable()
export class PdfService {
  async generateWeeklyReport(
    patientName: string,
    stats: any,
    companyName?: string,
    reportDate: Date = new Date(),
  ): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        layout: 'portrait',
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Cores institucionais (ajuste conforme sua marca)
      const primaryColor = '#0ea5e9';     // Azul ciano moderno
      const secondaryColor = '#1e293b';   // Cinza escuro elegante
      const accentColor = '#10b981';      // Verde sucesso
      const warningColor = '#f59e0b';
      const dangerColor = '#ef4444';
      const bgLight = '#f8fafc';

      // Fonte padrão
      doc.font('Helvetica');
      doc.fontSize(10);

      // =============================================
      // CABEÇALHO PREMIUM
      // =============================================
      doc.fillColor(secondaryColor).fontSize(24).text('HealthMonitor', 50, 40, { continued: true });
      doc.fillColor(primaryColor).fontSize(24).text(' Relatório Semanal', { continued: false });

      doc.fontSize(10).fillColor('gray').text(
        `Emitido em ${reportDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        50,
        70,
      );

      doc.moveTo(50, 90).lineTo(545, 90).lineWidth(1).strokeColor(primaryColor).stroke();

      // Dados do paciente
      doc.fontSize(12).fillColor(secondaryColor).text('Paciente:', 50, 110);
      doc.font('Helvetica-Bold').text(patientName, 120, 110);

      if (companyName) {
        doc.font('Helvetica').text('Empresa:', 50, 130);
        doc.font('Helvetica-Bold').text(companyName, 120, 130);
      }

      doc.moveDown(2);

      // =============================================
      // RESUMO GERAL (CARD)
      // =============================================
      doc.rect(45, doc.y, 500, 90).fill(bgLight).strokeColor(primaryColor).lineWidth(1).stroke();

      doc.fillColor(secondaryColor).fontSize(14).text('Resumo da Semana', 60, doc.y + 15);
      doc.moveDown(0.5);

      doc.fontSize(11).text(`Período: ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')} a ${new Date().toLocaleDateString('pt-BR')}`);

      doc.moveDown(1);

      const riskColor = 
        stats.riskLevel === 'HIGH' ? dangerColor :
        stats.riskLevel === 'MODERATE' ? warningColor : accentColor;

      doc.fillColor(riskColor).fontSize(12).text(`Nível de Risco IA: ${stats.riskLevel}`, 60, doc.y, { continued: true });
      doc.fillColor(secondaryColor).text(`  (${stats.lastAiReason?.substring(0, 80)}...)`);

      doc.moveDown(2);

      // =============================================
      // MÉTRICAS EM CARDS
      // =============================================
      const cardWidth = 150;
      const cardHeight = 80;
      const startX = 50;
      const startY = doc.y;

      // Card 1 - Repouso
      doc.rect(startX, startY, cardWidth, cardHeight).fill(bgLight).strokeColor(primaryColor).stroke();
      doc.fillColor(secondaryColor).fontSize(12).text('Repouso / Sono', startX + 10, startY + 15);
      doc.fontSize(22).fillColor(primaryColor).text(`${stats.avgRestingBpm?.toFixed(0) || '--'} BPM`, startX + 10, startY + 40);

      // Card 2 - Atividade
      doc.rect(startX + cardWidth + 25, startY, cardWidth, cardHeight).fill(bgLight).strokeColor(primaryColor).stroke();
      doc.fillColor(secondaryColor).fontSize(12).text('Atividade', startX + cardWidth + 35, startY + 15);
      doc.fontSize(22).fillColor(primaryColor).text(`${stats.avgActiveBpm?.toFixed(0) || '--'} BPM`, startX + cardWidth + 35, startY + 40);

      // Card 3 - SpO2
      doc.rect(startX + (cardWidth + 25) * 2, startY, cardWidth, cardHeight).fill(bgLight).strokeColor(primaryColor).stroke();
      doc.fillColor(secondaryColor).fontSize(12).text('Saturação O₂', startX + (cardWidth + 25) * 2 + 10, startY + 15);
      doc.fontSize(22).fillColor(primaryColor).text(`${stats.avgSpo2?.toFixed(1) || '--'}%`, startX + (cardWidth + 25) * 2 + 10, startY + 40);

      doc.moveDown(6);

      // =============================================
      // ALERTAS E EVENTOS
      // =============================================
      doc.fillColor(secondaryColor).fontSize(16).text('Alertas Clínicos da Semana');
      doc.moveDown(0.5);
      doc.rect(45, doc.y, 500, 60).fill(bgLight).stroke();

      if (stats.criticalAlertsCount > 0) {
        doc.fillColor(dangerColor).fontSize(14).text(`⚠ ${stats.criticalAlertsCount} alertas críticos detectados`, 60, doc.y + 20);
        doc.fontSize(11).text('Inclui: taquicardia, bradicardia, hipóxia ou quedas.', 60, doc.y + 35);
      } else {
        doc.fillColor(accentColor).fontSize(14).text('✓ Nenhum alerta crítico registrado.', 60, doc.y + 20);
      }

      doc.moveDown(4);

      // =============================================
      // PARECER DA IA
      // =============================================
      doc.fillColor(secondaryColor).fontSize(16).text('Parecer da Inteligência Artificial');
      doc.moveDown(0.5);

      doc.rect(45, doc.y, 500, 100).fill(bgLight).strokeColor(riskColor).lineWidth(2).stroke();

      doc.fillColor(secondaryColor).fontSize(12).text(
        stats.lastAiReason || 'Nenhum insight gerado. Dados insuficientes para análise preditiva.',
        60,
        doc.y + 20,
        { width: 480, align: 'justify' }
      );

      doc.moveDown(2);
      doc.fillColor(riskColor).font('Helvetica-Bold').fontSize(14).text(`Nível de Risco Estimado: ${stats.riskLevel}`, 60, doc.y);

      doc.moveDown(4);

      // =============================================
      // RODAPÉ PROFISSIONAL
      // =============================================
      const pageCount = doc.bufferedPageRange().count;
      doc.switchToPage(pageCount - 1);

      doc.fontSize(9).fillColor('gray').text(
        'Este relatório é confidencial e destinado exclusivamente ao paciente e equipe médica responsável.',
        50,
        750,
        { align: 'center' }
      );
      doc.text(
        'HealthMonitor SaaS – Tecnologia Assistiva | www.healthmonitor.com.br',
        50,
        765,
        { align: 'center' }
      );

      doc.end();
    });
  }
}