import { Module } from '@nestjs/common';

// 1. Importe os Módulos necessários
import { PrismaModule } from '../prisma/prisma.module'; 
import { ReportsPdfModule } from '../reports-pdf/reports-pdf.module';
import { ReportsEmailModule } from '../reports-email/reports-email.module';
import { WeeklyReportService } from './reports-weekly-report.service';

@Module({
  imports: [
    // 2. Adicione eles aqui na lista de imports
    PrismaModule,        // <--- Resolve o erro do PrismaService (index [0])
    ReportsPdfModule,    // <--- Resolve o erro do PdfService
    ReportsEmailModule,  // <--- Resolve o erro do ReportsEmailService
  ],
  providers: [WeeklyReportService],
  // Se você precisar usar este serviço em outro lugar (ex: AppModule), adicione exports:
  exports: [WeeklyReportService] 
})
export class ReportsWeeklyReportModule {}