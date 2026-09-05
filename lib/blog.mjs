/**
 * blog.mjs — content/blog/*.md dosyalarından makale yükleme.
 *
 * Her makale düz frontmatter bloğuyla başlar:
 *
 *   ---
 *   title: ...
 *   slug: ...
 *   date: 2026-09-05
 *   description: ...
 *   tags: rehber, fiyat, takip
 *   ---
 *
 * Listeleme (getArticles) frontmatter'ı döndürür; getArticle(slug) ayrıca
 * işlenmemiş markdown gövdesini (client tarafı "marked" ile render eder).
 * Cache, dosyaların mtime toplamı üzerinden invalidate edilir (düşük maliyetli).
 */

import { promises as fs } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const BLOG_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "content", "blog")
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

let cache = { fingerprint: "", articles: [] }

function fileFingerprint(entries) {
  return entries.map((e) => `${e.name}:${e.mtimeMs}`).join("|")
}

function parseFrontmatter(raw) {
  const out = {}
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf(":")
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "")
    if (key) out[key] = value
  }
  return out
}

function parseFile(raw, filename) {
  const m = FM_RE.exec(raw)
  if (!m) return null
  const meta = parseFrontmatter(m[1])
  const body = raw.slice(m[0].length).trim()

  if (!meta.title || !meta.slug || !meta.date) return null
  const date = new Date(meta.date)
  if (Number.isNaN(date.getTime())) return null

  const wordCount = body.split(/\s+/).filter(Boolean).length
  const tags = (meta.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

  return {
    title: meta.title,
    slug: meta.slug,
    date: meta.date,
    description: meta.description || "",
    tags,
    image: meta.image || null,
    readingMinutes: Math.max(1, Math.round(wordCount / 180)),
    source: filename,
  }
}

export async function getArticles() {
  let entries
  try {
    entries = await fs.readdir(BLOG_DIR, { withFileTypes: true })
  } catch {
    return []
  }
  const md = entries.filter((e) => e.isFile() && e.name.endsWith(".md"))
  if (md.length === 0) return []

  const stats = await Promise.all(
    md.map((e) =>
      fs.stat(path.join(BLOG_DIR, e.name)).catch(() => null),
    ),
  )
  const fingerprint = fileFingerprint(
    md.map((e, i) => ({ name: e.name, mtimeMs: stats[i]?.mtimeMs ?? 0 })),
  )

  if (fingerprint === cache.fingerprint) return cache.articles

  const articles = []
  for (let i = 0; i < md.length; i++) {
    try {
      const raw = await fs.readFile(path.join(BLOG_DIR, md[i].name), "utf-8")
      const parsed = parseFile(raw, md[i].name)
      if (parsed) articles.push(parsed)
    } catch {
      // tek bozuk dosya tüm blogu düşürmesin
    }
  }

  articles.sort((a, b) => (a.date < b.date ? 1 : -1))
  cache = { fingerprint, articles }
  return articles
}

export async function getArticle(slug) {
  const articles = await getArticles()
  const article = articles.find((a) => a.slug === slug)
  if (!article) return null

  try {
    const raw = await fs.readFile(path.join(BLOG_DIR, article.source), "utf-8")
    const m = FM_RE.exec(raw)
    const { source, ...meta } = article
    return { ...meta, content: m ? raw.slice(m[0].length).trim() : raw.trim() }
  } catch {
    return null
  }
}