// Carrega as variáveis de ambiente manualmente para garantir que o DATABASE_URL exista
import 'dotenv/config'; 

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client/client';
// Importação do cliente gerado na pasta customizada

async function main() {
  console.log('🌱 Iniciando seed...');

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('❌ DATABASE_URL não encontrada no .env');
  }

  // Configura o Adapter (Igual ao seu Service)
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  // Instancia o Prisma usando o adapter
  const prisma = new PrismaClient({ adapter } as any);

  try {
    // 1. Criar uma Empresa (Hospital/Clínica)
    const company = await prisma.company.upsert({
      where: { slug: 'hospital-geral' },
      update: {},
      create: {
        name: 'Hospital Geral',
        slug: 'hospital-geral',
      },
    });

    console.log(`🏥 Empresa processada: ${company.name}`);

    // 2. Criar o Paciente com o ID EXATO que está no código C do Pico W
// 2. Criar o Paciente
    const patient = await prisma.patient.upsert({
      where: { id: 'SENSOR-PATIENT-001' },
      update: {
        // Se já existir, atualiza os limites para teste
        bpmMin: 55,  // Ex: Esse paciente é atleta, aceita 55
        bpmMax: 110, // Aceita até 110
        spo2Min: 92  // Aceita até 92%
      },
      create: {
        id: 'SENSOR-PATIENT-001',
        name: 'Highlander Santos',
        birthDate: new Date('1990-01-01'),
        companyId: company.id,
        // Valores padrão definidos na criação
        bpmMin: 55,
        bpmMax: 110,
        spo2Min: 92
      },
    });

    console.log(`✅ Paciente criado/atualizado: ${patient.name} (ID: ${patient.id})`);

    
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();