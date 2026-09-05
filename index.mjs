import "dotenv/config"; // ilk import olmali: config.mjs env'i okumadan .env yuklenir
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
import { loadCatalog, findBySlug } from "./lib/productIndex.mjs";
import { isSocialBot, botHtml } from "./lib/botMeta.mjs";

const app = express();
app.disable("x-powered-by");
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
    "https://pckarsilastir.com",
    "https://www.pckarsilastir.com",
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};
app.use(cors(corsOptions));

// ─── Serve fresh mock data directly from root ───────────────────────────────
// mock.json / cache-meta.json are gitignored and only exist after a scrape
// run — return JSON 404 instead of falling through to the SPA fallback
// (which would serve index.html and break fetch().json() on the client).
app.get("/mock.json", async (req, res) => {
  try {
    await fs.access(path.join(__dirname, "mock.json"));
    res.sendFile(path.join(__dirname, "mock.json"));
  } catch {
    res.status(404).json({ error: "mock.json not generated yet — run the scrapers first." });
  }
});
app.get("/cache-meta.json", async (req, res) => {
  try {
    await fs.access(path.join(__dirname, "cache-meta.json"));
    res.sendFile(path.join(__dirname, "cache-meta.json"));
  } catch {
    res.status(404).json({ error: "cache-meta.json not generated yet — run the scrapers first." });
  }
});

// ─── Static (React build) ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "client", "dist")));

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
app.get("/karsilastir", (req, res) => res.sendFile(path.join(__dirname, "client", "dist", "index.html")));

// Detay sayfaları: slug katalogda varsa 200 + SPA, yoksa 404'e düş.
// (Hepsini körü körüne 404 dönmek, sitemap'teki 2661 URL'yi index dışı bırakır.)
// Sosyal crawler'lar (WhatsApp/Twitter/...) JS çalıştırmadığı için onlara
// sunucuda üretilmiş OG kabuğu verilir; arama motorları JS'i render eder.
app.get("/sistem/:slug", async (req, res, next) => {
  try {
    const products = await loadCatalog();
    const product = findBySlug(products, req.params.slug);
    if (!product) return next();
    if (isSocialBot(req.get("user-agent"))) {
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(botHtml(product));
    }
    res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
  } catch {
    next();
  }
});

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
