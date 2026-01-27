import { Module } from '@nestjs/common';
import { PredictionService } from './prediction.service';
// Removemos o PrismaService dos providers para evitar duplicidade, 
// pois ele já é Global.

@Module({
  providers: [PredictionService],
  exports: [PredictionService], // <--- ESSENCIAL: Permite que outros módulos usem
})
export class PredictionModule {}