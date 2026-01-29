import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PatientsService, PatientData } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
// Importe o seu Guard de JWT aqui (Exemplo padrão abaixo)
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('patients')
// @UseGuards(JwtAuthGuard) // Recomendo proteger todas as rotas de pacientes
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  // 1. Rota Auxiliar: O Frontend chama essa rota PRIMEIRO para desenhar os inputs
  // GET /patients/activities-patterns
  @Get('activities-patterns')
  getPatterns() {
    return this.patientsService.findAllActivityPatterns();
  }

  @Post()
  @UseGuards(JwtAuthGuard) // Garante que o req.user seja preenchido pelo Passport/JWT
  create(@Body() createPatientDto: CreatePatientDto, @Req() req: any) {
    // Pega o ID da empresa do Admin que está logado
    const companyId = req.user?.companyId;

    if (!companyId) {
      throw new BadRequestException(
        'Não foi possível identificar a empresa do administrador.',
      );
    }

    return this.patientsService.create(createPatientDto, companyId);
  }

  @Get()
  findAll(): Promise<PatientData[]> {
    return this.patientsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PatientData | null> {
    return this.patientsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto) {
    return this.patientsService.update(id, updatePatientDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.patientsService.remove(id);
  }

  /**
   * NOVA ROTA: Atualiza a atividade atual do paciente
   * PATCH /patients/:id/activity
   */
  @Patch(':id/activity')
  updateActivity(
    @Param('id') id: string,
    @Body('activityId') activityId: string,
  ) {
    return this.patientsService.updateActivity(id, activityId);
  }

  @Get(':id/vitals')
  findVitals(@Param('id') id: string) {
    return this.patientsService.findVitals(id);
  }

  @Get(':id/vitals/:days')
  findVitalsByDays(@Param('id') id: string, @Param('days') days: string) {
    return this.patientsService.findVitals(id, parseInt(days, 10));
  }

  // Se você implementou o método de previsões no service
  @Get(':id/predictions')
  findPredictions(@Param('id') id: string) {
    // Note: Certifique-se que o método findPredictions existe no service
    // Se não existir, remova ou implemente conforme discutimos anteriormente
    return (this.patientsService as any).findPredictions(id);
  }
}
