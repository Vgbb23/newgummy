/**
 * Vercel: POST /api/pix/charge — igual netlify/functions/fruitfy-pix-charge.js
 */
const DEFAULT_BASE_URL = 'https://api.fruitfy.io';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

function setCors(res) {
  for (const [k, v] of Object.entries(corsHeaders)) {
    res.setHeader(k, v);
  }
}

const getMissingEnv = () => {
  const required = ['FRUITFY_API_TOKEN', 'FRUITFY_STORE_ID', 'FRUITFY_PRODUCT_ID'];
  return required.filter((key) => !process.env[key]);
};

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const missing = getMissingEnv();
  if (missing.length) {
    return res.status(500).json({
      success: false,
      message: `Variáveis não configuradas na Vercel: ${missing.join(', ')}`,
    });
  }

  try {
    const payload = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const amountInCents = Number(payload.amountInCents);
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim();
    let phone = String(payload.phone || '').replace(/\D/g, '');
    if (phone && !phone.startsWith('55')) {
      phone = `55${phone}`;
    }
    const cpf = String(payload.cpf || '').replace(/\D/g, '');

    if (!name || !email || !phone || !cpf || !Number.isFinite(amountInCents) || amountInCents <= 0) {
      return res.status(422).json({
        success: false,
        message: 'Dados inválidos para gerar cobrança PIX.',
      });
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

    if (payload.metadata && typeof payload.metadata === 'object') {
      requestBody.metadata = payload.metadata;
    }
    if (payload.utm && typeof payload.utm === 'object') {
      requestBody.utm = payload.utm;
    }

    const baseUrl = process.env.FRUITFY_BASE_URL || DEFAULT_BASE_URL;
    const fruitfyResponse = await fetch(`${baseUrl}/api/pix/charge`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FRUITFY_API_TOKEN || ''}`,
        'Store-Id': process.env.FRUITFY_STORE_ID || '',
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Language': 'pt_BR',
      },
      body: JSON.stringify(requestBody),
    });

    const text = await fruitfyResponse.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { message: text };
    }
    return res.status(fruitfyResponse.status).json(parsed);
  } catch (error) {
    console.error('fruitfy-pix-charge:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao criar cobrança PIX.',
      error: error instanceof Error ? error.message : 'unknown_error',
    });
  }
}
