import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService], // <--- O SEGREDO ESTÁ AQUI: Exportar o serviço
})
export class PrismaModule {}
