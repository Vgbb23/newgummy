const DEFAULT_BASE_URL = 'https://api.fruitfy.io';

const buildHeaders = () => ({
  Authorization: `Bearer ${process.env.FRUITFY_API_TOKEN || ''}`,
  'Store-Id': process.env.FRUITFY_STORE_ID || '',
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'Accept-Language': 'pt_BR',
});

const getMissingEnv = () => {
  const required = ['FRUITFY_API_TOKEN', 'FRUITFY_STORE_ID', 'FRUITFY_PRODUCT_ID'];
  return required.filter((key) => !process.env[key]);
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
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

  try {
    const payload = JSON.parse(event.body || '{}');
    const amountInCents = Number(payload.amountInCents);
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim();
    let phone = String(payload.phone || '').replace(/\D/g, '');
    if (phone && !phone.startsWith('55')) {
      phone = `55${phone}`;
    }
    const cpf = String(payload.cpf || '').replace(/\D/g, '');

    if (!name || !email || !phone || !cpf || !Number.isFinite(amountInCents) || amountInCents <= 0) {
      return {
        statusCode: 422,
        body: JSON.stringify({
          success: false,
          message: 'Dados inválidos para gerar cobrança PIX.',
        }),
      };
    }

    const requestBody = {
      name,
      email,
      phone,
      cpf,
      items: [
        {
          id: process.env.FRUITFY_PRODUCT_ID,
          value: Math.round(amountInCents),
          quantity: 1,
        },
      ],
    };

    /** Metadados internos (UI) — separados do objeto `utm` exigido pela Fruitfy. */
    if (payload.metadata && typeof payload.metadata === 'object') {
      requestBody.metadata = payload.metadata;
    }

    /**
     * Fruitfy: campo opcional `utm` em /api/pix/charge (não usar só metadata para UTMs).
     * @see https://api.fruitfy.io — Documentação PIX charge
     */
    if (payload.utm && typeof payload.utm === 'object') {
      requestBody.utm = payload.utm;
    }

    const baseUrl = process.env.FRUITFY_BASE_URL || DEFAULT_BASE_URL;
    const fruitfyResponse = await fetch(`${baseUrl}/api/pix/charge`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(requestBody),
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
        message: 'Erro interno ao criar cobrança PIX.',
        error: error instanceof Error ? error.message : 'unknown_error',
      }),
    };
  }
};
