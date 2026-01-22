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
  private logger = new Logger('HeartbeatGateway');

  // Injetando o serviço que criamos para processar a lógica de saúde
  constructor(private readonly healthMonitor: HealthMonitorService) {}

  afterInit() {
    this.logger.log('WebSocket Gateway inicializado');

    // Conexão com o Broker MQTT
    this.mqttClient = mqtt.connect('mqtt://broker.emqx.io');

    this.mqttClient.on('connect', () => {
      this.logger.log('Backend conectado ao MQTT broker');
      
      this.mqttClient.subscribe(['embarca/batimentos', 'embarca/quedas'], (err) => {
        if (err) this.logger.error('Erro ao assinar tópicos', err);
        else this.logger.log('Inscrito com sucesso nos tópicos de saúde');
      });
    });

    this.mqttClient.on('message', async (topic, message) => {
      try {
        const msgString = message.toString();
        const data = JSON.parse(msgString);
        
        // O deviceId agora vem do seu código C do Pico
        const deviceId = data.deviceId || 'UNKNOWN_DEVICE';

        if (topic === 'embarca/batimentos') {
          const payload = Array.isArray(data) ? data[0] : data;
          
          const cleanData = {
            deviceId: deviceId,
            bpm: payload.bpm || 0,
            spo2: payload.spo2 || 0,
            timestamp: new Date().toISOString()
          };

          // --- ADICIONE ESTE LOG ---
          this.logger.log(`📤 Enviando 'dados_vitais' para ${this.server.sockets.sockets.size} clientes: ${JSON.stringify(cleanData)}`);
          
          // 1. Envia via WebSocket
          this.server.emit('dados_vitais', cleanData);

          // 2. Chama o serviço para salvar no Banco (Prisma) e checar anomalias (Telegram)
          await this.healthMonitor.monitorVitals(deviceId, {
            bpm: cleanData.bpm,
            spo2: cleanData.spo2
          });
           
        } else if (topic === 'embarca/quedas') {
          // 1. Envia via WebSocket para o Frontend
          this.server.emit('dados_quedas', { ...data, deviceId });

          // 2. Processa a queda e avisa responsáveis se necessário
          await this.healthMonitor.monitorFall(deviceId, data);
        }

      } catch (error) {
        this.logger.error(`Erro ao processar mensagem MQTT no tópico ${topic}`, error);
      }
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Frontend conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Frontend desconectado: ${client.id}`);
  }
}