import axios, { AxiosError } from 'axios';

const whatsappApiUrl = 'https://graph.facebook.com/v22.0';
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

export async function enviarWhatsApp(mensagem: string, toPhoneNumber: string) {
  try {
    if (!phoneNumberId || !accessToken || !toPhoneNumber) {
      console.error('Variáveis de ambiente ou telefone não configurados');
      return false;
    }

    const response = await axios.post(
      `${whatsappApiUrl}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toPhoneNumber,
        type: 'text',
        text: { body: mensagem },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Mensagem enviada via WhatsApp:', response.data);
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Erro WhatsApp API:', error.response?.data || error.message);
    } else {
      console.error('Erro desconhecido ao enviar WhatsApp:', error);
    }
    return false;
  }
}
