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
    "http://localhost:3000",
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};
app.use(cors(corsOptions));

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
