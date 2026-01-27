import { Injectable } from '@nestjs/common';
// Manter o require para evitar o erro de construtor do pdfkit
const PDFDocument = require('pdfkit');

@Injectable()
export class PdfService {

  async generateWeeklyReport(patientName: string, stats: any): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // --- 1. CABEÇALHO PROFISSIONAL ---
      doc.fontSize(22).fillColor('#2c3e50').text('Relatório de Saúde Digital', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('grey').text('Análise baseada em Padrões de Atividade', { align: 'center' });
      doc.moveDown();
      
      doc.rect(50, doc.y, 500, 40).fill('#f9f9f9');
      doc.fillColor('#000').fontSize(12).text(`Paciente: ${patientName}`, 60, doc.y - 30);
      doc.text(`Período: Últimos 7 dias | Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 60, doc.y - 15);
      doc.moveDown(2);

      // --- 2. SEÇÃO: ANÁLISE POR CONTEXTO (NOVO!) ---
      doc.fillColor('#2c3e50').fontSize(16).text('1. Resumo por Atividade', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(12).fillColor('#000');
      
      // Agora usamos as médias vindas do banco filtradas por atividade
      doc.text(`🌙 Média em Repouso/Sono: ${stats.avgRestingBpm?.toFixed(0) || '--'} BPM`);
      doc.text(`🚶 Média em Atividade: ${stats.avgActiveBpm?.toFixed(0) || '--'} BPM`);
      doc.text(`🩸 Saturação Média (SpO2): ${stats.avgSpo2?.toFixed(0) || '--'}%`);
      doc.moveDown();

      // --- 3. SEÇÃO: ALERTAS CLÍNICOS ---
      doc.fontSize(16).text('2. Alertas e Anomalias', { underline: true });
      doc.moveDown(0.5);

      if (stats.criticalAlertsCount > 0) {
        doc.fillColor('#e74c3c').text(`⚠ Foram detectados ${stats.criticalAlertsCount} alertas críticos nesta semana.`);
        doc.fontSize(10).text('Estes alertas incluem Taquicardia, Bradicardia ou Hipóxia fora dos limites personalizados.');
      } else {
        doc.fillColor('#27ae60').text('✓ Nenhum alerta crítico disparado no período.');
      }
      doc.moveDown(2);

      // --- 4. SEÇÃO: INSIGHTS DA IA ---
      doc.fillColor('#2c3e50').fontSize(16).text('3. Parecer da Inteligência Artificial', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(12).fillColor('#34495e').italic();
      doc.text(`" ${stats.lastAiReason || 'Dados insuficientes para análise preditiva no momento.'} "`);
      doc.moveDown();
      
      const riskColor = stats.riskLevel === 'HIGH' ? '#e74c3c' : stats.riskLevel === 'MODERATE' ? '#f39c12' : '#27ae60';
      doc.fillColor(riskColor).bold().text(`Nível de Risco Estimado: ${stats.riskLevel || 'BAIXO'}`);
      doc.moveDown(2);

      // --- 5. RODAPÉ ---
      doc.fillColor('black').fontSize(10).italic(false);
      doc.moveTo(50, 700).lineTo(550, 700).stroke();
      doc.text('Este documento é um suporte à decisão clínica e não substitui o diagnóstico médico.', 50, 715, { align: 'center' });
      doc.fontSize(8).text('Plataforma HealthMonitor SaaS - Tecnologia Assistiva', { align: 'center' });

      doc.end();
    });
  }
}