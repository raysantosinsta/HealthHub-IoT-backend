import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from 'prisma/generated/client/client';
// Ajuste o import para apontar para a pasta e não para o arquivo 'client' dentro dela

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // Logger opcional para ver o que acontece
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL não está definido no .env');
    }

    // Configuração do Driver Adapter (Ótimo para Serverless/Performance)
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: ['error', 'warn'], // Logs limpos
    } as any); // <--- O TRUQUE: 'as any' silencia o erro de tipagem estrita
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Conectado ao Banco de Dados com Sucesso (Driver Adapter)');
    } catch (err) {
      this.logger.error('Erro ao conectar no banco', err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}