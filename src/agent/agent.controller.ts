import { Controller, Get, Param, Query } from '@nestjs/common';
import { AgentService } from './agent.service';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('guidance/:patientId')
  async getPatientGuidance(
    @Param('patientId') patientId: string,
    @Query('onlyContext') onlyContext: string, // Recebe como string da URL
  ) {
    return this.agentService.getPatientGuidance(
      patientId,
      onlyContext === 'true',
    );
  }
}
