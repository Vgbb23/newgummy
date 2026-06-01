/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FRUITFY_BASE_URL?: string;
  readonly VITE_FRUITFY_API_TOKEN?: string;
  readonly VITE_FRUITFY_STORE_ID?: string;
  readonly VITE_FRUITFY_PRODUCT_ID?: string;
  /** URL após PIX pago (igual Verisol). Padrão no código: rastreiogummy. */
  readonly VITE_POST_PAYMENT_REDIRECT_URL?: string;
  /** Domínio da API em produção (opcional). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
