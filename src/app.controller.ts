// Adicione esses imports no topo do arquivo
import { Controller, Get, Res } from '@nestjs/common';
import { WeeklyReportService } from './reports-weekly-report/reports-weekly-report.service';
import { AppService } from './app.service';

@Controller()
export class AppController {
  // Injete o serviço de relatório no construtor
  constructor(
    private readonly appService: AppService,
    private readonly reportsService: WeeklyReportService // <--- ADICIONE ISSO
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // --- ROTA DE TESTE ---
  @Get('test-email')
  async triggerTestEmail() {
    console.log("🚀 Disparando teste manual de e-mail...");
    // Isso vai rodar a lógica de gerar PDF e enviar e-mail agora
    await this.reportsService.generateAndSendReports();
    return "Processo de envio de e-mail iniciado! Verifique o console do backend e sua caixa de entrada.";
  }
}