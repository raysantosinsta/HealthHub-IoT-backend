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

interface PatientWithContext {
  id: string;
  name: string;
  companyId: string;
  currentActivity?: { name: string } | null;
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

  constructor(private readonly healthMonitor: HealthMonitorService) {}

  afterInit() {
    this.logger.log('🌐 Heartbeat MQTT/WS Gateway inicializado');

    this.mqttClient = mqtt.connect('mqtt://broker.emqx.io');

    this.mqttClient.on('connect', () => {
      this.logger.log('📡 Backend conectado ao broker MQTT com sucesso');
      this.mqttClient.subscribe(
        ['embarca/batimentos', 'embarca/quedas'],
        (err) => {
          if (err) {
            this.logger.error('❌ Erro ao subscrever tópicos: ' + err.message);
          } else {
            this.logger.log(
              '✅ Subscreveu com sucesso: embarca/batimentos e embarca/quedas',
            );
          }
        },
      );
    });

    this.mqttClient.on('error', (err) => {
      this.logger.error('MQTT Client erro: ' + err.message);
    });

    this.mqttClient.on('message', async (topic, message: Buffer) => {
      this.logger.log(`[MQTT] Mensagem recebida no tópico → ${topic}`);
      this.logger.log(`[MQTT] Tamanho do payload: ${message.length} bytes`);

      const hexPreview = Buffer.from(
        message.slice(0, Math.min(60, message.length)),
      ).toString('hex');
      this.logger.log(
        `[MQTT] Preview hex (primeiros ${hexPreview.length / 2} bytes): ${hexPreview}`,
      );

      let rawString = '';
      let parsedData: any = null;

      try {
        // Como NÃO tem mais criptografia → direto para UTF-8
        rawString = message.toString('utf8');
        this.logger.log(`[MQTT] Payload recebido (UTF-8): "${rawString}"`);

        try {
          parsedData = JSON.parse(rawString);
          this.logger.log(`[MQTT] Parse OK! Dados:`, parsedData);
        } catch (parseErr) {
          this.logger.error(
            `[MQTT] Falha ao parsear JSON: ${parseErr.message}`,
          );
          this.logger.error(
            `[MQTT] Conteúdo que falhou no parse: "${rawString}"`,
          );
          return; // Para aqui se JSON inválido
        }

        if (parsedData) {
          const deviceId = parsedData.deviceId || 'UNKNOWN_DEVICE';
          this.logger.log(`[MQTT] Device ID extraído: ${deviceId}`);

          // PROCESSAMENTO DE BATIMENTOS
          if (topic === 'embarca/batimentos') {
            const payload = Array.isArray(parsedData)
              ? parsedData[0]
              : parsedData;

            const patient = (await this.healthMonitor.monitorVitals(deviceId, {
              bpm: Number(payload.bpm || 0),
              spo2: Number(payload.spo2 || 0),
            })) as PatientWithContext | null;

            if (!patient) {
              this.logger.warn(
                `⚠️ Dispositivo ${deviceId} sem paciente vinculado`,
              );
              return;
            }

            const cleanData = {
              deviceId,
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
          }

          // PROCESSAMENTO DE QUEDAS
          else if (topic === 'embarca/quedas') {
            this.logger.warn(
              `🚨 QUEDA → Tópico DETECTADO! Payload:`,
              parsedData,
            );

            if (deviceId === 'UNKNOWN_DEVICE') {
              this.logger.error(
                `❌ Payload sem deviceId válido! Conteúdo:`,
                parsedData,
              );
              return;
            }

            try {
              const patient = await this.healthMonitor.monitorFall(
                deviceId,
                parsedData,
              );

              if (patient) {
                this.logger.warn(
                  `🚨 QUEDA PROCESSADA → Paciente: ${patient.name} (${patient.id}) | Company: ${patient.companyId}`,
                );

                const fallPayload = {
                  ...parsedData,
                  deviceId,
                  patientId: patient.id, // ← ADICIONE ISSO!
                  patientName: patient.name,
                  timestamp: new Date(),
                };

                const room = `company-${patient.companyId}`;
                this.logger.log(`[WS] Emitindo 'dados_quedas' → sala: ${room}`);
                this.logger.log(
                  `[WS] Payload enviado ao frontend:`,
                  fallPayload,
                );

                this.server.to(room).emit('dados_quedas', fallPayload);
              } else {
                this.logger.warn(
                  `⚠️ Queda recebida, mas paciente NÃO encontrado para deviceId: ${deviceId}`,
                );
              }
            } catch (err) {
              this.logger.error(`Erro ao processar queda: ${err.message}`);
              this.logger.error(err);
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `❌ Erro geral no processamento MQTT: ${error.message}`,
        );
        this.logger.error(
          `[MQTT] Tópico: ${topic} | Hex preview: ${hexPreview}`,
        );
      }
    });
  }

  handleConnection(client: Socket) {
    console.log('[WS] Nova conexão:', client.id);
    console.log('[WS] Handshake auth:', client.handshake.auth);

    const companyId = client.handshake.auth?.companyId as string | undefined;

    if (companyId) {
      const room = `company-${companyId}`;
      client.join(room);
      console.log(`[WS] Cliente ${client.id} entrou na sala ${room}`);
    } else {
      console.warn('[WS] Conexão sem companyId – não entrou em sala');
    }
  }

  handleDisconnect(client: Socket) {
    // console.log(`[WS] Cliente desconectado: ${client.id}`);
  }
}
