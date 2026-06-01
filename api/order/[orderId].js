/**
 * Vercel: GET /api/order/:orderId — proxy Fruitfy (igual netlify fruitfy-order-status / Verisol).
 */
const DEFAULT_BASE_URL = 'https://api.fruitfy.io';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

function setCors(res) {
  for (const [k, v] of Object.entries(corsHeaders)) {
    res.setHeader(k, v);
  }
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const TOKEN = process.env.FRUITFY_API_TOKEN;
  const STORE_ID = process.env.FRUITFY_STORE_ID;

  if (!TOKEN || !STORE_ID) {
    return res.status(500).json({
      success: false,
      message: 'Configuração Fruitfy incompleta (FRUITFY_API_TOKEN, FRUITFY_STORE_ID).',
    });
  }

  const orderId = String(req.query?.orderId || '').trim();
  if (!orderId) {
    return res.status(400).json({ success: false, message: 'ID do pedido inválido.' });
  }

  try {
    const baseUrl = process.env.FRUITFY_BASE_URL || DEFAULT_BASE_URL;
    const fruitfyResponse = await fetch(`${baseUrl}/api/order/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Store-Id': STORE_ID,
        Accept: 'application/json',
        'Accept-Language': 'pt_BR',
      },
    });

    const text = await fruitfyResponse.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { message: text };
    }
    return res.status(fruitfyResponse.status).json(parsed);
  } catch (err) {
    console.error('fruitfy-order:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao consultar pedido.',
    });
  }
}
