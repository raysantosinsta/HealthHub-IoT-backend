import { Module } from '@nestjs/common';
import { ReportsEmailService } from './reports-email.service';

@Module({
  providers: [ReportsEmailService],
  exports: [ReportsEmailService],
})
export class ReportsEmailModule {}
