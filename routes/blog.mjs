import { Router } from "express"
import { getArticles, getArticle } from "../lib/blog.mjs"

const router = Router()

router.get("/", async (_req, res) => {
  try {
    const articles = await getArticles()
    res.json({ articles })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get("/:slug", async (req, res) => {
  try {
    const article = await getArticle(req.params.slug)
    if (!article) return res.status(404).json({ error: "Makale bulunamadı" })
    res.json({ article })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router