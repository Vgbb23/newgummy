/**
 * Dev: atende POST /api/pix/charge e GET /api/order/* no próprio Vite (lê .env).
 * Evita 404 quando não há Express na porta 3002 ou quando outro projeto usa a mesma porta.
 */
import type { Connect } from 'vite';
import type { IncomingMessage } from 'http';
import type { Plugin } from 'vite';

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function attachFruitfyMiddleware(middlewares: Connect.Server, env: Record<string, string>) {
  middlewares.use(async (req, res, next) => {
    const pathname = (req.url || '').split('?')[0] || '';
    const token = env.FRUITFY_API_TOKEN;
    const storeId = env.FRUITFY_STORE_ID;
    const productId = env.FRUITFY_PRODUCT_ID;
    const base = (env.FRUITFY_BASE_URL || 'https://api.fruitfy.io').replace(/\/$/, '');

    const sendJson = (code: number, body: unknown) => {
      res.statusCode = code;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
    };

    if (req.method === 'POST' && pathname === '/api/pix/charge') {
      if (!token || !storeId || !productId) {
        sendJson(503, {
          success: false,
          message:
            'Configure FRUITFY_API_TOKEN, FRUITFY_STORE_ID e FRUITFY_PRODUCT_ID no arquivo .env deste projeto (pasta Gummy).',
        });
        return;
      }
      try {
        const raw = await readBody(req as IncomingMessage);
        const payload = JSON.parse(raw || '{}') as Record<string, unknown>;
        const amountInCents = Number(payload.amountInCents);
        const name = String(payload.name || '').trim();
        const email = String(payload.email || '').trim();
        let phone = String(payload.phone || '').replace(/\D/g, '');
        if (phone && !phone.startsWith('55')) phone = `55${phone}`;
        const cpf = String(payload.cpf || '').replace(/\D/g, '');

        if (!name || !email || !phone || !cpf || !Number.isFinite(amountInCents) || amountInCents <= 0) {
          sendJson(422, { success: false, message: 'Dados inválidos para gerar cobrança PIX.' });
          return;
        }

        const requestBody: Record<string, unknown> = {
          name,
          email,
          phone,
          cpf,
          items: [{ id: productId, value: Math.round(amountInCents), quantity: 1 }],
        };
        if (payload.metadata && typeof payload.metadata === 'object') {
          requestBody.metadata = payload.metadata;
        }
        if (payload.utm && typeof payload.utm === 'object') {
          requestBody.utm = payload.utm;
        }

        const fr = await fetch(`${base}/api/pix/charge`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Store-Id': storeId,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Language': 'pt_BR',
          },
          body: JSON.stringify(requestBody),
        });
        const text = await fr.text();
        res.statusCode = fr.status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(text || JSON.stringify({ success: false, message: 'Resposta vazia da Fruitfy.' }));
      } catch (e) {
        console.error('[Gummy dev] POST /api/pix/charge', e);
        sendJson(500, { success: false, message: 'Erro ao falar com a Fruitfy no modo dev.' });
      }
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/api/order/')) {
      const orderId = decodeURIComponent(pathname.replace(/^\/api\/order\//, '').replace(/\/$/, ''));
      if (!orderId) {
        sendJson(400, { success: false, message: 'ID do pedido inválido.' });
        return;
      }
      if (!token || !storeId) {
        sendJson(503, {
          success: false,
          message: 'Configure FRUITFY_API_TOKEN e FRUITFY_STORE_ID no .env.',
        });
        return;
      }
      try {
        const fr = await fetch(`${base}/api/order/${encodeURIComponent(orderId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Store-Id': storeId,
            Accept: 'application/json',
            'Accept-Language': 'pt_BR',
          },
        });
        const text = await fr.text();
        res.statusCode = fr.status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(text || '{}');
      } catch (e) {
        console.error('[Gummy dev] GET /api/order', e);
        sendJson(500, { success: false, message: 'Erro ao consultar pedido.' });
      }
      return;
    }

    next();
  });
}

export function fruitfyDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'gummy-fruitfy-dev',
    enforce: 'pre',
    configureServer(server) {
      attachFruitfyMiddleware(server.middlewares, env);
    },
    configurePreviewServer(server) {
      attachFruitfyMiddleware(server.middlewares, env);
    },
  };
}
