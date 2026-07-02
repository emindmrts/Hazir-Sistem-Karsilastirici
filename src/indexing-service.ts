import { Express } from 'express';
import cron from 'node-cron';
import fetch from 'node-fetch';
import fs from 'fs';
import crypto from 'crypto';

const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account-key.json';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
}

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

// İndexlenmesi gereken URL'leri saklayacağımız array (Production'da DB kullanın)
let pendingUrls: Set<string> = new Set();

/**
 * Google OAuth 2.0 token alma fonksiyonu
 */
async function getGoogleAccessToken(): Promise<string> {
  try {
    const credentials: ServiceAccountKey = JSON.parse(
      fs.readFileSync(CREDENTIALS_PATH, 'utf-8')
    );

    const jwt = createJWT(credentials);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.statusText}`);
    }

    const data = (await response.json()) as GoogleTokenResponse;
    return data.access_token;
  } catch (error) {
    throw new Error(`Failed to get Google access token: ${error}`);
  }
}

/**
 * JWT token oluştur (Service Account kullanarak)
 */
function createJWT(credentials: ServiceAccountKey): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: credentials.private_key_id,
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // RS256 imzası
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signatureInput)
    .sign(credentials.private_key);

  const encodedSignature = Buffer.from(signature).toString('base64url');

  return `${signatureInput}.${encodedSignature}`;
}

/**
 * URL'yi Google Indexing API'ye submit et
 */
export async function submitUrlToGoogle(
  url: string,
  type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'
): Promise<boolean> {
  try {
    const accessToken = await getGoogleAccessToken();

    const response = await fetch(
      'https://indexing.googleapis.com/v3/urlNotifications:publish',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          type,
        }),
      }
    );

    if (response.ok) {
      console.log(`✅ URL indexed: ${url}`);
      pendingUrls.delete(url); // Başarılıysa listeden sil
      return true;
    } else {
      const errorText = await response.text();
      console.error(`❌ Google indexing failed for ${url}:`, errorText);
      return false;
    }
  } catch (error) {
    console.error(`Error submitting URL to Google: ${error}`);
    return false;
  }
}

/**
 * Bekleme fonksiyonu (rate limiting için)
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scheduled job: Her gün 200 URL'yi Google'a submit et
 */
export function startIndexingScheduler(): void {
  // Her gün saat 02:00'de çalış (sunucu zamanına göre)
  cron.schedule('0 2 * * *', async () => {
    console.log('🚀 Google Indexing Scheduler başladı...');

    const urlsToSubmit = Array.from(pendingUrls).slice(0, 200);

    if (urlsToSubmit.length === 0) {
      console.log('📭 Indexlenmesi gereken URL yok');
      return;
    }

    console.log(`📤 ${urlsToSubmit.length} URL Google'a gönderiliyor...`);

    for (let i = 0; i < urlsToSubmit.length; i++) {
      const url = urlsToSubmit[i];
      await submitUrlToGoogle(url, 'URL_UPDATED');

      // Rate limiting: 10ms arası ile gönder
      if (i < urlsToSubmit.length - 1) {
        await delay(10);
      }
    }

    console.log(`✅ Batch tamamlandı. Kalan: ${pendingUrls.size}`);
  });

  console.log('📅 Google Indexing Scheduler aktif (Her gün 02:00)');
}

/**
 * Pending URL'lere yeni URL ekle
 */
export function addUrlToIndexQueue(url: string): void {
  if (url) {
    pendingUrls.add(url);
    console.log(`➕ URL kuyruğa eklendi: ${url} (Toplam: ${pendingUrls.size})`);
  }
}

/**
 * Tüm pending URL'leri getir
 */
export function getPendingUrls(): string[] {
  return Array.from(pendingUrls);
}

/**
 * Express setup
 */
export function setupIndexingRoutes(app: Express): void {
  // URL'yi kuyruğa ekle (manual trigger)
  app.post('/api/indexing/queue', (req, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      try {
        new URL(url);
      } catch {
        res.status(400).json({ error: 'Invalid URL format' });
        return;
      }

      addUrlToIndexQueue(url);

      res.json({
        success: true,
        message: 'URL queued for indexing',
        pending: pendingUrls.size,
        url,
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Pending URL'leri listele
  app.get('/api/indexing/pending', (req, res) => {
    res.json({
      total: pendingUrls.size,
      urls: Array.from(pendingUrls).slice(0, 50), // İlk 50'yi göster
    });
  });

  // Immediate submit (dev/test için)
  app.post('/api/indexing/submit-now', async (req, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      const success = await submitUrlToGoogle(url, 'URL_UPDATED');

      res.status(success ? 200 : 500).json({
        success,
        message: success ? 'URL submitted immediately' : 'Failed to submit',
        url,
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });
}
