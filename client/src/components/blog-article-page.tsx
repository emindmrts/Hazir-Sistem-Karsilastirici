import { useMemo } from "react"
import { Link } from "wouter"
import { marked } from "marked"
import { CalendarDays, Clock, Tag, ArrowLeft } from "lucide-react"
import { SEO } from "@/components/seo"
import { useBlogArticle } from "@/hooks/use-blog"
import { Button } from "@/components/ui/button"

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

// marked: RMGags kod bloğu içinde escape etsin (enjeksiyon koruması).
marked.setOptions({ gfm: true, breaks: true })

export function BlogArticlePage({ slug }: { slug: string }) {
    const { article, loading, notFound, error } = useBlogArticle(slug ?? "")

    const html = useMemo(() => {
        if (!article) return ""
        try {
            return marked.parse(article.content, { async: false }) as string
        } catch {
            return "<p>Bu yazı şu an görüntülenemiyor.</p>"
        }
    }, [article])

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

    const articleJsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": article.title,
            "description": article.description,
            "datePublished": article.date,
            "inLanguage": "tr-TR",
            "url": `https://www.pckarsilastir.com/blog/${article.slug}`,
            "image": article.image ?? "https://www.pckarsilastir.com/og-image.png",
            "author": { "@type": "Organization", "name": "PcKarşılaştır.com" },
            "publisher": {
                "@type": "Organization",
                "name": "PcKarşılaştır.com",
                "logo": { "@type": "ImageObject", "url": "https://www.pckarsilastir.com/og-image.png" },
            },
            "mainEntityOfPage": `https://www.pckarsilastir.com/blog/${article.slug}`,
        },
    ]

    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
            <SEO
                title={article.title}
                description={article.description}
                canonical={`https://www.pckarsilastir.com/blog/${article.slug}`}
                ogType="article"
                ogImage={article.image ?? "https://www.pckarsilastir.com/og-image.png"}
                keywords={article.tags.join(", ")}
                jsonLd={articleJsonLd}
            />

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
                <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
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

            <article
                className="blog-content rounded-2xl border border-border/60 bg-card/60 p-5 md:p-8"
                dangerouslySetInnerHTML={{ __html: html }}
            />

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