const mqtt = require('mqtt');

// Configurações
const BROKER = 'mqtt://broker.emqx.io';
const TOPIC_HR = 'embarca/batimentos';
const TOPIC_FALL = 'embarca/quedas';
const DEVICE_ID = 'SENSOR-PATIENT-001';

console.log('🔌 Conectando ao Broker MQTT...');
const client = mqtt.connect(BROKER);

client.on('connect', async () => {
    console.log('✅ Simulador Conectado!');
    await runFullTest();
});

async function runFullTest() {
    // --- TESTE 1: MONITORAMENTO NORMAL (Testa WebSocket + Buffer de 10) ---
    console.log('\n--- 🏥 FASE 1: Enviando 12 leituras normais (Deve salvar 1 média no banco) ---');
    for (let i = 0; i < 12; i++) {
        const payload = JSON.stringify({
            deviceId: DEVICE_ID,
            bpm: 75 + Math.random() * 5, // Varia entre 75 e 80
            spo2: 98 + Math.random() * 1
        });
        client.publish(TOPIC_HR, payload);
        process.stdout.write('.'); // Efeito visual
        await sleep(200); // Envia rápido
    }
    console.log('\n(Verifique se apareceu no Dashboard do Frontend)');

    // --- TESTE 2: ALERTA CLÍNICO (Testa Telegram) ---
    console.log('\n--- 💓 FASE 2: Simulando Taquicardia (Deve apitar no Telegram) ---');
    await sleep(2000);
    const criticalPayload = JSON.stringify({
        deviceId: DEVICE_ID,
        bpm: 145, // Crítico!
        spo2: 96
    });
    client.publish(TOPIC_HR, criticalPayload);
    console.log('⚡ Enviado BPM 145 (Verifique o Telegram)');

    // --- TESTE 3: DETECÇÃO DE QUEDA (Testa Alerta Vermelho no Front) ---
    console.log('\n--- 🚨 FASE 3: Simulando Queda Confirmada ---');
    await sleep(3000);
    const fallPayload = JSON.stringify({
        deviceId: DEVICE_ID,
        status: "QUEDA_CONFIRMADA",
        g: 3.5
    });
    client.publish(TOPIC_FALL, fallPayload);
    console.log('⚡ Enviado evento de Queda (Verifique o Frontend)');

    // --- FIM ---
    console.log('\n✅ Teste de envio finalizado. Pressione Ctrl+C para sair.');
    // Não fechamos o cliente para garantir que a mensagem saia
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}