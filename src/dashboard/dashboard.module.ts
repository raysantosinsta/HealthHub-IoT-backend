// src/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    PrismaModule, // Importar o módulo que fornece o PrismaService
    EventEmitterModule.forRoot(), // Importar o EventEmitterModule
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService], // Se outros módulos precisarem do DashboardService
})
export class DashboardModule {}