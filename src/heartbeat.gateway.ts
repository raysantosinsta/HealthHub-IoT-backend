import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as mqtt from 'mqtt';
import { Injectable, Logger } from '@nestjs/common';
import { HealthMonitorService } from './health-monitor/health-monitor.service';

// Interface para evitar o erro de "type never"
interface PatientWithContext {
  id: string;
  name: string;
  companyId: string;
  currentActivity?: {
    name: string;
  } | null;
}

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
})
export class HeartbeatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private mqttClient: mqtt.MqttClient;
  private readonly logger = new Logger('HeartbeatGateway');
  private readonly XOR_KEY = 'simple_key_123';

  constructor(private readonly healthMonitor: HealthMonitorService) {}

  /**
   * CORREÇÃO: Descriptografa direto do Buffer (Bytes)
   * Isso evita que o message.toString() corrompa bytes inválidos do UTF-8
   */
  private xorDecryptBuffer(buffer: Buffer): string {
    let decrypted = '';
    const keyLen = this.XOR_KEY.length;

    for (let i = 0; i < buffer.length; i++) {
      // Pega o byte puro do buffer e faz XOR com o código do caractere da chave
      const decodedChar = buffer[i] ^ this.XOR_KEY.charCodeAt(i % keyLen);
      decrypted += String.fromCharCode(decodedChar);
    }
    return decrypted;
  }

  afterInit() {
    this.logger.log('🌐 Heartbeat MQTT/WS Gateway inicializado');

    // Conexão com o Broker MQTT
    this.mqttClient = mqtt.connect('mqtt://broker.emqx.io');

    this.mqttClient.on('connect', () => {
      this.logger.log('📡 Backend conectado ao broker MQTT');
      this.mqttClient.subscribe(['embarca/batimentos', 'embarca/quedas']);
    });

    this.mqttClient.on('message', async (topic, message: Buffer) => {
      // message vem como Buffer do pacote 'mqtt'
      let data: any = null;
      let usedString = ''; // Apenas para log de erro

      try {
        // TENTATIVA 1: Tenta ler como JSON Limpo (caso você tenha desligado a criptografia no C++)
        try {
          usedString = message.toString();
          data = JSON.parse(usedString);
        } catch (e) {
          // TENTATIVA 2: Se falhar, assume que é criptografado e usa a função CORRIGIDA
          usedString = this.xorDecryptBuffer(message);
          // Remove caracteres nulos ou espaços extras que o C++ pode ter enviado
          usedString = usedString.trim().replace(/\0/g, '');
          data = JSON.parse(usedString);
        }

        const deviceId = data.deviceId || 'UNKNOWN_DEVICE';

        this.logger.debug(`📡 Mensagem recebida do dispositivo: ${deviceId}`);

        // --- PROCESSAMENTO DE BATIMENTOS E OXIGÊNIO ---
        if (topic === 'embarca/batimentos') {
          const payload = Array.isArray(data) ? data[0] : data;

          const patient = (await this.healthMonitor.monitorVitals(deviceId, {
            bpm: Number(payload.bpm || 0),
            spo2: Number(payload.spo2 || 0),
          })) as PatientWithContext | null;

          if (!patient) {
            this.logger.warn(
              `⚠️ Dispositivo ${deviceId} não possui paciente vinculado.`,
            );
            return;
          }

          const cleanData = {
            deviceId: deviceId,
            patientId: patient.id,
            patientName: patient.name,
            bpm: Number(payload.bpm || 0),
            spo2: Number(payload.spo2 || 0),
            activity: patient.currentActivity?.name || 'Repouso',
            companyId: patient.companyId,
            timestamp: new Date().toISOString(),
          };

          this.logger.log(
            `❤️ [${cleanData.activity}] ${cleanData.patientName}: ${cleanData.bpm} BPM | ${cleanData.spo2}% SpO2`,
          );

          const room = `company-${patient.companyId}`;
          this.server.to(room).emit('dados_vitais', cleanData);

          // --- PROCESSAMENTO DE QUEDAS ---
        } else if (topic === 'embarca/quedas') {
          const patient = (await this.healthMonitor.monitorFall(
            deviceId,
            data,
          )) as PatientWithContext | null;

          if (patient) {
            const fallPayload = {
              ...data,
              deviceId,
              patientName: patient.name,
              timestamp: new Date(),
            };

            this.logger.warn(`🚨 QUEDA DETECTADA: ${patient.name}`);
            this.server
              .to(`company-${patient.companyId}`)
              .emit('dados_quedas', fallPayload);
          }
        }
      } catch (error) {
        // Log melhorado para mostrar O QUE chegou errado
        this.logger.error(`❌ Erro MQTT JSON: ${error.message}`);
        this.logger.error(`📥 String que falhou: "${usedString}"`);
      }
    });
  }

  handleConnection(client: Socket) {
    console.log('[WS] Nova conexão de:', client.id);
    console.log('[WS] Handshake auth:', client.handshake.auth);

    const companyId = client.handshake.auth?.companyId as string | undefined;

    if (companyId) {
      const room = `company-${companyId}`;
      client.join(room);
      console.log(`[WS] Cliente ${client.id} entrou na sala ${room}`);
    } else {
      console.warn('[WS] Conexão sem companyId – não entrou em sala nenhuma');
    }
  }

  handleDisconnect(client: Socket) {
    // this.logger.log(`🔌 Cliente desconectado`);
  }
}
