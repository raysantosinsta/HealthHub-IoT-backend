// prisma/seed.ts

import { PrismaClient, Role, VitalType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando o seed (SEM HASH)...');

  // 1. LIMPEZA
  await prisma.healthPrediction.deleteMany();
  await prisma.vitalSign.deleteMany();
  await prisma.patientActivityThreshold.deleteMany();
  await prisma.device.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.activityPattern.deleteMany();
  await prisma.company.deleteMany();

  console.log('🧹 Banco limpo.');

  // 2. CRIAR PADRÕES DE ATIVIDADE
  const activityRest = await prisma.activityPattern.create({
    data: { name: 'Repouso / Sentado', slug: 'repouso', description: 'Atividade basal.' }
  });

  const activitySleep = await prisma.activityPattern.create({
    data: { name: 'Dormindo', slug: 'dormindo', description: 'Sono profundo ou leve.' }
  });

  const activityExercise = await prisma.activityPattern.create({
    data: { name: 'Exercício Físico', slug: 'exercicio', description: 'Atividade intensa.' }
  });

  // 3. CRIAR EMPRESA
  const company = await prisma.company.create({
    data: { name: 'Health Corp Ltda', slug: 'health-corp' },
  });

  // 4. CRIAR USUÁRIOS (SENHA EM TEXTO PURO)
  await prisma.user.create({
    data: {
      name: 'Dr. House',
      email: 'doutor@healthcorp.com',
      password: '123456', // <--- Texto puro aqui
      role: Role.STAFF,
      companyId: company.id,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Admin Sistema',
      email: 'admin@healthcorp.com',
      password: '123456', // <--- Texto puro aqui
      role: Role.ADMIN,
      companyId: company.id,
    },
  });

  // 5. CRIAR PACIENTE
  const patient = await prisma.patient.create({
    data: {
      name: 'João da Silva',
      email: 'joao.silva@email.com',
      birthDate: new Date('1980-05-20'),
      companyId: company.id,
      currentActivityId: activityRest.id,
      active: true,
    },
  });

  console.log(`👤 Paciente criado: ${patient.name}`);

  // 6. CRIAR DISPOSITIVO (IMPORTANTE PARA O MQTT)
  await prisma.device.create({
    data: {
      id: 'SENSOR-PATIENT-001', // O ID QUE O SEU ARDUINO/C++ ENVIA
      serialNumber: 'SN-99887766',
      type: 'SMART_VITAL_WATCH_V2',
      patientId: patient.id,
    },
  });

  console.log('⌚ Dispositivo SENSOR-PATIENT-001 vinculado!');

  // 7. THRESHOLDS (LIMITES)
  await prisma.patientActivityThreshold.create({
    data: {
      patientId: patient.id,
      activityPatternId: activitySleep.id,
      bpmMin: 40, bpmMax: 90, spo2Min: 92,
    },
  });

  await prisma.patientActivityThreshold.create({
    data: {
      patientId: patient.id,
      activityPatternId: activityExercise.id,
      bpmMin: 80, bpmMax: 170, spo2Min: 90,
    },
  });

  // 8. DADOS FAKE
  const now = new Date();
  for (let i = 0; i < 20; i++) {
    const time = new Date(now.getTime() - i * 5 * 60000);
    
    await prisma.vitalSign.create({
      data: {
        patientId: patient.id,
        type: VitalType.HEART_RATE,
        value: 70 + Math.random() * 10,
        unit: 'bpm',
        timestamp: time,
        activityPatternId: activityRest.id,
      }
    });

    await prisma.vitalSign.create({
      data: {
        patientId: patient.id,
        type: VitalType.OXYGEN_SATURATION,
        value: 96 + Math.random() * 3,
        unit: '%',
        timestamp: time,
        activityPatternId: activityRest.id,
      }
    });
  }

  console.log('✅ Seed (sem hash) concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });