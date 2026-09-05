// config.mjs — database configuration.
//
// Secret'lar SADECE environment'dan okunur (asla repoya commitleme):
//   - Uretimde (Railway): dashboard environment variables.
//   - Lokal: .env dosyasi (.env.example'i kopyala). index.mjs dotenv ile yukler.
//
// Eksikse filter-data rotalari 503 doner, sunucu ayakta kalir.

const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
const missing = required.filter((k) => !process.env[k]);

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
};

export const isDbConfigured = missing.length === 0;

if (!isDbConfigured) {
  console.warn(`[config] Database not configured — missing env: ${missing.join(", ")}`);
}

export default dbConfig;
