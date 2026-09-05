import { useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import { marked, type MarkedExtension, type Tokens } from "marked"
import { SEO } from "@/components/seo"
import { useBlogArticle, useBlogList } from "@/hooks/use-blog"
import type { BlogArticleMeta } from "@/lib/api"

function formatDate(date: string) {
    try {
        return new Date(date).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })
    } catch {
        return date
    }
}

marked.setOptions({ gfm: true, breaks: true })

interface TocItem { id: string; text: string; depth: number }

const TR_MAP: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
}

function slugifyId(text: string) {
    return text
        .toLowerCase()
        .split("")
        .map((c) => TR_MAP[c] ?? c)
        .join("")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
}

function renderArticle(content: string): { html: string; toc: TocItem[] } {
    const toc: TocItem[] = []
    const seen = new Map<string, number>()

    const ext: MarkedExtension = {
        renderer: {
            heading({ depth, text }: Tokens.Heading) {
                const clean = (text ?? "").trim()
                const base = slugifyId(clean) || "bolum"
                const n = seen.get(base) ?? 0
                seen.set(base, n + 1)
                const id = n === 0 ? base : `${base}-${n}`
                toc.push({ id, text: clean, depth })
                return `<h${depth} id="${id}"><a href="#${id}" class="blog-anchor" aria-label="${clean}">#</a><span>${clean}</span></h${depth}>`
            },
            link({ href, text, title }: Tokens.Link) {
                let target = typeof href === "string" ? href : ""
                if (/^(javascript|data|vbscript):/i.test(target)) target = "#"
                const isExt = /^https?:/i.test(target)
                const extra = isExt ? ' target="_blank" rel="noopener noreferrer"' : ""
                const t = title ? ` title="${title}"` : ""
                return `<a href="${target}"${t}${extra}>${text}</a>`
            },
        },
    }

    marked.use(ext)
    return { html: marked.parse(content, { async: false }) as string, toc }
}

function ArticleLink({ article, title, arrow, align }: { article: BlogArticleMeta; title: string; arrow: "left" | "right"; align: "start" | "end" }) {
    return (
        <Link
            href={`/blog/${article.slug}`}
            className={`group flex flex-col gap-1 rounded-[8px] border-[1px] border-[var(--b-smoke)] bg-[var(--b-carbon)] p-4 transition-colors hover:bg-[var(--b-graphite)] ${
                align === "end" ? "items-end text-right" : "items-start"
            }`}
        >
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-[510] text-[var(--b-fog)] tracking-wide uppercase ${
                align === "end" ? "flex-row-reverse" : ""
            }`}>
                {arrow === "left" && (
                    <span className="transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true">←</span>
                )}
                {title}
                {arrow === "right" && (
                    <span className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">→</span>
                )}
            </span>
            <span className="text-[15px] font-[510] text-[var(--b-snow)] leading-snug line-clamp-2 group-hover:text-[var(--b-mist)] transition-colors">
                {article.title}
            </span>
            <span className="text-[13px] text-[var(--b-steel)]">
                {formatDate(article.date)}
            </span>
        </Link>
    )
}

export function BlogArticlePage({ slug }: { slug: string }) {
    const { article, loading, notFound, error } = useBlogArticle(slug ?? "")
    const { articles } = useBlogList()
    const [progress, setProgress] = useState(0)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const { html, toc } = useMemo(
        () => (article ? renderArticle(article.content) : { html: "", toc: [] }),
        [article]
    )

    useEffect(() => {
        if (!article) return
        let raf = 0
        const onScroll = () => {
            cancelAnimationFrame(raf)
            raf = requestAnimationFrame(() => {
                const doc = document.documentElement
                const total = doc.scrollHeight - doc.clientHeight
                setProgress(total > 0 ? Math.min(1, doc.scrollTop / total) : 0)
                let current: string | null = null
                for (const t of toc) {
                    const el = document.getElementById(t.id)
                    if (el && el.getBoundingClientRect().top <= 150) current = t.id
                }
                setActiveId(current)
            })
        }
        onScroll()
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onScroll)
        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", onScroll)
        }
    }, [article, toc])

    if (loading) {
        return (
            <div className="blog-surface min-h-screen flex items-center justify-center">
                <p className="text-[13px] text-[var(--b-fog)]">Yükleniyor…</p>
            </div>
        )
    }

    if (notFound || !article) {
        return (
            <div className="blog-surface min-h-screen flex items-center justify-center flex-col gap-5 text-center px-4">
                <p className="text-[48px] font-[510] tracking-[-0.02em] text-[var(--b-iron)]">404</p>
                <p className="text-[17px] font-[510] text-[var(--b-mist)]">Yazı bulunamadı.</p>
                <button
                    type="button"
                    onClick={() => (window.location.href = "/blog")}
                    className="rounded-[9999px] border-[1px] border-[var(--b-snow)] bg-transparent text-[var(--b-snow)] text-[14px] font-[510] px-4 py-2 transition-colors hover:bg-[var(--b-snow)] hover:text-[var(--b-canvas)]"
                >
                    Blog'a dön
                </button>
            </div>
        )
    }

    if (error) {
        return (
            <div className="blog-surface min-h-screen flex items-center justify-center flex-col gap-5 text-center px-4">
                <p className="text-[17px] font-[510] text-[var(--b-fog)]">Yazı yüklenemedi.</p>
                <p className="text-[14px] text-[var(--b-steel)]">{error}</p>
                <button
                    type="button"
                    onClick={() => (window.location.href = "/blog")}
                    className="rounded-[9999px] border-[1px] border-[var(--b-snow)] bg-transparent text-[var(--b-snow)] text-[14px] font-[510] px-4 py-2 transition-colors hover:bg-[var(--b-snow)] hover:text-[var(--b-canvas)]"
                >
                    Blog'a dön
                </button>
            </div>
        )
    }

    const shareUrl = `https://www.pckarsilastir.com/blog/${article.slug}`
    const shareText = `${article.title} — PcKarşılaştır.com`
    const encoded = (s: string) => encodeURIComponent(s)

    const idx = articles.findIndex((a) => a.slug === article.slug)
    const newer = idx > 0 ? articles[idx - 1] : null
    const older = idx >= 0 && idx < articles.length - 1 ? articles[idx + 1] : null

    const related = articles
        .filter((a) => a.slug !== article.slug)
        .map((a) => ({ a, score: a.tags.filter((t) => article.tags.includes(t)).length }))
        .sort((x, y) => y.score - x.score)
        .slice(0, 2)
        .map((r) => r.a)

    const articleJsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": article.title,
            "description": article.description,
            "datePublished": article.date,
            "inLanguage": "tr-TR",
            "url": shareUrl,
            "image": article.image ?? "https://www.pckarsilastir.com/og-image.png",
            "author": { "@type": "Organization", "name": "PcKarşılaştır.com" },
            "publisher": {
                "@type": "Organization",
                "name": "PcKarşılaştır.com",
                "logo": { "@type": "ImageObject", "url": "https://www.pckarsilastir.com/og-image.png" },
            },
            "mainEntityOfPage": shareUrl,
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Blog", "item": "https://www.pckarsilastir.com/blog" },
                { "@type": "ListItem", "position": 2, "name": article.title, "item": shareUrl },
            ],
        },
    ]

    return (
        <div className="blog-surface max-w-[860px] w-full mx-auto flex flex-col gap-6">
            <SEO
                title={article.title}
                description={article.description}
                canonical={shareUrl}
                ogType="article"
                ogImage={article.image ?? "https://www.pckarsilastir.com/og-image.png"}
                keywords={article.tags.join(", ")}
                jsonLd={articleJsonLd}
            />

            <div className="blog-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />

            <div className="flex flex-col gap-2">
                <Link
                    href="/blog"
                    className="inline-flex items-center gap-1 text-[14px] text-[var(--b-fog)] hover:text-[var(--b-snow)] transition-colors w-fit mb-4"
                >
                    ← Tüm yazılar
                </Link>

                <div className="flex items-center gap-2 text-[13px] text-[var(--b-fog)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--b-chalk)]" aria-hidden="true" />
                    <time>{formatDate(article.date)}</time>
                    <span className="text-[var(--b-steel)]" aria-hidden="true">·</span>
                    <span>{article.readingMinutes} dk okuma</span>
                </div>

                <h1 className="text-[32px] font-[510] tracking-[-0.013em] leading-tight text-[var(--b-snow)] mt-1">
                    {article.title}
                </h1>

                <p className="text-[15px] leading-relaxed text-[var(--b-fog)] max-w-[640px]">
                    {article.description}
                </p>

                {article.tags.length > 0 && (
                    <p className="text-[13px] text-[var(--b-steel)] mt-1">
                        {article.tags.join("  ·  ")}
                    </p>
                )}
            </div>

            {article.image && (
                <img
                    src={article.image}
                    alt={article.title}
                    className="w-full aspect-[21/9] object-cover rounded-lg border-[1px] border-[var(--b-smoke)]"
                    loading="lazy"
                />
            )}

            <div className="grid lg:grid-cols-[minmax(0,1fr)_200px] gap-12 items-start mt-2">
                <article
                    className="blog-content"
                    dangerouslySetInnerHTML={{ __html: html }}
                />

                <aside className="hidden lg:block">
                    <nav className="blog-toc lg:sticky lg:top-24" aria-label="İçindekiler">
                        <div className="blog-toc-title">
                            İçindekiler
                        </div>
                        {toc.length === 0 ? (
                            <p className="blog-toc-empty">Başlık yok.</p>
                        ) : (
                            <div className="flex flex-col gap-0.5">
                                {toc.map((t) => (
                                    <a
                                        key={t.id}
                                        href={`#${t.id}`}
                                        className={`${t.depth === 2 ? "is-h2" : "is-h3"} ${t.id === activeId ? "is-active" : ""}`}
                                    >
                                        {t.text}
                                    </a>
                                ))}
                            </div>
                        )}
                    </nav>
                </aside>
            </div>

            <div className="flex flex-col gap-3 mt-4">
                <p className="text-[12px] font-[500] uppercase tracking-wide text-[var(--b-steel)]">Paylaş</p>
                <div className="flex flex-wrap items-center gap-1 text-[14px]">
                    <button
                        type="button"
                        onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encoded(shareText)}&url=${encoded(shareUrl)}`, "_blank", "noopener,noreferrer")}
                        className="text-[var(--b-fog)] hover:text-[var(--b-snow)] transition-colors px-2 py-1"
                    >
                        X
                    </button>
                    <span className="text-[var(--b-smoke)]" aria-hidden="true">·</span>
                    <button
                        type="button"
                        onClick={() => window.open(`https://wa.me/?text=${encoded(`${shareText} ${shareUrl}`)}`, "_blank", "noopener,noreferrer")}
                        className="text-[var(--b-fog)] hover:text-[var(--b-snow)] transition-colors px-2 py-1"
                    >
                        WhatsApp
                    </button>
                    <span className="text-[var(--b-smoke)]" aria-hidden="true">·</span>
                    <button
                        type="button"
                        onClick={() => {
                            navigator.clipboard
                                .writeText(shareUrl)
                                .then(() => {
                                    setCopied(true)
                                    setTimeout(() => setCopied(false), 2000)
                                })
                                .catch(() => undefined)
                        }}
                        className="text-[var(--b-fog)] hover:text-[var(--b-snow)] transition-colors px-2 py-1"
                    >
                        {copied ? "Kopyalandı" : "Bağlantıyı kopyala"}
                    </button>
                </div>
            </div>

            <div className="border-t-[1px] border-[var(--b-smoke)] pt-6" />

            {(newer || older) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {newer ? (
                        <ArticleLink article={newer} title="Daha yeni" arrow="left" align="start" />
                    ) : (
                        <div className="hidden sm:block" aria-hidden="true" />
                    )}
                    {older ? (
                        <ArticleLink article={older} title="Daha eski" arrow="right" align="end" />
                    ) : (
                        <div className="hidden sm:block" aria-hidden="true" />
                    )}
                </div>
            )}

            {related.length > 0 && (
                <section className="flex flex-col gap-2 border-t-[1px] border-[var(--b-smoke)] pt-6">
                    <h2 className="text-[20px] font-[510] tracking-[-0.012em] text-[var(--b-snow)]">İlgili yazılar</h2>
                    <div className="flex flex-col divide-y divide-[var(--b-smoke)]">
                        {related.map((r) => (
                            <Link
                                key={r.slug}
                                href={`/blog/${r.slug}`}
                                className="group flex items-start justify-between gap-4 py-5"
                            >
                                <div className="flex flex-col gap-1">
                                    <span className="text-[13px] text-[var(--b-fog)]">{formatDate(r.date)}</span>
                                    <span className="text-[15px] font-[510] text-[var(--b-snow)] leading-snug line-clamp-2 group-hover:text-[var(--b-mist)] transition-colors">
                                        {r.title}
                                    </span>
                                    <span className="text-[13px] text-[var(--b-fog)] leading-relaxed line-clamp-2">
                                        {r.description}
                                    </span>
                                </div>
                                <span
                                    className="mt-1 shrink-0 text-[16px] text-[var(--b-fog)] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[var(--b-snow)]"
                                    aria-hidden="true"
                                >
                                    →
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6">
                <div>
                    <p className="text-[15px] font-[510] text-[var(--b-snow)]">Hazır sistemleri karşılaştır</p>
                    <p className="text-[14px] text-[var(--b-fog)] mt-0.5">
                        İşlemci, ekran kartı ve fiyata göre filtreleyin.
                    </p>
                </div>
                <Link
                    href="/"
                    className="rounded-[9999px] border-[1px] border-[var(--b-snow)] bg-transparent text-[var(--b-snow)] text-[14px] font-[510] px-4 py-2 transition-colors hover:bg-[var(--b-snow)] hover:text-[var(--b-canvas)] shrink-0"
                >
                    Sistemlere göz at
                </Link>
            </div>
        </div>
    )
}