// Carrega as variáveis de ambiente manualmente para garantir que o DATABASE_URL exista
import 'dotenv/config'; 

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client/client'; // Ajuste se seu caminho for diferente

async function main() {
  console.log('🌱 Iniciando seed...');

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('❌ DATABASE_URL não encontrada no .env');
  }

  // Configura o Adapter
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  // Instancia o Prisma usando o adapter e "as any" para evitar erros de tipagem estrita
  const prisma = new PrismaClient({ adapter } as any);

  try {
    // ==========================================================
    // 1. CONFIGURAÇÃO BÁSICA (EMPRESA E PACIENTE)
    // ==========================================================

    // Criar uma Empresa (Hospital/Clínica)
    const company = await prisma.company.upsert({
      where: { slug: 'hospital-geral' },
      update: {},
      create: {
        name: 'Hospital Geral',
        slug: 'hospital-geral',
      },
    });

    console.log(`🏥 Empresa processada: ${company.name}`);

    // Criar o Paciente com o ID EXATO que está no código C do Pico W
    const patient = await prisma.patient.upsert({
      where: { id: 'SENSOR-PATIENT-001' },
      update: {
        // Atualiza limites para facilitar testes
        bpmMin: 55,  
        bpmMax: 110, 
        spo2Min: 92  
      },
      create: {
        id: 'SENSOR-PATIENT-001',
        name: 'Highlander Santos',
        birthDate: new Date('1990-01-01'),
        companyId: company.id,
        bpmMin: 55,
        bpmMax: 110,
        spo2Min: 92
      },
    });

    console.log(`✅ Paciente garantido: ${patient.name} (ID: ${patient.id})`);

    // ==========================================================
    // 2. SIMULAÇÃO DE TENDÊNCIA DE QUEDA (SpO2)
    // ==========================================================
    console.log('📉 Gerando dados de teste para Tendência de Queda...');

    const now = new Date();
    const ONE_MINUTE = 60 * 1000;

    // A. Limpa dados recentes (últimos 5 min) para não misturar com testes anteriores
    const deleted = await prisma.vitalSign.deleteMany({
      where: {
        patientId: 'SENSOR-PATIENT-001',
        timestamp: {
          gt: new Date(now.getTime() - 5 * ONE_MINUTE) // Maior que 5 min atrás
        }
      }
    });
    console.log(`🧹 Limpeza: ${deleted.count} registros recentes removidos.`);

    // B. Inserir a sequência de queda (99% -> 97% -> 95%)
    
    // 3 Minutos atrás: Estava saudável (99%)
    await prisma.vitalSign.create({
      data: {
        type: 'OXYGEN_SATURATION',
        value: 99.0,
        unit: '%',
        patientId: 'SENSOR-PATIENT-001',
        timestamp: new Date(now.getTime() - 3 * ONE_MINUTE)
      }
    });

    // 2 Minutos atrás: Caiu um pouco (97%)
    await prisma.vitalSign.create({
      data: {
        type: 'OXYGEN_SATURATION',
        value: 97.0,
        unit: '%',
        patientId: 'SENSOR-PATIENT-001',
        timestamp: new Date(now.getTime() - 2 * ONE_MINUTE)
      }
    });

    // 1 Minuto atrás: Caiu mais (95%)
    await prisma.vitalSign.create({
      data: {
        type: 'OXYGEN_SATURATION',
        value: 95.0,
        unit: '%',
        patientId: 'SENSOR-PATIENT-001',
        timestamp: new Date(now.getTime() - 1 * ONE_MINUTE)
      }
    });

    console.log('🧪 Dados de teste inseridos: 99% (-3m) -> 97% (-2m) -> 95% (-1m)');
    console.log('🚀 Aguarde o Cron Job rodar para ver o alerta no Telegram!');

  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();