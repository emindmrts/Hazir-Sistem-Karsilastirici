import { useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import { marked, type MarkedExtension, type Tokens } from "marked"
import {
    CalendarDays,
    Clock,
    Tag,
    ArrowLeft,
    ArrowRight,
    ListOrdered,
    Copy,
    Check,
    Twitter,
    MessageCircle,
} from "lucide-react"
import { SEO } from "@/components/seo"
import { useBlogArticle, useBlogList } from "@/hooks/use-blog"
import { Button } from "@/components/ui/button"
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

function timeAgo(date: string) {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return formatDate(date)
    const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
    if (days <= 0) return "Bugün"
    if (days === 1) return "Dün"
    if (days < 30) return `${days} gün önce`
    return formatDate(date)
}

// marked: kod bloğu içinde escape + güvenli bağlantılar (legal koruma).
marked.setOptions({ gfm: true, breaks: true })

interface TocItem {
    id: string
    text: string
    depth: number
}

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
                return `<h${depth} id="${id}"><a href="#${id}" class="blog-anchor" aria-label="Bölüm bağlantısı: ${clean}">#</a><span>${clean}</span></h${depth}>`
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
    const html = marked.parse(content, { async: false }) as string
    return { html, toc }
}

function RelatedRow({ article, label, href, align }: { article: BlogArticleMeta; label: string; href: string; align: "start" | "end" }) {
    return (
        <Link
            href={href}
            className={`flex flex-col gap-1 rounded-2xl border border-border/60 bg-card/60 p-4 hover:border-primary/40 hover:bg-card transition-all group ${
                align === "end" ? "text-right items-end text-start" : "items-start"
            }`}
        >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                {align === "start" ? <ArrowLeft className="w-3.5 h-3.5" /> : null}
                {label}
                {align === "end" ? <ArrowRight className="w-3.5 h-3.5" /> : null}
            </span>
            <span className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {article.title}
            </span>
            <span className="text-xs text-muted-foreground">{timeAgo(article.date)}</span>
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
        if (!article || toc.length === 0) return
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
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-sm font-bold text-muted-foreground">Yükleniyor...</p>
            </div>
        )
    }

    if (notFound || !article) {
        return (
            <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-center px-4">
                <p className="text-6xl font-black text-muted/40">404</p>
                <p className="text-lg font-bold">Yazı bulunamadı.</p>
                <Button variant="outline" onClick={() => (window.location.href = "/blog")}>
                    Blog'a Dön
                </Button>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-center px-4">
                <p className="text-destructive font-semibold">Yazı yüklenemedi</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" onClick={() => (window.location.href = "/blog")}>
                    Blog'a Dön
                </Button>
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
        <div className="max-w-5xl mx-auto flex flex-col gap-5">
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

            <div className="flex flex-col gap-4">
                <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4" />
                    Tüm yazılar
                </Link>

                <header className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {formatDate(article.date)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {article.readingMinutes} dk okuma
                        </span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
                        {article.title}
                    </h1>
                    <p className="text-base text-muted-foreground leading-relaxed">
                        {article.description}
                    </p>
                    {article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {article.tags.map((t) => (
                                <span
                                    key={t}
                                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary"
                                >
                                    <Tag className="w-3 h-3" />
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}
                </header>
            </div>

            {article.image ? (
                <img
                    src={article.image}
                    alt={article.title}
                    className="w-full aspect-[16/9] object-cover rounded-2xl border border-border/60"
                    loading="lazy"
                />
            ) : (
                <div className="blog-cover-placeholder aspect-[16/9] rounded-2xl border border-border/60" aria-hidden="true" />
            )}

            <div className="grid lg:grid-cols-[minmax(0,1fr)_240px] gap-8 items-start">
                <article
                    className="blog-content rounded-2xl border border-border/60 bg-card/60 p-5 md:p-8"
                    dangerouslySetInnerHTML={{ __html: html }}
                />

                <aside className="hidden lg:block">
                    <nav className="blog-toc lg:sticky lg:top-24 max-h-[calc(100vh-8rem)] overflow-y-auto" aria-label="İçindekiler">
                        <div className="blog-toc-title">
                            <ListOrdered className="w-3.5 h-3.5" />
                            İçindekiler
                        </div>
                        {toc.length === 0 ? (
                            <p className="blog-toc-empty">Bu yazıda bölüm başlığı yok.</p>
                        ) : (
                            toc.map((t) => (
                                <a
                                    key={t.id}
                                    href={`#${t.id}`}
                                    className={`${t.depth === 2 ? "is-h2" : "is-h3"} ${t.id === activeId ? "is-active" : ""}`}
                                >
                                    {t.text}
                                </a>
                            ))
                        )}
                    </nav>
                </aside>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-5">
                <p className="text-sm font-bold">Bu yazıyı paylaş</p>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center gap-1.5"
                        onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encoded(shareText)}&url=${encoded(shareUrl)}`, "_blank", "noopener,noreferrer")}
                    >
                        <Twitter className="w-3.5 h-3.5" />
                        X'te paylaş
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center gap-1.5"
                        onClick={() => window.open(`https://wa.me/?text=${encoded(`${shareText} ${shareUrl}`)}`, "_blank", "noopener,noreferrer")}
                    >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center gap-1.5"
                        onClick={() => {
                            navigator.clipboard
                                .writeText(shareUrl)
                                .then(() => {
                                    setCopied(true)
                                    setTimeout(() => setCopied(false), 2000)
                                })
                                .catch(() => undefined)
                        }}
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Kopyalandı" : "Bağlantıyı kopyala"}
                    </Button>
                </div>
            </div>

            {(newer || older) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {newer ? (
                        <RelatedRow article={newer} label="Daha yeni" href={`/blog/${newer.slug}`} align="start" />
                    ) : (
                        <div className="hidden sm:block" aria-hidden="true" />
                    )}
                    {older ? (
                        <RelatedRow article={older} label="Daha eski" href={`/blog/${older.slug}`} align="end" />
                    ) : (
                        <div className="hidden sm:block" aria-hidden="true" />
                    )}
                </div>
            )}

            {related.length > 0 && (
                <section className="flex flex-col gap-4">
                    <h2 className="text-lg font-black tracking-tight">İlgili yazılar</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {related.map((r) => (
                            <Link
                                key={r.slug}
                                href={`/blog/${r.slug}`}
                                className="group flex flex-col gap-1 rounded-2xl border border-border/60 bg-card/60 p-4 hover:border-primary/40 hover:bg-card transition-all"
                            >
                                <span className="text-xs text-muted-foreground">{timeAgo(r.date)}</span>
                                <span className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                    {r.title}
                                </span>
                                <span className="text-xs text-muted-foreground line-clamp-2">{r.description}</span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            <div className="mt-2 rounded-xl border border-border/60 bg-muted/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <p className="font-bold">Hazır sistemleri karşılaştır</p>
                    <p className="text-sm text-muted-foreground">
                        İşlemci, ekran kartı ve fiyata göre filtreleyin.
                    </p>
                </div>
                <Button asChild className="shrink-0">
                    <Link href="/">Sistemlere Göz At</Link>
                </Button>
            </div>
        </div>
    )
}