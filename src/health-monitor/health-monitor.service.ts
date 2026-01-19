import { Injectable } from '@nestjs/common';
// serviço que vai receber os dados do heartbeat.gateway.ts e vai comparar os dados vindo so sensores com os dados padrões de saúde do paciente se tiver anomalia ele vai chamar o serviço do telegram para avisar o responsável
// vai tratar tando o dados de batimentos quanto os dados de quedas
@Injectable()
export class HealthMonitorService {}
