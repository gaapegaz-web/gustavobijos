/** Leitura centralizada das variáveis de ambiente (process.env no runtime Node). */
const e = (k: string, d = '') => (process.env[k] ?? import.meta.env?.[k] ?? d) as string;

export const ENV = {
  get DB_PATH() { return e('DB_PATH', '/srv/tecnoapis/data/app.db'); },
  get META_PIXEL_ID() { return e('META_PIXEL_ID'); },
  get META_CAPI_TOKEN() { return e('META_CAPI_TOKEN'); },
  get META_TEST_EVENT_CODE() { return e('META_TEST_EVENT_CODE'); },
  get HUBLA_WEBHOOK_TOKEN() { return e('HUBLA_WEBHOOK_TOKEN'); },
  get HUBLA_CHECKOUT_URL() { return e('HUBLA_CHECKOUT_URL', '#checkout-nao-configurado'); },
  get WHATSAPP_GRUPO_URL() { return e('WHATSAPP_GRUPO_URL', '#grupo-nao-configurado'); },
  get ADMIN_USER() { return e('ADMIN_USER', 'admin'); },
  get ADMIN_PASS() { return e('ADMIN_PASS'); },
  get ALLOW_TIME_TRAVEL() { return e('ALLOW_TIME_TRAVEL', '0') === '1' || import.meta.env.DEV; },
};
