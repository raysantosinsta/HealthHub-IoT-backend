import { Module } from '@nestjs/common';
import { TrendAnalysisService } from './trend-analysis.service';
import { PrismaModule } from '../prisma/prisma.module'; // Verifique o caminho
import { TelegramModule } from '../telegram/telegram.module'; // Verifique o caminho

@Module({
  imports: [
    PrismaModule,   // <--- Traz o PrismaService para cá
    TelegramModule, // <--- Traz o TelegramService para cá
  ],
  providers: [TrendAnalysisService],
  exports: [TrendAnalysisService], // Opcional, mas boa prática
})
export class TrendAnalysisModule {}