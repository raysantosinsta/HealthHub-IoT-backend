import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayInit, 
  OnGatewayConnection, 
  OnGatewayDisconnect 
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private logger = new Logger('RealtimeGateway');
  
  afterInit(server: Server) {
    this.logger.log('🌐 Realtime Notifications Gateway inicializado');
  }
  
  handleConnection(client: Socket) {
    // Pegamos os dados do auth enviados pelo cliente no frontend
    const companyId = client.handshake.auth.companyId;
    const userId = client.handshake.auth.userId;
    
    if (companyId) {
      // O cliente entra em uma "sala" exclusiva da empresa dele (Multi-tenancy)
      client.join(`company-${companyId}`);
      this.logger.log(`👩‍⚕️ Usuário ${userId} conectado à sala da empresa ${companyId}`);
    } else {
      this.logger.warn(`⚠️ Tentativa de conexão sem companyId: ${client.id}`);
      client.disconnect();
    }
  }
  
  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Cliente desconectado: ${client.id}`);
  }

  /**
   * Envia atualização de sinais vitais com contexto de atividade
   */
  notifyPatientStatus(companyId: string, payload: { 
    patientId: string, 
    patientName: string,
    bpm: number, 
    spo2: number,
    activityName: string // <-- NOVIDADE: Contexto da atividade atual
  }) {
    this.server.to(`company-${companyId}`).emit('patient_status_update', {
      ...payload,
      timestamp: new Date()
    });
  }

  /**
   * Alertas Críticos (Taquicardia, Queda, IA Risk High)
   */
  notifyCriticalAlert(companyId: string, alert: {
    patientId: string,
    patientName: string,
    type: 'VITAL_ALERT' | 'FALL' | 'IA_PREDICTION',
    message: string,
    severity: 'HIGH' | 'MODERATE'
  }) {
    this.server.to(`company-${companyId}`).emit('critical_alert', {
      ...alert,
      timestamp: new Date(),
    });
  }

  /**
   * Atualização geral de contadores do Dashboard
   */
  notifyDashboardUpdate(companyId: string, update: any) {
    this.server.to(`company-${companyId}`).emit('dashboard_update', update);
  }
}