import { Module } from '@nestjs/common';
import { PdfService } from './reports-pdf.service';
import { ReportsPdfController } from './reports-pdf.controller';

@Module({
  providers: [PdfService],
  exports: [PdfService],
  controllers: [ReportsPdfController]
})
export class ReportsPdfModule {}
