import { PrismaClient, Role, RiskLevel, VitalType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Limpando banco de dados ---');
  await prisma.healthPrediction.deleteMany();
  await prisma.vitalSign.deleteMany();
  await prisma.patientActivityThreshold.deleteMany();
  await prisma.device.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.activityPattern.deleteMany();
  await prisma.company.deleteMany();

  console.log('--- Iniciando Seed ---');

  // 1. Criar Empresa (Necessária para a FK do Paciente e Usuário)
  const company = await prisma.company.create({
    data: {
      name: 'Hospital Central Tech',
      slug: 'hospital-central',
    },
  });

  // 2. Criar Usuário Staff/Admin
  await prisma.user.create({
    data: {
      email: 'admin@hospital.com',
      name: 'Dr. Lucas Admin',
      password: 'admin123', // Senha em texto plano
      role: Role.ADMIN,
      companyId: company.id,
    },
  });

  // 3. Criar Padrões de Atividade
  const patterns = await Promise.all([
    prisma.activityPattern.create({
      data: {
        slug: 'resting',
        name: 'Repouso',
        description: 'Paciente acordado e relaxado.',
        defaultBpmMin: 60,
        defaultBpmMax: 100,
      },
    }),
    prisma.activityPattern.create({
      data: {
        slug: 'sleeping',
        name: 'Dormindo',
        description: 'Paciente em sono profundo.',
        defaultBpmMin: 40,
        defaultBpmMax: 80,
      },
    }),
    prisma.activityPattern.create({
      data: {
        slug: 'exercise',
        name: 'Exercício',
        description: 'Atividade física.',
        defaultBpmMin: 100,
        defaultBpmMax: 160,
      },
    }),
  ]);

  // 4. Criar Paciente de Teste (ID fixo para facilitar seus testes no Postman)
  const patient = await prisma.patient.create({
    data: {
      id: 'paciente-teste-01',
      name: 'João da Silva',
      email: 'joao@email.com',
      password: 'paciente123', // Senha em texto plano
      birthDate: new Date('1985-10-10'),
      companyId: company.id,
      active: true,
      currentActivityId: patterns[0].id,

      // Criar thresholds iniciais para o paciente
      customThresholds: {
        create: patterns.map((p) => ({
          activityPatternId: p.id,
          bpmMin: p.defaultBpmMin || 60,
          bpmMax: p.defaultBpmMax || 100,
          spo2Min: 94,
        })),
      },

      // Criar dispositivo vinculado
      devices: {
        create: {
          serialNumber: 'SN-ESP32-001',
          type: 'ESP32_HEART_RATE',
        },
      },
    },
  });

  // 5. Adicionar alguns sinais vitais fictícios
  await prisma.vitalSign.create({
    data: {
      patientId: patient.id,
      type: VitalType.HEART_RATE,
      value: 75,
      unit: 'bpm',
      activityPatternId: patterns[0].id,
    },
  });

  console.log('--- Seed Finalizado ---');
  console.table({
    'Company ID': company.id,
    'Patient ID': patient.id,
    'Admin Email': 'admin@hospital.com',
    'Status': 'Pronto para uso'
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });