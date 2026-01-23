import { Module } from '@nestjs/common';
import { PdfService } from './reports-pdf.service';

@Module({
  providers: [PdfService],
  exports: [PdfService]
})
export class ReportsPdfModule {}
