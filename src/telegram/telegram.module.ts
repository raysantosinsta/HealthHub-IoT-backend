import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Module({
  providers: [TelegramService], // Cria o serviço
  exports: [TelegramService],   // <--- OBRIGATÓRIO: Permite que outros módulos usem
})
export class TelegramModule {}