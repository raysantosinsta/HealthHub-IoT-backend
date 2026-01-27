import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PrismaService } from 'src/prisma/prisma.service';

// Interface atualizada para refletir a nova modelagem
export interface PatientData {
  id: string;
  name: string;
  email: string;
  birthDate: Date;
  active: boolean;
  currentActivity: { id: string; name: string } | null;
  customThresholds: any[]; // Limites por atividade
  company: { name: string; slug: string } | null;
  vitals: any[];
  devices: any[];
}

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(private prisma: PrismaService) {}

 // patients.service.ts

async create(data: CreatePatientDto, companyId: string) {
  try {
    return await this.prisma.patient.create({
      data: {
        id: data.customId, // Opcional: usar o ID do sensor como ID do paciente
        name: data.name,
        email: data.email,
        birthDate: new Date(data.birthDate),
        companyId: companyId,
        active: true,
        // CRIAR O VÍNCULO COM O DISPOSITIVO AQUI
        devices: {
          create: {
            serialNumber: data.customId, // O "SENSOR-PATIENT-001"
            type: 'ESP32_HEART_RATE',
          }
        }
      },
      include: { devices: true }
    });
  } catch (error) {
    this.logger.error(`Erro ao criar paciente: ${error.message}`);
    throw error;
  }
}

  async findAll(): Promise<PatientData[]> {
    try {
      const rows = await this.prisma.patient.findMany({
        include: {
          company: true,
          currentActivity: true, // Traz o que ele está fazendo agora
        },
      });

      if (!rows) return [];

      return rows.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email || '',
        birthDate: p.birthDate,
        active: p.active,
        currentActivity: p.currentActivity
          ? { id: p.currentActivity.id, name: p.currentActivity.name }
          : null,
        customThresholds: [], // Adicionar apenas no findOne para performance
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

  async findPredictions(patientId: string) {
    try {
      return await this.prisma.healthPrediction.findMany({
        where: { patientId },
        orderBy: { generatedAt: 'desc' },
        take: 10, // Traz apenas as 10 últimas predições
      });
    } catch (error) {
      this.logger.error(
        `Erro ao buscar predições do paciente ${patientId}: ${error.message}`,
      );
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
          customThresholds: {
            include: { activityPattern: true }, // Traz os limites e o nome da atividade
          },
          vitals: {
            orderBy: { timestamp: 'desc' },
            take: 20,
            include: { activityPattern: true }, // Importante para saber o contexto do vital
          },
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
      this.logger.error(`Erro ao buscar paciente ${id}: ${error.message}`);
      throw error;
    }
  }

  // --- MÉTODOS DE ATUALIZAÇÃO DE STATUS (O que o frontend vai usar) ---

  async updateActivity(patientId: string, activityId: string) {
    return await this.prisma.patient.update({
      where: { id: patientId },
      data: { currentActivityId: activityId },
    });
  }

  // --- MÉTODOS REQUISITADOS PELO CONTROLLER ---

  async findVitals(patientId: string, days: number = 7) {
    try {
      const date = new Date();
      date.setDate(date.getDate() - days);

      const vitals = await this.prisma.vitalSign.findMany({
        where: {
          patientId,
          timestamp: { gte: date },
        },
        include: { activityPattern: true }, // Contexto no gráfico
        orderBy: { timestamp: 'asc' },
      });
      return vitals.map((v) => ({ ...v, id: v.id.toString() }));
    } catch (error) {
      this.logger.error(
        `Erro ao buscar vitais do paciente ${patientId}: ${error.message}`,
      );
      return [];
    }
  }

  async update(id: string, updatePatientDto: UpdatePatientDto) {
    try {
      // O Prisma agora impede de enviar bpmMin/bpmMax aqui se eles não existirem no modelo Patient
      return await this.prisma.patient.update({
        where: { id },
        data: updatePatientDto,
      });
    } catch (error) {
      this.logger.error(`Erro ao atualizar paciente ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.patient.delete({ where: { id } });
    } catch (error) {
      this.logger.error(`Erro ao remover paciente ${id}: ${error.message}`);
      throw error;
    }
  }
}
