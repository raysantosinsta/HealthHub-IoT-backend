// src/dashboard/dashboard.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';
import { GetUser } from '../auth/decorators/get-user.decorator';

// Definição de Role sincronizada com o @prisma/client ou seu Auth
enum Role {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF'
}

interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
}

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Métricas globais da empresa (Cards superiores)' })
  async getDashboardOverview(@GetUser() user: User) {
    // Agora passa o companyId do usuário logado
    return this.dashboardService.getDashboardOverview(user.companyId);
  }

  @Get('patient-status')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOperation({ summary: 'Grid principal com status e atividade atual' })
  async getPatientStatusGrid(
    @GetUser() user: User,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    // Convertendo strings da Query para números antes de passar ao service
    return this.dashboardService.getPatientStatusGrid(
      user.companyId,
      Number(page),
      Number(limit),
    );
  }

  @Get('alerts-summary')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Lista de pacientes em estado crítico/alerta nas últimas 24h' })
  async getAlertsSummary(@GetUser() user: User) {
    return this.dashboardService.getAlertsSummary(user.companyId);
  }

  @Get('my-patients')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOperation({ summary: 'Lista reduzida de pacientes vinculados' })
  async getMyPatients(
    @GetUser() user: User,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.dashboardService.getMyPatients(
      user.id,
      user.companyId,
      Number(page),
      Number(limit),
    );
  }
}