import { Injectable } from '@nestjs/common';
// O segredo para corrigir o erro "not a constructor" é usar o require aqui:
const PDFDocument = require('pdfkit');

@Injectable()
export class PdfService {

  async generateWeeklyReport(patientName: string, stats: any): Promise<Buffer> {
    return new Promise((resolve) => {
      // Criação do documento
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      // Coleta os chunks de dados do PDF na memória
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      // --- 1. CABEÇALHO ---
      doc.fontSize(20).text('Relatório Semanal de Saúde', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Paciente: ${patientName}`);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`);
      doc.moveDown(2);

      // --- 2. SEÇÃO: QUALIDADE DO SONO ---
      doc.fontSize(16).text('1. Qualidade do Sono (00h - 06h)', { underline: true });
      doc.moveDown(0.5);
      
      const sleepStatus = stats.avgSleepBpm < 60 ? 'Excelente (Repouso Profundo)' : 
                          stats.avgSleepBpm < 75 ? 'Normal' : 'Agitado (Atenção)';
      
      doc.fontSize(12).text(`BPM Médio Noturno: ${stats.avgSleepBpm.toFixed(0)} bpm`);
      doc.text(`Classificação: ${sleepStatus}`);
      doc.moveDown();
      
      doc.fontSize(10).fillColor('grey')
         .text('Baseado na frequência cardíaca de repouso durante a madrugada.');
      doc.fillColor('black').moveDown(2);

      // --- 3. SEÇÃO: MOMENTOS DE ESTRESSE ---
      doc.fontSize(16).text('2. Momentos de Estresse/Esforço', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(12).text(`Picos acima de 100 BPM detectados: ${stats.stressCount} vezes`);
      doc.text(`Maior frequência registrada: ${stats.maxBpm} bpm`);
      
      if (stats.stressCount > 5) {
        doc.fillColor('red').text('⚠ Alerta: Alta frequência de picos cardíacos observada esta semana.');
        doc.fillColor('black');
      } else {
        doc.fillColor('green').text('✓ Frequência cardíaca estável durante o dia.');
        doc.fillColor('black');
      }
      doc.moveDown(2);

      // --- 4. RODAPÉ ---
      doc.moveTo(50, 700).lineTo(550, 700).stroke();
      doc.fontSize(10).text('Este é um relatório automático gerado pelo HealthMonitor SaaS.', 50, 710, { align: 'center' });

      // Finaliza o documento
      doc.end();
    });
  }
}