import { useMemo, useState } from "react"
import { Link } from "wouter"
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

function BlogEntry({ title, date, description, readingMinutes, tags, slug }: {
    title: string
    date: string
    description: string
    readingMinutes: number
    tags: string[]
    slug: string
}) {
    return (
        <article className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[13px] text-[var(--b-fog)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--b-chalk)]" aria-hidden="true" />
                <time>{formatDate(date)}</time>
                <span className="text-[var(--b-steel)]" aria-hidden="true">·</span>
                <span>{readingMinutes} dk okuma</span>
            </div>
            <Link
                href={`/blog/${slug}`}
                className="group inline-flex flex-col gap-1.5"
            >
                <h2 className="text-[22px] font-[510] tracking-[-0.012em] leading-snug text-[var(--b-snow)] transition-colors group-hover:text-[var(--b-fog)]">
                    {title}
                </h2>
            </Link>
            <p className="text-[15px] leading-relaxed text-[var(--b-mist)] max-w-[640px]">
                {description}
            </p>
            {tags.length > 0 && (
                <p className="text-[13px] text-[var(--b-steel)] mt-0.5">
                    {tags.join("  ·  ")}
                </p>
            )}
        </article>
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
        <div className="blog-surface flex flex-col gap-10 max-w-[720px] w-full">
            <SEO
                title="Blog & Rehber | Hazır Sistem Alım Rehberleri"
                description="Hazır sistem bilgisayar alım rehberleri: işlemci, ekran kartı, RAM ve SSD seçimi, fiyat takibi ve satın alma ipuçları. PcKarşılaştır.com blog."
                canonical="https://www.pckarsilastir.com/blog"
                keywords="hazır sistem rehber, bilgisayar alım rehberi, oyun bilgisayarı seçimi, fiyat takibi, donanım sözlüğü"
            />

            <header className="flex flex-col gap-3 pb-8 border-b-[1px] border-[var(--b-smoke)]">
                <div className="flex items-center gap-2 text-[13px] text-[var(--b-fog)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--b-chalk)]" aria-hidden="true" />
                    <span>Blog &amp; Rehberler</span>
                </div>
                <h1 className="text-[32px] font-[510] tracking-[-0.013em] leading-tight text-[var(--b-snow)]">
                    Hazır sistem notları
                </h1>
                <p className="text-[15px] leading-relaxed text-[var(--b-fog)] max-w-[640px]">
                    Bilgisayar toplarken bilmeniz gerekenler, satın alma ipuçları ve
                    fiyat takibi notları — sade bir dille.
                </p>
            </header>

            {categories.length > 0 && (
                <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px]" aria-label="Kategoriler">
                    <button
                        type="button"
                        onClick={() => setActiveCat(null)}
                        className={`transition-colors ${
                            activeCat === null
                                ? "text-[var(--b-snow)] font-[510]"
                                : "text-[var(--b-fog)] hover:text-[var(--b-snow)]"
                        }`}
                    >
                        Tümü
                    </button>
                    {categories.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setActiveCat(activeCat === c ? null : c)}
                            className={`transition-colors ${
                                activeCat === c
                                    ? "text-[var(--b-snow)] font-[510]"
                                    : "text-[var(--b-fog)] hover:text-[var(--b-snow)]"
                            }`}
                        >
                            {c}
                        </button>
                    ))}
                </nav>
            )}

            {loading && (
                <div className="flex flex-col gap-10">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex flex-col gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-[var(--b-graphite)]" />
                            <div className="h-[20px] w-2/3 rounded bg-[var(--b-graphite)]" />
                            <div className="h-[13px] w-full rounded bg-[var(--b-graphite)]" />
                            <div className="h-[13px] w-3/4 rounded bg-[var(--b-graphite)]" />
                        </div>
                    ))}
                </div>
            )}

            {error && !loading && (
                <div className="rounded-lg border-[1px] border-[var(--b-ash)] bg-[var(--b-carbon)] p-6 text-center">
                    <p className="font-[510] text-[var(--b-snow)]">Yazılar yüklenemedi</p>
                    <p className="text-sm text-[var(--b-fog)] mt-1">{error}</p>
                </div>
            )}

            {!loading && !error && filtered.length === 0 && (
                <div className="rounded-lg border-[1px] border-[var(--b-smoke)] bg-[var(--b-carbon)] p-10 text-center">
                    <p className="text-[15px] font-[510] text-[var(--b-mist)]">
                        {activeCat ? `"${activeCat}" kategorisinde yazı yok` : "Henüz yazı yok"}
                    </p>
                    <p className="text-sm text-[var(--b-fog)] mt-1">
                        {activeCat ? "Farklı bir kategori seçin." : "İlk yazı çok yakında burada."}
                    </p>
                </div>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div className="flex flex-col gap-12 mt-2">
                    {filtered.map((a) => (
                        <BlogEntry key={a.slug} {...a} />
                    ))}
                </div>
            )}
        </div>
    )
}