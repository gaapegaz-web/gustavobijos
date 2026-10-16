/** Leitura centralizada das variáveis de ambiente (process.env no runtime Node). */
const e = (k: string, d = '') => (process.env[k] ?? import.meta.env?.[k] ?? d) as string;

export const ENV = {
  get DB_PATH() { return e('DB_PATH', '/srv/tecnoapis/data/app.db'); },
  /** Imagens enviadas pelo /admin (capas e fotos dos conteúdos), servidas em /uploads/*. Fora do app: sobrevivem ao deploy. */
  get UPLOADS_DIR() { return e('UPLOADS_DIR', '/srv/tecnoapis/uploads'); },
  get META_PIXEL_ID() { return e('META_PIXEL_ID'); },
  get META_CAPI_TOKEN() { return e('META_CAPI_TOKEN'); },
  get META_TEST_EVENT_CODE() { return e('META_TEST_EVENT_CODE'); },
  get HUBLA_WEBHOOK_TOKEN() { return e('HUBLA_WEBHOOK_TOKEN'); },
  get HUBLA_CHECKOUT_URL() { return e('HUBLA_CHECKOUT_URL', '#checkout-nao-configurado'); },
  /** Checkout da Assinatura Anual (página /tecnoapis, R$ 697). Vazio = botão de compra vai para o WhatsApp. */
  get HUBLA_CHECKOUT_CLUBE_URL() { return e('HUBLA_CHECKOUT_CLUBE_URL', ''); },
  get WHATSAPP_GRUPO_URL() { return e('WHATSAPP_GRUPO_URL', '#grupo-nao-configurado'); },
  get WHATSAPP_SUPORTE_URL() { return e('WHATSAPP_SUPORTE_URL', ''); },
  get ADMIN_USER() { return e('ADMIN_USER', 'admin'); },
  get ADMIN_PASS() { return e('ADMIN_PASS'); },
  /** Redirect temporário da raiz para uma campanha (ex.: /black). Vazio = a home aparece. */
  get REDIRECT_RAIZ() { return e('REDIRECT_RAIZ', ''); },
  /** Chave do IndexNow (avisa o Bing quando um conteúdo muda). Vazio = desligado. */
  get INDEXNOW_KEY() { return e('INDEXNOW_KEY', ''); },
};
