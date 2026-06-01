/**
 * API local (dev): mesmas rotas que Netlify / Vercel — proxy Fruitfy com credenciais no servidor.
 * Porta padrão 3002 (evita conflito com Verisol na 3001). Vite faz proxy de /api para cá.
 */
import 'dotenv/config';
import cors from 'cors';
import express from 'express';

const FRUITFY_BASE = process.env.FRUITFY_BASE_URL || 'https://api.fruitfy.io';
const TOKEN = process.env.FRUITFY_API_TOKEN;
const STORE_ID = process.env.FRUITFY_STORE_ID;
const PRODUCT_ID = process.env.FRUITFY_PRODUCT_ID;

const app = express();
app.use(cors());
app.use(express.json());

function buildPixHeaders() {
  return {
    Authorization: `Bearer ${TOKEN || ''}`,
    'Store-Id': STORE_ID || '',
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Language': 'pt_BR',
  };
}

app.post('/api/pix/charge', async (req, res) => {
  if (!TOKEN || !STORE_ID || !PRODUCT_ID) {
    return res.status(500).json({
      success: false,
      message: 'Configure FRUITFY_API_TOKEN, FRUITFY_STORE_ID e FRUITFY_PRODUCT_ID no .env',
    });
  }

  try {
    const payload = req.body ?? {};
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

    const requestBody: Record<string, unknown> = {
      name,
      email,
      phone,
      cpf,
      items: [
        {
          id: PRODUCT_ID,
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

    const fruitfyResponse = await fetch(`${FRUITFY_BASE}/api/pix/charge`, {
      method: 'POST',
      headers: buildPixHeaders(),
      body: JSON.stringify(requestBody),
    });

    const text = await fruitfyResponse.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { message: text };
    }
    return res.status(fruitfyResponse.status).json(parsed);
  } catch (err) {
    console.error('[API] POST /api/pix/charge', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao criar cobrança PIX.',
    });
  }
});

app.get('/api/order/:orderId', async (req, res) => {
  if (!TOKEN || !STORE_ID) {
    return res.status(500).json({
      success: false,
      message: 'Configure FRUITFY_API_TOKEN e FRUITFY_STORE_ID no .env',
    });
  }

  const orderId = String(req.params.orderId || '').trim();
  if (!orderId) {
    return res.status(400).json({ success: false, message: 'ID do pedido inválido.' });
  }

  try {
    const fruitfyResponse = await fetch(`${FRUITFY_BASE}/api/order/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Store-Id': STORE_ID,
        Accept: 'application/json',
        'Accept-Language': 'pt_BR',
      },
    });

    const text = await fruitfyResponse.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { message: text };
    }
    return res.status(fruitfyResponse.status).json(parsed);
  } catch (err) {
    console.error('[API] GET /api/order/:orderId', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao consultar pedido.',
    });
  }
});

const PORT = Number(process.env.GUMMY_API_PORT || process.env.PORT) || 3002;
app.listen(PORT, () => {
  console.log(`[Gummy API] http://localhost:${PORT} — rotas POST /api/pix/charge e GET /api/order/:id`);
});
