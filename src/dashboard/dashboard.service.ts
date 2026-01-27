import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, VitalType } from '@prisma/client';

export interface MyPatientItem {
  id: string;
  name: string;
  age: number;
  status: 'NORMAL' | 'ALERT' | 'CRITICAL';
  lastBPM: number;
  lastSpO2: number;
  lastTemperature: number;
  lastUpdate: Date | null;
  deviceConnected: boolean;
}

export interface MyPatientsResponse {
  data: MyPatientItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Tipagem para facilitar o uso das relações complexas do Prisma
type PatientWithAll = Prisma.PatientGetPayload<{
  include: {
    currentActivity: true;
    customThresholds: { include: { activityPattern: true } };
    vitals: { take: 10, orderBy: { timestamp: 'desc' } };
    devices: true;
  };
}>;

export interface AlertSummary {
  patientId: string;
  patientName: string;
  alertCount: number;
  lastAlertType: string;    // Ex: 'BPM', 'SpO2' ou 'QUEDA'
  lastAlertTime: Date;
  bpmMin?: number;          // Limite mínimo configurado no momento do alerta
  bpmMax?: number;          // Limite máximo configurado no momento do alerta
  spo2Min?: number;         // Limite de saturação no momento do alerta
}

export interface DashboardOverview {
  totalPatients: number;
  activePatients: number;
  criticalPatients: number;
  totalAlerts24h: number;
  avgBPM: number;
  avgSpO2: number;
  avgTemperature: number;
  deviceConnectivity: number;
}

export interface PatientGridItem {
  id: string;
  name: string;
  age: number;
  status: 'NORMAL' | 'ALERT' | 'CRITICAL';
  lastBPM: number;
  lastSpO2: number;
  lastUpdate: Date | string | null;
  deviceConnected: boolean;
  currentActivity: string;
}

export interface PatientGridResponse {
  data: PatientGridItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 15000;

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  // Adicione este método dentro do seu DashboardService

async getMyPatients(
  userId: string, // Mantido na assinatura para não quebrar o Controller
  companyId: string,
  page: number = 1,
  limit: number = 20,
): Promise<MyPatientsResponse> {
  try {
    const skip = (page - 1) * limit;

    // O filtro agora usa apenas o que existe no seu Model: companyId e active
    const filter: Prisma.PatientWhereInput = { 
      companyId, 
      active: true,
    };

    const total = await this.prisma.patient.count({ where: filter });

    const patientsRaw = await this.prisma.patient.findMany({
      where: filter,
      include: {
        currentActivity: true,
        customThresholds: true,
        vitals: {
          take: 5,
          orderBy: { timestamp: 'desc' },
        },
        devices: true,
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip,
    });

    const data: MyPatientItem[] = patientsRaw.map((p: any) => {
      // Usando o Enum VitalType para garantir segurança
      const lastBPM = p.vitals.find((v: any) => v.type === VitalType.HEART_RATE)?.value || 0;
      const lastSpO2 = p.vitals.find((v: any) => v.type === VitalType.OXYGEN_SATURATION)?.value || 0;

      return {
        id: p.id,
        name: p.name,
        age: this.calculateAge(p.birthDate),
        status: this.getPatientLevel(p), 
        lastBPM,
        lastSpO2,
        lastTemperature: 0, 
        lastUpdate: p.vitals[0]?.timestamp || null,
        deviceConnected: p.devices.length > 0,
      };
    });

    return { 
      data, 
      total, 
      page, 
      limit, 
      totalPages: Math.ceil(total / limit) 
    };
  } catch (error) {
    this.logger.error(`Erro ao buscar pacientes da empresa ${companyId} (solicitado por ${userId}): ${error.message}`);
    return { data: [], total: 0, page, limit, totalPages: 0 };
  }
}

  async getAlertsSummary(companyId: string): Promise<AlertSummary[]> {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // 1. Busca vitais que saíram do limite nas últimas 24h
      // O include traz os limites (thresholds) para compararmos em memória
      const vitalsRaw = await this.prisma.vitalSign.findMany({
        where: {
          timestamp: { gte: since },
          patient: { companyId, active: true },
        },
        include: {
          patient: {
            include: { customThresholds: true }
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      const alertsMap = new Map<string, AlertSummary>();

      // 2. Processa as leituras para identificar quais foram alertas
      for (const v of vitalsRaw) {
        const p = v.patient;
        if (!p) continue;

        // Busca o limite específico para a atividade que estava sendo realizada
        const threshold = p.customThresholds.find(
          t => t.activityPatternId === v.activityPatternId
        );

        const bMin = threshold?.bpmMin ?? 60;
        const bMax = threshold?.bpmMax ?? 100;
        const sMin = threshold?.spo2Min ?? 94;

        let isAlert = false;
        if (v.type === VitalType.HEART_RATE && (v.value > bMax || v.value < bMin)) isAlert = true;
        if (v.type === VitalType.OXYGEN_SATURATION && v.value < sMin) isAlert = true;

        if (isAlert) {
          if (!alertsMap.has(p.id)) {
            alertsMap.set(p.id, {
              patientId: p.id,
              patientName: p.name,
              alertCount: 0,
              lastAlertType: v.type === VitalType.HEART_RATE ? 'BPM' : 'SpO2',
              lastAlertTime: v.timestamp,
              bpmMin: bMin,
              bpmMax: bMax,
              spo2Min: sMin,
            });
          }
          
          const summary = alertsMap.get(p.id)!;
          summary.alertCount++;
        }
      }

      // Retorna a lista de pacientes com alertas ordenada pela gravidade (quantidade)
      return Array.from(alertsMap.values()).sort((a, b) => b.alertCount - a.alertCount);
    } catch (error) {
      this.logger.error(`Erro ao gerar resumo de alertas: ${error.message}`);
      return [];
    }
  }

  /* =====================================================
      DASHBOARD OVERVIEW
     ===================================================== */
  async getDashboardOverview(companyId: string): Promise<DashboardOverview> {
    const cacheKey = `overview_${companyId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const patients = await this.prisma.patient.findMany({
        where: { companyId, active: true },
        include: {
          currentActivity: true,
          customThresholds: { include: { activityPattern: true } },
          vitals: { take: 5, orderBy: { timestamp: 'desc' } },
          devices: true,
        },
      }) as unknown as PatientWithAll[];

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      const activePatients = patients.filter(
        (p) => p.vitals[0] && new Date(p.vitals[0].timestamp) > twoHoursAgo,
      );

      // Agora o cálculo de crítico considera a atividade atual
      const criticalCount = patients.filter(p => this.getPatientLevel(p) === 'CRITICAL').length;
      const totalAlerts24h = await this.get24hAlertsCount(companyId);
      const averages = this.calculateAverages(patients);
      const deviceConnectivity = this.calculateDeviceConnectivity(patients);

      const result: DashboardOverview = {
        totalPatients: patients.length,
        activePatients: activePatients.length,
        criticalPatients: criticalCount,
        totalAlerts24h,
        avgBPM: averages.bpm,
        avgSpO2: averages.spo2,
        avgTemperature: averages.temperature,
        deviceConnectivity,
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      this.logger.error(`Erro no overview: ${error.message}`);
      return this.emptyOverview();
    }
  }

  /* =====================================================
      LÓGICA DE STATUS (Baseada em Atividade)
     ===================================================== */
  private getPatientLevel(patient: PatientWithAll): 'NORMAL' | 'ALERT' | 'CRITICAL' {
    const lastBPM = patient.vitals.find(v => v.type === VitalType.HEART_RATE)?.value || 0;
    const lastSpO2 = patient.vitals.find(v => v.type === VitalType.OXYGEN_SATURATION)?.value || 0;

    if (lastBPM === 0 && lastSpO2 === 0) return 'NORMAL';

    // Busca o limite específico para o que o paciente está fazendo agora
    const threshold = patient.customThresholds.find(
      t => t.activityPatternId === patient.currentActivityId
    );

    // Se não houver config customizada, usa padrões globais
    const limits = {
      bpmMin: threshold?.bpmMin ?? 60,
      bpmMax: threshold?.bpmMax ?? 100,
      spo2Min: threshold?.spo2Min ?? 94,
    };

    let level: 'NORMAL' | 'ALERT' | 'CRITICAL' = 'NORMAL';

    // Validação BPM
    if (lastBPM > 0) {
      if (lastBPM > limits.bpmMax * 1.2 || lastBPM < limits.bpmMin * 0.8) level = 'CRITICAL';
      else if (lastBPM > limits.bpmMax || lastBPM < limits.bpmMin) level = 'ALERT';
    }

    // Validação SpO2
    if (lastSpO2 > 0) {
      if (lastSpO2 < limits.spo2Min - 5) level = 'CRITICAL';
      else if (lastSpO2 < limits.spo2Min) level = level === 'NORMAL' ? 'ALERT' : level;
    }

    return level;
  }

  /* =====================================================
      ALERTAS 24H (Refatorado para o novo Schema)
     ===================================================== */
  private async get24hAlertsCount(companyId: string): Promise<number> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Buscamos sinais vitais e os limites vinculados ao contexto da época (activityPatternId)
    const vitals = await this.prisma.vitalSign.findMany({
      where: {
        timestamp: { gte: since },
        patient: { companyId, active: true }
      },
      include: {
        patient: { include: { customThresholds: true } }
      }
    });

    const alertPatientIds = new Set<string>();

    for (const v of vitals) {
      const threshold = v.patient.customThresholds.find(t => t.activityPatternId === v.activityPatternId);
      const bMin = threshold?.bpmMin ?? 60;
      const bMax = threshold?.bpmMax ?? 100;
      const sMin = threshold?.spo2Min ?? 94;

      if (v.type === VitalType.HEART_RATE && (v.value > bMax || v.value < bMin)) {
        alertPatientIds.add(v.patientId);
      } else if (v.type === VitalType.OXYGEN_SATURATION && v.value < sMin) {
        alertPatientIds.add(v.patientId);
      }
    }

    return alertPatientIds.size;
  }

  /* =====================================================
      GRID DE PACIENTES
     ===================================================== */
  async getPatientStatusGrid(companyId: string, page = 1, limit = 50): Promise<PatientGridResponse> {
    const skip = (page - 1) * limit;

    const [total, patientsRaw] = await Promise.all([
      this.prisma.patient.count({ where: { companyId, active: true } }),
      this.prisma.patient.findMany({
        where: { companyId, active: true },
        include: {
          currentActivity: true,
          customThresholds: true,
          vitals: { take: 5, orderBy: { timestamp: 'desc' } },
          devices: true,
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip,
      })
    ]);

    const data = patientsRaw.map((p: any) => {
      const lastBPM = p.vitals.find(v => v.type === VitalType.HEART_RATE)?.value || 0;
      const lastSpO2 = p.vitals.find(v => v.type === VitalType.OXYGEN_SATURATION)?.value || 0;
      
      return {
        id: p.id,
        name: p.name,
        age: this.calculateAge(p.birthDate),
        status: this.getPatientLevel(p),
        lastBPM,
        lastSpO2,
        lastUpdate: p.vitals[0]?.timestamp || null,
        deviceConnected: p.devices.length > 0,
        currentActivity: p.currentActivity?.name || 'Indefinida'
      };
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ... (Outros métodos utilitários mantidos e adaptados para VitalType enum)

  private calculateAverages(patients: PatientWithAll[]) {
    let bpm = 0, spo2 = 0, bC = 0, sC = 0;
    patients.forEach(p => {
      p.vitals.forEach(v => {
        if (v.type === VitalType.HEART_RATE) { bpm += v.value; bC++; }
        if (v.type === VitalType.OXYGEN_SATURATION) { spo2 += v.value; sC++; }
      });
    });
    return {
      bpm: bC ? Math.round(bpm / bC) : 0,
      spo2: sC ? Math.round(spo2 / sC) : 0,
      temperature: 0, // Ajustar se adicionar temperatura ao VitalType
    };
  }

  private calculateDeviceConnectivity(patients: PatientWithAll[]): number {
    if (!patients.length) return 0;
    const connected = patients.filter(p => p.devices.length > 0).length;
    return Math.round((connected / patients.length) * 100);
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  private emptyOverview(): DashboardOverview {
    return { totalPatients: 0, activePatients: 0, criticalPatients: 0, totalAlerts24h: 0, avgBPM: 0, avgSpO2: 0, avgTemperature: 0, deviceConnectivity: 0 };
  }
}