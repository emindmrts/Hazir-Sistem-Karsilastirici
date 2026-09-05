import { Link } from "wouter"
import { ArrowRight, CalendarDays, Clock, Tag } from "lucide-react"
import { SEO } from "@/components/seo"
import { useBlogList } from "@/hooks/use-blog"

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

export function BlogPage() {
    const { articles, loading, error } = useBlogList()

    return (
        <div className="flex flex-col gap-8">
            <SEO
                title="Blog & Rehber | Hazır Sistem Alım Rehberleri"
                description="Hazır sistem bilgisayar alım rehberleri: işlemci, ekran kartı, RAM ve SSD seçimi, fiyat takibi ve satın alma ipuçları. PcKarşılaştır.com blog."
                canonical="https://www.pckarsilastir.com/blog"
                keywords="hazır sistem rehber, bilgisayar alım rehberi, oyun bilgisayarı seçimi, fiyat takibi, donanım sözlüğü"
            />

            <header className="flex flex-col gap-1.5">
                <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight">
                    Blog &amp; Alım Rehberleri
                </h1>
                <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
                    Hazır sistem bilgisayar alırken bilmeniz gereken her şeyi sade bir dille
                    anlatıyoruz: donanım rehberleri, fiyat takibi ipuçları ve satın alma hataları.
                </p>
            </header>

            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-border/60 p-5 space-y-3">
                            <div className="shimmer h-3 rounded w-1/3" />
                            <div className="shimmer h-5 rounded w-3/4" />
                            <div className="shimmer h-3 rounded w-full" />
                            <div className="shimmer h-3 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            )}

            {error && !loading && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center">
                    <p className="text-destructive font-semibold">Yazılar yüklenemedi</p>
                    <p className="text-sm text-muted-foreground mt-2">{error}</p>
                </div>
            )}

            {!loading && !error && articles.length === 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/40 p-12 text-center">
                    <p className="text-lg font-bold">Henüz yazı yok</p>
                    <p className="text-sm text-muted-foreground mt-2">
                        İlk rehber yazısı çok yakında burada olacak.
                    </p>
                </div>
            )}

            {!loading && !error && articles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {articles.map((a) => (
                        <Link
                            key={a.slug}
                            href={`/blog/${a.slug}`}
                            className="group rounded-2xl border border-border/60 bg-card/60 p-5 hover:border-primary/40 hover:bg-card transition-all flex flex-col gap-3"
                        >
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                    <CalendarDays className="w-3.5 h-3.5" />
                                    {formatDate(a.date)}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {a.readingMinutes} dk
                                </span>
                            </div>
                            <h2 className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors leading-snug">
                                {a.title}
                            </h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {a.description}
                            </p>
                            {a.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-auto">
                                    {a.tags.map((t) => (
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
                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary mt-1">
                                Devamını oku
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}