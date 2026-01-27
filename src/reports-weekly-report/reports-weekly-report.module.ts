import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module'; 
import { ReportsPdfModule } from '../reports-pdf/reports-pdf.module';
import { ReportsEmailModule } from '../reports-email/reports-email.module';
import { WeeklyReportService } from './reports-weekly-report.service';
import { ReportsController } from './reports-weekly-report.controller';

@Module({
  imports: [
    PrismaModule,       // Acesso ao Banco
    ReportsPdfModule,   // Acesso ao gerador de PDF
    ReportsEmailModule, // Acesso ao enviador de Email
  ],
  controllers: [ReportsController],
  providers: [WeeklyReportService],
  exports: [WeeklyReportService],
})
export class ReportsWeeklyReportModule {}