// import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// import { Pool, QueryResult } from 'pg';

// @Injectable()
// export class PrismaService implements OnModuleInit, OnModuleDestroy {
//   private readonly logger = new Logger(PrismaService.name);
//   public pool: Pool;

//   constructor() {
//     const connectionString = process.env.DATABASE_URL;
//     if (!connectionString) {
//       throw new Error('DATABASE_URL não está definida no arquivo .env');
//     }
    
//     this.pool = new Pool({ 
//       connectionString,
//       max: 20, // Máximo de conexões simultâneas
//       idleTimeoutMillis: 30000, // Fecha conexões inativas após 30s
//     });
    
//     this.logger.log('📊 PostgreSQL Pool (pg) inicializado');
//   }

//   /**
//    * Método fundamental para rodar queries SQL puras.
//    * Resolve o erro: Property 'query' does not exist on type 'PrismaService'.
//    */
//   async query(sql: string, params: any[] = []): Promise<QueryResult> {
//     return this.pool.query(sql, params);
//   }

//   async onModuleInit() {
//     try {
//       // Testa a saúde da conexão ao iniciar o módulo
//       await this.pool.query('SELECT 1');
//       this.logger.log('✅ Banco de dados conectado com sucesso via SQL Nativo');
//     } catch (error) {
//       this.logger.error('❌ Erro crítico ao conectar na base de dados:', error.message);
//     }
//   }

//   async onModuleDestroy() {
//     this.logger.log('♻️ Fechando pool de conexões do banco de dados...');
//     await this.pool.end();
//   }

//   // ==========================================
//   // Métodos de Abstração para o Modelo Patient
//   // ==========================================
//   get patient() {
//     return {
//       create: async (args: any) => {
//         const { id, name, birthDate, companyId } = args.data;
//         // Uso de aspas duplas pois o Prisma cria tabelas/colunas respeitando CamelCase
//         const result = await this.pool.query(
//           `INSERT INTO "Patient" (id, name, "birthDate", "companyId", active) 
//            VALUES ($1, $2, $3, $4, true) 
//            RETURNING *`,
//           [id, name, birthDate, companyId]
//         );
//         return result.rows[0];
//       },

//       findMany: async (options?: any) => {
//         let sql = 'SELECT * FROM "Patient"';
        
//         if (options?.include?.company) {
//           // Join baseado no seu schema.prisma (companyId -> id)
//           sql = `
//             SELECT p.*, c.name as company_name, c.slug as company_slug 
//             FROM "Patient" p 
//             LEFT JOIN "Company" c ON p."companyId" = c.id
//           `;
//         }
        
//         const result = await this.pool.query(sql);
//         return result.rows || [];
//       },

//       findUnique: async (options: any) => {
//         const { where } = options;
//         const result = await this.pool.query('SELECT * FROM "Patient" WHERE id = $1', [where.id]);
//         return result.rows[0] || null;
//       },

//       update: async (options: any) => {
//         const { where, data } = options;
//         const result = await this.pool.query(
//           `UPDATE "Patient" SET name = $1, active = $2 WHERE id = $3 RETURNING *`,
//           [data.name, data.active, where.id]
//         );
//         return result.rows[0];
//       },

//       delete: async (options: any) => {
//         const result = await this.pool.query('DELETE FROM "Patient" WHERE id = $1 RETURNING *', [options.where.id]);
//         return result.rows[0];
//       }
//     };
//   }

//   // ==========================================
//   // Métodos para o Modelo VitalSign
//   // ==========================================
//   get vitalSign() {
//     return {
//       findMany: async (options: any) => {
//         const result = await this.pool.query(
//           `SELECT * FROM "VitalSign" 
//            WHERE "patientId" = $1 
//            ORDER BY timestamp DESC`,
//           [options.where.patientId]
//         );
//         return result.rows || [];
//       }
//     };
//   }

//   // ==========================================
//   // Métodos para o Modelo HealthPrediction
//   // ==========================================
//   get healthPrediction() {
//     return {
//       findMany: async (options: any) => {
//         const result = await this.pool.query(
//           `SELECT * FROM "HealthPrediction" 
//            WHERE "patientId" = $1 
//            ORDER BY "generatedAt" DESC`,
//           [options.where.patientId]
//         );
//         return result.rows || [];
//       }
//     };
//   }
// }
// O padrão correto geralmente é estender o cliente gerado
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}