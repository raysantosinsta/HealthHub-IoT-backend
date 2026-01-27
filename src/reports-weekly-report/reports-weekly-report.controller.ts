// src/reports/reports.controller.ts
import { Controller, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import  { WeeklyReportService } from './reports-weekly-report.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly weeklyReportService: WeeklyReportService,
    private readonly prisma: PrismaService,
  ) {}

  // Rota: POST /reports/generate-manual
  @Post('generate-manual')
  async generateManualReport(@Body() body: { patientId: string; emailOverride?: string }) {
    try {
      // 1. Buscar o paciente (pois o service precisa do objeto patient)
      const patient = await this.prisma.patient.findUnique({
        where: { id: body.patientId },
        include: { company: true },
      });

      if (!patient) {
        throw new HttpException('Paciente não encontrado', HttpStatus.NOT_FOUND);
      }

      // 2. Chamar a lógica que já existe no seu Service
      // IMPORTANTE: Você precisa mudar o método 'processPatientReport' de private para public no service
      await this.weeklyReportService.processPatientReport(patient, body.emailOverride);

      return { 
        success: true, 
        message: `Relatório gerado e enviado para o paciente ${patient.name}` 
      };

    } catch (error) {
      throw new HttpException(
        `Erro ao gerar relatório: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
}