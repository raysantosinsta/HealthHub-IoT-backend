import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Módulos
import { PatientsModule } from './patients/patients.module';
import { PrismaModule } from './prisma/prisma.module';
import { TrendAnalysisModule } from './trend-analysis/trend-analysis.module';
import { TelegramModule } from './telegram/telegram.module';

// Services/Gateways soltos
import { HeartbeatGateway } from './heartbeat.gateway'; // <--- Ele está importado aqui...
// import { HealthMonitorService } from './health-monitor/health-monitor.service'; // (Veja observação abaixo)

import { ReportsPdfModule } from './reports-pdf/reports-pdf.module';
import { ReportsEmailModule } from './reports-email/reports-email.module';
import { ReportsWeeklyReportModule } from './reports-weekly-report/reports-weekly-report.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './auth/auth.module';
import { PredictionModule } from './prediction/prediction.module';
import { PredictionSchedulerModule } from './prediction-scheduler/prediction-scheduler.module';
import { HealthMonitorModule } from './health-monitor/health-monitor.module';
import { AgentModule } from './agent/agent.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    HttpModule.register({}),
    
    // Seus módulos
    PatientsModule,
    PrismaModule,
    TrendAnalysisModule,
    TelegramModule,
    ReportsPdfModule,
    ReportsEmailModule,
    ReportsWeeklyReportModule,
    DashboardModule,
    AuthModule,
    PredictionModule,
    PredictionSchedulerModule,
    HealthMonitorModule, 
    AgentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 👇 ADICIONE ESTA LINHA AQUI 👇
    HeartbeatGateway, 
  ],
})
export class AppModule {}