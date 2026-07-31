import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import morgan from "morgan";
import { promises as fs } from "fs";
import setupSwagger from "./swagger/swagger.mjs";
import apiRouter from "./routes/api.mjs";
import { startScheduler } from "./lib/scheduler.mjs";

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: [
    "https://ucuzasistem.com",
    "https://www.ucuzasistem.com",
    "https://ucuzasistem.up.railway.app",
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};
app.use(cors(corsOptions));

// ─── Serve fresh mock data directly from root ───────────────────────────────
app.get("/mock.json", (req, res) => {
  // Ürün verisi gece güncellenir; istemci + CDN 1 saat cache'ler,
  // arka planda (stale-while-revalidate) taze veri alınır.
  res.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  res.sendFile(path.join(__dirname, "mock.json"));
});
app.get("/cache-meta.json", (req, res) => {
  res.set("Cache-Control", "public, max-age=3600");
  res.sendFile(path.join(__dirname, "cache-meta.json"));
});

// ─── Static (React build) ─────────────────────────────────────────────────────
// Hashed asset'ler (/assets/*) içerik değiştiğinde yeni hash alır → immutable.
// index.html her build'de değiştiği için kısa TTL (no-cache gibi davranır).
// Diğer statikler (logo, font) için makul TTL.
const oneYear = 60 * 60 * 24 * 365;
const oneHour = 60 * 60;
app.use(
  express.static(path.join(__dirname, "client", "dist"), {
    etag: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache");
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", `public, max-age=${oneYear}, immutable`);
      } else if (filePath.includes(`${path.sep}logos${path.sep}`) || filePath.includes(`${path.sep}fonts${path.sep}`)) {
        res.setHeader("Cache-Control", `public, max-age=${oneHour * 24}, stale-while-revalidate=${oneYear}`);
      } else {
        // sitemap.xml, og-image.png, favicon vb.
        res.setHeader("Cache-Control", `public, max-age=${oneHour}`);
      }
    },
  })
);

// ─── Status endpoint ─────────────────────────────────────────────────────────
app.get("/api/status", async (req, res) => {
  try {
    const metaPath = path.join(__dirname, "cache-meta.json");
    let meta = {};
    try {
      meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
    } catch {
      // meta file may not exist yet
    }

    res.json({
      status: "ok",
      uptime: process.uptime(),
      lastUpdated: meta.lastUpdated ?? null,
      totalProducts: meta.totalProducts ?? null,
      durationMs: meta.durationMs ?? null,
      env: process.env.NODE_ENV ?? "development",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SPA routes ───────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "client", "dist", "index.html")));
app.get("/anasayfa", (req, res) => res.sendFile(path.join(__dirname, "client", "dist", "index.html")));

// ─── API routes ───────────────────────────────────────────────────────────────
app.use("/api", apiRouter);

// ─── Swagger ─────────────────────────────────────────────────────────────────
setupSwagger(app);

// ─── 404 fallback → serve React ───────────────────────────────────────────────
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, "client", "dist", "index.html")));

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
  startScheduler();
});
