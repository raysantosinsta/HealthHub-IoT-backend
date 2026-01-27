import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PredictionScheduler } from './prediction-scheduler.service';
import { PredictionModule } from '../prediction/prediction.module';  // ← Importe o módulo

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PredictionModule,  // ← Agora tem acesso aos providers do PredictionModule
  ],
  providers: [PredictionScheduler],
})
export class PredictionSchedulerModule {}