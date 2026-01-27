import { Module } from '@nestjs/common';
import { HealthMonitorService } from './health-monitor.service';
import { HeartbeatGateway } from '../heartbeat.gateway';

// Importe os Módulos necessários
import { TelegramModule } from '../telegram/telegram.module'; 
import { PredictionModule } from 'src/prediction/prediction.module';

@Module({
  imports: [
    TelegramModule,   // Para usar o TelegramService
    PredictionModule  // Para usar o PredictionService <--- AQUI ESTÁ A CORREÇÃO
  ],
  providers: [
    HealthMonitorService, 
    HeartbeatGateway,
    // NÃO coloque os Services aqui (PredictionService, TelegramService).
    // Eles já vêm automaticamente através dos imports acima.
  ],
  exports: [HealthMonitorService]
})
export class HealthMonitorModule {}