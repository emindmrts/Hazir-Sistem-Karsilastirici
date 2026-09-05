import { useMemo, useState } from "react"
import { Link } from "wouter"
import { ArrowRight, CalendarDays, Clock, Tag } from "lucide-react"
import { SEO } from "@/components/seo"
import { useBlogList } from "@/hooks/use-blog"
import type { BlogArticleMeta } from "@/lib/api"

function timeAgo(date: string) {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return date
    const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
    if (days <= 0) return "Bugün"
    if (days === 1) return "Dün"
    if (days < 30) return `${days} gün önce`
    return d.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    })
}

function BlogCard({ a }: { a: BlogArticleMeta }) {
    return (
        <Link
            href={`/blog/${a.slug}`}
            className="group rounded-2xl border border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card hover:shadow-lg hover:shadow-black/5 transition-all flex flex-col overflow-hidden"
        >
            <div className="relative overflow-hidden">
                {a.image ? (
                    <img
                        src={a.image}
                        alt={a.title}
                        loading="lazy"
                        className="w-full aspect-[16/9] object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                ) : (
                    <div className="blog-cover-placeholder w-full aspect-[16/9]" aria-hidden="true" />
                )}
                {a.tags.length > 0 && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-background/85 backdrop-blur px-2.5 py-0.5 text-[11px] font-semibold text-foreground shadow-sm">
                        <Tag className="w-3 h-3" />
                        {a.tags[0]}
                    </span>
                )}
            </div>
            <div className="flex flex-col gap-2.5 p-5 flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {timeAgo(a.date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {a.readingMinutes} dk
                    </span>
                </div>
                <h2 className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors leading-snug">
                    {a.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {a.description}
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary mt-auto pt-1">
                    Devamını oku
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
            </div>
        </Link>
    )
}

export function BlogPage() {
    const { articles, loading, error } = useBlogList()
    const [activeCat, setActiveCat] = useState<string | null>(null)

    const categories = useMemo(
        () => Array.from(new Set(articles.map((a) => a.tags[0]).filter(Boolean))) as string[],
        [articles]
    )
    const filtered = useMemo(
        () => (activeCat ? articles.filter((a) => a.tags.includes(activeCat)) : articles),
        [articles, activeCat]
    )

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

            {categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveCat(null)}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                            activeCat === null
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border/80 bg-card/60 text-muted-foreground hover:border-primary/50 hover:text-primary"
                        }`}
                    >
                        Tümü
                    </button>
                    {categories.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setActiveCat(activeCat === c ? null : c)}
                            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                                activeCat === c
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border/80 bg-card/60 text-muted-foreground hover:border-primary/50 hover:text-primary"
                            }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            )}

            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-border/60 p-0 overflow-hidden">
                            <div className="shimmer aspect-[16/9] w-full" />
                            <div className="p-5 space-y-3">
                                <div className="shimmer h-3 rounded w-1/3" />
                                <div className="shimmer h-5 rounded w-3/4" />
                                <div className="shimmer h-3 rounded w-full" />
                                <div className="shimmer h-3 rounded w-2/3" />
                            </div>
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

            {!loading && !error && filtered.length === 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/40 p-12 text-center">
                    <p className="text-lg font-bold">
                        {activeCat ? `"${activeCat}" kategorisinde yazı yok` : "Henüz yazı yok"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                        {activeCat
                            ? "Farklı bir kategori seçmeyi deneyin."
                            : "İlk rehber yazısı çok yakında burada olacak."}
                    </p>
                </div>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((a) => (
                        <BlogCard key={a.slug} a={a} />
                    ))}
                </div>
            )}
        </div>
    )
}