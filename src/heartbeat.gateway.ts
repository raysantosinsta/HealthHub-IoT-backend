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

  afterInit() {
    this.logger.log('WebSocket Gateway inicializado');

    this.mqttClient = mqtt.connect('mqtt://broker.emqx.io');

    this.mqttClient.on('connect', () => {
      this.logger.log('Backend conectado ao MQTT broker');
      
      // 1. Inscrição nos tópicos CORRETOS
      this.mqttClient.subscribe(['embarca/batimentos', 'embarca/quedas'], (err) => {
        if (err) this.logger.error('Erro ao assinar tópicos', err);
        else this.logger.log('Inscrito em: embarca/batimentos e embarca/quedas');
      });
    });

    this.mqttClient.on('message', (topic, message) => {
      try {
        const msgString = message.toString();
        const data = JSON.parse(msgString);
        
        // 2. Verificação com os nomes CORRETOS
        if (topic === 'embarca/batimentos') {
           // Lógica de batimentos
           const payload = Array.isArray(data) ? data[0] : data;
           const cleanData = {
             bpm: payload.batimento || payload.bpm || 0,
             spo2: payload.oximetro || payload.spo2 || 0,
             timestamp: new Date().toISOString()
           };
           this.server.emit('dados_vitais', cleanData);
           
        } else if (topic === 'embarca/quedas') {
           // Lógica de quedas
           this.server.emit('dados_quedas', data);
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