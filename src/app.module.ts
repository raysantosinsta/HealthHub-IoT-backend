import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// 1. Importe o seu Gateway
import { HeartbeatGateway } from './heartbeat.gateway';
import { PatientsModule } from './patients/patients.module';
import { TelegramService } from './telegram/telegram.service';
import { HealthMonitorService } from './health-monitor/health-monitor.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule.register({}),
    PatientsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    HeartbeatGateway,
    TelegramService,
    HealthMonitorService, // 2. Adicione ele aqui na lista de providers
  ],
})
export class AppModule {}
