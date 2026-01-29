import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt'; // Importe para hash de senha

export interface PatientData {
  id: string;
  name: string;
  email: string;
  birthDate: Date;
  active: boolean;
  currentActivity: { id: string; name: string } | null;
  customThresholds: any[];
  company: { name: string; slug: string } | null;
  vitals: any[];
  devices: any[];
}

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(private prisma: PrismaService) {}

  async findAllActivityPatterns() {
    return await this.prisma.activityPattern.findMany();
  }

  async create(data: CreatePatientDto, companyId: string) {
    try {
      this.logger.log(`Criando paciente ${data.name} com acesso ao sistema.`);

      // 1. Gerar Hash da Senha
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(data.password, salt);

      // 2. Criar no Banco
      return await this.prisma.patient.create({
        data: {
          id: data.customId,
          name: data.name,
          email: data.email,
          password: hashedPassword, // Agora o campo obrigatório está aqui
          birthDate: new Date(data.birthDate),
          companyId: companyId,
          active: true,

          currentActivityId:
            data.thresholds.length > 0
              ? data.thresholds[0].activityPatternId
              : undefined,

          customThresholds: {
            create: data.thresholds.map((config) => ({
              activityPatternId: config.activityPatternId,
              bpmMin: config.bpmMin,
              bpmMax: config.bpmMax,
              spo2Min: config.spo2Min,
            })),
          },

          devices: {
            create: {
              serialNumber: data.customId,
              type: 'ESP32_HEART_RATE',
            },
          },
        },
        include: {
          devices: true,
          customThresholds: { include: { activityPattern: true } },
        },
      });
    } catch (error) {
      this.logger.error(`Erro ao criar paciente: ${error.message}`);

      if (error.code === 'P2003') {
        throw new BadRequestException(
          `Erro de vínculo: A empresa (ID: ${companyId}) informada não existe.`,
        );
      }

      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Já existe um paciente ou dispositivo com este ID/Email.',
        );
      }

      throw error;
    }
  }

  async findAll(): Promise<PatientData[]> {
    try {
      const rows = await this.prisma.patient.findMany({
        include: {
          company: true,
          currentActivity: true,
        },
      });

      return rows.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email || '',
        birthDate: p.birthDate,
        active: p.active,
        currentActivity: p.currentActivity
          ? { id: p.currentActivity.id, name: p.currentActivity.name }
          : null,
        customThresholds: [],
        company: p.company
          ? { name: p.company.name, slug: p.company.slug }
          : null,
        vitals: [],
        devices: [],
      }));
    } catch (error) {
      this.logger.error(`Erro ao listar pacientes: ${error.message}`);
      return [];
    }
  }

  async findOne(id: string): Promise<PatientData | null> {
    try {
      const p = await this.prisma.patient.findUnique({
        where: { id },
        include: {
          company: true,
          currentActivity: true,
          customThresholds: { include: { activityPattern: true } },
          vitals: { orderBy: { timestamp: 'desc' }, take: 20 },
          devices: true,
        },
      });

      if (!p) throw new NotFoundException(`Paciente ${id} não encontrado`);

      return {
        id: p.id,
        name: p.name,
        email: p.email || '',
        birthDate: p.birthDate,
        active: p.active,
        currentActivity: p.currentActivity
          ? { id: p.currentActivity.id, name: p.currentActivity.name }
          : null,
        customThresholds: p.customThresholds,
        company: p.company
          ? { name: p.company.name, slug: p.company.slug }
          : null,
        vitals: p.vitals.map((v) => ({ ...v, id: v.id.toString() })),
        devices: p.devices || [],
      };
    } catch (error) {
      throw error;
    }
  }

  async updateActivity(patientId: string, activityId: string) {
    return await this.prisma.patient.update({
      where: { id: patientId },
      data: { currentActivityId: activityId },
    });
  }

  async findVitals(patientId: string, days: number = 7) {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const vitals = await this.prisma.vitalSign.findMany({
      where: { patientId, timestamp: { gte: date } },
      orderBy: { timestamp: 'asc' },
    });
    return vitals.map((v) => ({ ...v, id: v.id.toString() }));
  }

  async update(id: string, updatePatientDto: UpdatePatientDto) {
    // Se o DTO de update incluir senha, precisamos hashá-la também
    const data = { ...updatePatientDto };
    if (data.password) {
      const salt = await bcrypt.genSalt();
      data.password = await bcrypt.hash(data.password, salt);
    }

    return await this.prisma.patient.update({
      where: { id },
      data: data as any,
    });
  }

  async remove(id: string) {
    return await this.prisma.patient.delete({ where: { id } });
  }

  async findPredictions(patientId: string) {
    return await this.prisma.healthPrediction.findMany({
      where: { patientId },
      orderBy: { generatedAt: 'desc' },
      take: 10,
    });
  }
}
