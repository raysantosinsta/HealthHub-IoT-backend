import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReportsEmailService } from 'src/reports-email/reports-email.service';
import  { PdfService } from 'src/reports-pdf/reports-pdf.service';

@Injectable()
export class WeeklyReportService {
  private readonly logger = new Logger(WeeklyReportService.name);

  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
    private emailService: ReportsEmailService,
  ) {}

  // Roda toda Segunda-feira às 08:00 da manhã
@Cron('0 0 8 * * 1') // ✅ Segunda-feira às 08:00:00
  async generateAndSendReports() {
    this.logger.log('📅 Iniciando geração de relatórios semanais...');

    const patients = await this.prisma.patient.findMany({ 
      where: { active: true },
      include: { company: true } // Para saber quem notificar (admin da empresa?)
    });

    for (const patient of patients) {
      await this.processPatientReport(patient);
    }
  }

  private async processPatientReport(patient: any) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Busca dados da última semana
    const vitals = await this.prisma.vitalSign.findMany({
      where: {
        patientId: patient.id,
        type: 'HEART_RATE',
        timestamp: { gte: sevenDaysAgo }
      }
    });

    if (vitals.length === 0) return;

    // 2. Lógica de "Sono" (Dados entre 00h e 06h)
    const sleepData = vitals.filter(v => {
      const h = v.timestamp.getHours();
      return h >= 0 && h < 6;
    });
    
    const avgSleepBpm = sleepData.length > 0 
      ? sleepData.reduce((acc, v) => acc + v.value, 0) / sleepData.length
      : 0;

    // 3. Lógica de "Estresse" (Picos > 100 durante o dia)
    const stressData = vitals.filter(v => v.value > 100);
    const maxBpm = vitals.reduce((max, v) => v.value > max ? v.value : max, 0);

    // 4. Monta objeto de estatísticas
    const stats = {
      avgSleepBpm,
      stressCount: stressData.length,
      maxBpm,
      totalReadings: vitals.length
    };

    // 5. Gera PDF e Envia
    const pdfBuffer = await this.pdfService.generateWeeklyReport(patient.name, stats);
    
    // Aqui estamos mandando para um e-mail fixo de teste, 
    // mas você pode usar patient.company.email ou um campo patient.contactEmail
    const emailDestino = 'highlanderiniesta@gmail.com'; 
    
    await this.emailService.sendReportWithAttachment(emailDestino, patient.name, pdfBuffer);
  }
}