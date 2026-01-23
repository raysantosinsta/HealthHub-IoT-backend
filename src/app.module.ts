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

// Services soltos (que não tem módulo próprio ainda)
import { HeartbeatGateway } from './heartbeat.gateway';
import { HealthMonitorService } from './health-monitor/health-monitor.service';
import { ReportsPdfModule } from './reports-pdf/reports-pdf.module';
import { ReportsEmailModule } from './reports-email/reports-email.module';
import { ReportsWeeklyReportModule } from './reports-weekly-report/reports-weekly-report.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    HttpModule.register({}),
    
    // Importando os Módulos (Eles já trazem seus serviços)
    PatientsModule,
    PrismaModule,
    TrendAnalysisModule,
    TelegramModule,
    ReportsPdfModule,
    ReportsEmailModule,
    ReportsWeeklyReportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    HeartbeatGateway,
    
    // HealthMonitorService ficou aqui pois parece que você não criou um HealthMonitorModule.
    // Se criou, mova ele para os imports também.
    HealthMonitorService, 
    
    // REMOVIDO: TelegramService (já vem do TelegramModule)
    // REMOVIDO: TrendAnalysisService (já vem do TrendAnalysisModule)
  ],
})
export class AppModule {}