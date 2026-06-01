const DEFAULT_BASE_URL = 'https://api.fruitfy.io';

const buildHeaders = () => ({
  Authorization: `Bearer ${process.env.FRUITFY_API_TOKEN || ''}`,
  'Store-Id': process.env.FRUITFY_STORE_ID || '',
  Accept: 'application/json',
  'Accept-Language': 'pt_BR',
});

const getMissingEnv = () => {
  const required = ['FRUITFY_API_TOKEN', 'FRUITFY_STORE_ID'];
  return required.filter((key) => !process.env[key]);
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, message: 'Method Not Allowed' }),
    };
  }

  const missing = getMissingEnv();
  if (missing.length) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: `Variáveis não configuradas no Netlify: ${missing.join(', ')}`,
      }),
    };
  }

  const orderId = String(event.queryStringParameters?.order || '').trim();
  if (!orderId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, message: 'Parâmetro order é obrigatório.' }),
    };
  }

  try {
    const baseUrl = process.env.FRUITFY_BASE_URL || DEFAULT_BASE_URL;
    const fruitfyResponse = await fetch(`${baseUrl}/api/order/${orderId}`, {
      method: 'GET',
      headers: buildHeaders(),
    });

    const text = await fruitfyResponse.text();
    return {
      statusCode: fruitfyResponse.status,
      headers: { 'Content-Type': 'application/json' },
      body: text || JSON.stringify({ success: false, message: 'Resposta vazia da Fruitfy.' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Erro interno ao consultar status do pedido.',
        error: error instanceof Error ? error.message : 'unknown_error',
      }),
    };
  }
};
