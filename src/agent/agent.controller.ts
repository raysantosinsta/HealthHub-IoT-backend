import { Controller, Get, Param } from '@nestjs/common';
import { AgentService } from './agent.service';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('analysis/:patientId')
  async getAnalysis(@Param('patientId') patientId: string) {
    return this.agentService.getClinicalAnalysis(patientId);
  }
}