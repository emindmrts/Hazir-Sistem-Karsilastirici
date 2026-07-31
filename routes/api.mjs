import { Router } from "express";
import getCPUs from "../filter-data/cpus.mjs";
import getGPUs from "../filter-data/gpus.mjs";
import getProductsRouter from "./getProducts.mjs";

const router = Router();

router.use("/cpu", getCPUs);
router.use("/gpu", getGPUs);
router.use("/getProducts", getProductsRouter);

// Sitemap ping — notifies Google/Bing of sitemap updates
// GET /api/sitemap-ping triggers ping to search engines
router.get("/sitemap-ping", async (req, res) => {
  const sitemapUrl = encodeURIComponent("https://www.pckarsilastir.com/sitemap.xml");
  const results = {};

  // Ping Google
  try {
    const googleResp = await fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`);
    results.google = { status: googleResp.status, ok: googleResp.ok };
  } catch (err) {
    results.google = { error: err.message };
  }

  // Ping Bing
  try {
    const bingResp = await fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`);
    results.bing = { status: bingResp.status, ok: bingResp.ok };
  } catch (err) {
    results.bing = { error: err.message };
  }

  res.json({ sitemap: "https://www.pckarsilastir.com/sitemap.xml", results });
});

export default router;
