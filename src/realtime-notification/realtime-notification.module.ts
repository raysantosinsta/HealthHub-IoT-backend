// src/notifications/realtime/realtime.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RealtimeGateway } from './realtime-notification.gateway';
import { DashboardService } from 'src/dashboard/dashboard.service';

@Module({
  imports: [PrismaModule],
  providers: [RealtimeGateway, DashboardService],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}