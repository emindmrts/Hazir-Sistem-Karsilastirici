import { useEffect, type ReactNode } from "react"
import { Link, useLocation } from "wouter"
import { Scale, X, ExternalLink, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SEO } from "./seo"
import { useCompare } from "../hooks/use-compare"
import type { Product } from "@/hooks/use-products"
import { getCpuTier, getGpuTier } from "@/lib/fp-scoring"
import {
    cpuStrength,
    gpuStrength,
    topTwo,
    versusGpuSlug,
    versusGpuUrl,
} from "@/lib/versus"
import { epeyCpuUrl } from "@/lib/epey"

function cell(value?: string | number | null): string {
    if (value === undefined || value === null || value === "" || value === "N/A") return "—"
    return String(value)
}

/** Slug yoksa körü körüne uydurma URL'ye linkleme (404 olur) — düz metin bas. */
function DetailLink({ slug, className, children }: { slug?: string; className?: string; children: ReactNode }) {
    if (!slug) return <span className={className}>{children}</span>
    return (
        <Link href={`/sistem/${slug}`}>
            <span className={`${className ?? ""} cursor-pointer`}>{children}</span>
        </Link>
    )
}

export function ComparePage() {
    const { items, remove, clear, revalidate } = useCompare()
    const [, setLocation] = useLocation()

    // Açılışta fiyat/stok tazele (tepsi dünkü veriyi tutuyor olabilir)
    useEffect(() => {
        revalidate()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const prices = items.map((p) => p.fiyat).filter((f) => f > 0)
    const minPrice = prices.length ? Math.min(...prices) : 0
    const scores = items.map((p) => p.fpScore ?? -1)
    const maxScore = Math.max(...scores, -1)

    // versus.com kademesine göre en güçlü CPU/GPU (benzersiz maksimumsa rozet)
    const cpuVals = items.map((p) => cpuStrength(p.islemci))
    const cpuMax = Math.max(...cpuVals.filter((v): v is number => v != null), -1)
    const cpuBestN = cpuVals.filter((v) => v === cpuMax).length
    const isCpuBest = (p: Product) => cpuMax > 0 && cpuBestN === 1 && cpuStrength(p.islemci) === cpuMax

    const gpuVals = items.map((p) => gpuStrength(p.ekranKarti))
    const gpuMax = Math.max(...gpuVals.filter((v): v is number => v != null), -1)
    const gpuBestN = gpuVals.filter((v) => v === gpuMax).length
    const isGpuBest = (p: Product) => gpuMax > 0 && gpuBestN === 1 && gpuStrength(p.ekranKarti) === gpuMax
    const cpuScoreVals = items.map((p) => cpuStrength(p.islemci));
    const cpuScoreMax = Math.max(...cpuScoreVals.filter((v): v is number => v != null), -1);
    const cpuScoreBestN = cpuScoreVals.filter((v) => v === cpuScoreMax).length;
    const isCpuScoreBest = (p: Product) => cpuScoreMax > 0 && cpuScoreBestN === 1 && cpuStrength(p.islemci) === cpuScoreMax;
    const gpuScoreVals = items.map((p) => gpuStrength(p.ekranKarti));
    const gpuScoreMax = Math.max(...gpuScoreVals.filter((v): v is number => v != null), -1);
    const gpuScoreBestN = gpuScoreVals.filter((v) => v === gpuScoreMax).length;
    const isGpuScoreBest = (p: Product) => gpuScoreMax > 0 && gpuScoreBestN === 1 && gpuStrength(p.ekranKarti) === gpuScoreMax;

    const ramGB = (p: Product) => {
        const m = (p.ram || "").toUpperCase().match(/(\d{1,4})\s*GB/);
        return m ? Number(m[1]) : 0;
    };
    const storGB = (p: Product) => {
        const m = ((p.ssd || p.depolama) || "").toUpperCase().match(/(\d+(?:[.,]\d+)?)\s*(TB|GB)/);
        if (!m) return 0;
        return m[2] === "TB" ? Math.round(parseFloat(m[1].replace(",", ".")) * 1000) : Number(m[1]);
    };
    const uniqBest = (vals: number[]) => {
        const known = vals.filter((v) => v > 0);
        if (!known.length) return -1;
        const mx = Math.max(...known);
        return known.filter((v) => v === mx).length === 1 ? mx : -1;
    };
    const ramMax = uniqBest(items.map(ramGB));
    const storMax = uniqBest(items.map(storGB));
    const isRamBest = (p: Product) => ramMax > 0 && ramGB(p) === ramMax;
    const isStorBest = (p: Product) => storMax > 0 && storGB(p) === storMax;

    // Genel kazanan: en cok kategori galibiyeti, esitlikte en ucuz
    const winReasons: string[][] = items.map(() => []);
    items.forEach((p, i) => {
        if (minPrice > 0 && p.fiyat === minPrice) winReasons[i].push("En ucuz fiyat");
        if (maxScore > 0 && (p.fpScore ?? -1) === maxScore) winReasons[i].push("En iyi F/P skoru");
        if (isCpuBest(p)) winReasons[i].push("En güçlü işlemci");
        if (isGpuBest(p)) winReasons[i].push("En güçlü ekran kartı");
        if (isRamBest(p)) winReasons[i].push("En çok RAM");
        if (isStorBest(p)) winReasons[i].push("En büyük depolama");
    });
    let winnerIdx = 0;
    items.forEach((p, i) => {
        if (
            winReasons[i].length > winReasons[winnerIdx].length ||
            (winReasons[i].length === winReasons[winnerIdx].length && p.fiyat < items[winnerIdx].fiyat)
        ) winnerIdx = i;
    });
    const winner = items[winnerIdx];


    // epey.com CPU ürün bağlantıları (model-bazlı; ikili kıyas ID ister)
    const cpuEpey = items.flatMap((p, idx) => {
        const url = epeyCpuUrl(p.islemci, p.islemciMarka)
        const tier = getCpuTier(p.islemci)
        if (!url || tier === "UNKNOWN") return []
        const key = p.slug || p.siteUrl || `${p.sistemAdi}::${p.magaza}::${idx}`
        return [{ key, url, tier }]
    })
    let gpuVersus: { url: string; a: string; b: string } | null = null
    const gpuPair = topTwo(items, (p) => gpuStrength(p.ekranKarti))
    if (gpuPair && getGpuTier(gpuPair[0].ekranKarti) !== getGpuTier(gpuPair[1].ekranKarti)) {
        const aSlug = versusGpuSlug(getGpuTier(gpuPair[0].ekranKarti))
        const bSlug = versusGpuSlug(getGpuTier(gpuPair[1].ekranKarti))
        if (aSlug && bSlug && aSlug !== bSlug) {
            gpuVersus = {
                url: versusGpuUrl(aSlug, bSlug),
                a: getGpuTier(gpuPair[0].ekranKarti),
                b: getGpuTier(gpuPair[1].ekranKarti),
            }
        }
    }

    if (items.length < 2) {
        return (
            <>
                <SEO
                    title="Hazır Sistem Karşılaştırma"
                    description="Beğendiğin hazır sistemleri yan yana karşılaştır: fiyat, işlemci, ekran kartı ve tüm teknik özellikler tek tabloda."
                    canonical="https://www.pckarsilastir.com/karsilastir"
                />
                <div className="min-h-[60vh] flex items-center justify-center flex-col gap-4 text-center px-4">
                    <Scale className="w-12 h-12 text-muted-foreground/40" />
                    <p className="text-lg font-bold">Karşılaştırmak için en az 2 ürün ekle</p>
                    <p className="text-sm text-muted-foreground max-w-md">
                        Ürün kartlarındaki veya detay sayfasındaki karşılaştır butonuyla sepetine ürün ekle.
                    </p>
                    <Button onClick={() => setLocation("/")} className="rounded-full font-bold">
                        Sistemlere Göz At
                    </Button>
                </div>
            </>
        )
    }

    // Statik fallback modunda skor yoktur - bomboş satır basma
    const hasAnyScore = items.some((p) => p.fpScore != null)
    const fpScoreRow: { label: string; get: (p: Product) => string; best?: (p: Product) => boolean; badge?: string } = { label: "F/P Skoru", get: (p) => (p.fpScore != null ? String(p.fpScore) : "—"), best: (p) => (p.fpScore ?? -1) === maxScore && maxScore > 0, badge: "En İyi" };
    const rows: { label: string; get: (p: Product) => string; best?: (p: Product) => boolean; badge?: string }[] = [
        { label: "Fiyat", get: (p) => `${p.fiyat.toLocaleString("tr-TR")} ₺`, best: (p) => p.fiyat === minPrice && minPrice > 0, badge: "En Ucuz" },
        ...(hasAnyScore ? [fpScoreRow] : []),
        { label: "Mağaza", get: (p) => cell(p.magaza) },
        { label: "Stok", get: (p) => (p.stoktaVarMi ? "Stokta" : "Stokta Yok") },
        { label: "İşlemci", get: (p) => cell(p.islemci), best: isCpuBest, badge: "Daha Güçlü" },
        { label: "Ekran Kartı", get: (p) => cell(p.ekranKarti), best: isGpuBest, badge: "Daha Güçlü" },
        { label: "CPU Skoru", get: (p) => { const s = cpuStrength(p.islemci); return s != null ? s.toLocaleString("tr-TR") : "—"; }, best: isCpuScoreBest },
        { label: "GPU Skoru", get: (p) => { const s = gpuStrength(p.ekranKarti); return s != null ? s.toLocaleString("tr-TR") : "—"; }, best: isGpuScoreBest },
        { label: "RAM", get: (p) => cell(p.ram), best: isRamBest },
        { label: "Depolama", get: (p) => cell(p.ssd ?? p.depolama), best: isStorBest },
        { label: "Anakart", get: (p) => cell(p.anakart) },
        { label: "Kasa", get: (p) => cell(p.kasa) },
        { label: "Güç Kaynağı", get: (p) => cell(p.psu) },
        { label: "Soğutucu", get: (p) => cell(p.sogutucu) },
    ]

    return (
        <>
            <SEO
                title="Hazır Sistem Karşılaştırma"
                description="Beğendiğin hazır sistemleri yan yana karşılaştır: fiyat, işlemci, ekran kartı ve tüm teknik özellikler tek tabloda."
                canonical="https://www.pckarsilastir.com/karsilastir"
            />
            <div className="mx-auto w-full max-w-screen-xl px-4 md:px-8 py-8">
                <div className="flex items-center justify-between gap-3 mb-6">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Yan Yana</p>
                        <h1 className="text-xl md:text-2xl font-black tracking-tight">
                            Hazır Sistem Karşılaştırma
                        </h1>
                    </div>
                    <button
                        onClick={clear}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0"
                    >
                        Sepeti Temizle
                    </button>
                </div>

                <div className="mb-6 flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 md:p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Trophy className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Öne Çıkan Sistem</p>
                        <DetailLink slug={winner.slug} className="block truncate text-base md:text-lg font-black hover:text-primary hover:underline underline-offset-2 text-left">
                            {winner.sistemAdi}
                        </DetailLink>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {winReasons[winnerIdx].map((r) => (
                                <span key={r} className="inline-block text-[10px] font-bold rounded-full bg-primary/10 text-primary px-2.5 py-0.5">
                                    {r}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xl font-black text-primary">{winner.fiyat.toLocaleString("tr-TR")} ₺</p>
                        <p className="text-[11px] text-muted-foreground">{winner.magaza}</p>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-border/60">
                    <table className="w-full min-w-[640px] border-collapse bg-card text-sm">
                        <thead>
                            <tr className="border-b border-border/60">
                                <th className="sticky left-0 bg-card z-10 text-left p-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 w-28">
                                    Özellik
                                </th>
                                {items.map((p) => {
                                    const key = p.slug || p.siteUrl || `${p.sistemAdi}::${p.magaza}`
                                    return (
                                        <th key={key} className="p-3 align-top min-w-[180px]">
                                            <div className="relative rounded-xl bg-muted/40 border border-border/50 p-3">
                                                <button
                                                    onClick={() => remove(p)}
                                                    aria-label={`${p.sistemAdi} çıkar`}
                                                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background border border-border/60 text-muted-foreground hover:text-foreground flex items-center justify-center"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                                <DetailLink slug={p.slug} className="block aspect-[4/3] mb-2">
                                                    {p.resimUrl ? (
                                                        <img
                                                            src={p.resimUrl}
                                                            alt={p.sistemAdi}
                                                            className="w-full h-full object-contain"
                                                            loading="lazy"
                                                        />
                                                    ) : null}
                                                </DetailLink>
                                                <DetailLink slug={p.slug} className="block text-xs font-semibold leading-snug line-clamp-2 hover:text-primary hover:underline underline-offset-2 text-left">
                                                    {p.sistemAdi}
                                                </DetailLink>
                                            </div>
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.label} className="border-b border-border/40 last:border-0">
                                    <td className="sticky left-0 bg-card z-10 p-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">
                                        {row.label}
                                    </td>
                                    {items.map((p) => {
                                        const key = p.slug || p.siteUrl || `${p.sistemAdi}::${p.magaza}`
                                        const isBest = row.best?.(p) ?? false
                                        return (
                                            <td
                                                key={key}
                                                className={`p-3 align-top font-medium leading-snug ${
                                                    isBest
                                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                                                        : "text-foreground"
                                                }`}
                                            >
                                                {row.get(p)}
                                                {isBest && row.badge && (
                                                    <span className={`ml-2 inline-block text-[9px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 align-middle ${row.label === "Fiyat" ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"}`}>
                                                        {row.badge}
                                                    </span>
                                                )}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                            <tr>
                                <td className="sticky left-0 bg-card z-10 p-3" />
                                {items.map((p) => {
                                    const key = p.slug || p.siteUrl || `${p.sistemAdi}::${p.magaza}`
                                    return (
                                        <td key={key} className="p-3">
                                            <Button
                                                size="sm"
                                                className="w-full rounded-full font-bold gap-1.5"
                                                disabled={!p.stoktaVarMi}
                                                asChild
                                            >
                                                <a href={p.siteUrl} target="_blank" rel="noopener noreferrer">
                                                    İncele
                                                    <ExternalLink className="w-3.5 h-3.5 opacity-75" />
                                                </a>
                                            </Button>
                                        </td>
                                    )
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {(cpuEpey.length > 0 || gpuVersus) && (
                    <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">
                            Donanım Kıyası
                        </p>
                        <p className="text-sm font-bold mb-3">
                            Hangisi daha güçlü?{" "}
                            <span className="font-normal text-muted-foreground">
                                Detaylı testler epey + versus'ta
                            </span>
                        </p>
                        {cpuEpey.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {cpuEpey.map((c) => (
                                    <Button key={c.key} variant="outline" size="sm" className="rounded-full font-bold gap-1.5" asChild>
                                        <a href={c.url} target="_blank" rel="noopener noreferrer">
                                            CPU: {c.tier} epey'de
                                            <ExternalLink className="w-3.5 h-3.5 opacity-75" />
                                        </a>
                                    </Button>
                                ))}
                            </div>
                        )}
                        {gpuVersus && (
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" className="rounded-full font-bold gap-1.5" asChild>
                                    <a href={gpuVersus.url} target="_blank" rel="noopener noreferrer">
                                        GPU: {gpuVersus.a} vs {gpuVersus.b}
                                        <ExternalLink className="w-3.5 h-3.5 opacity-75" />
                                    </a>
                                </Button>
                            </div>
                        )}
                        <p className="mt-3 text-[11px] text-muted-foreground">
                            Güç rozetleri benchmark kademelerine göre verilir.
                        </p>
                    </div>
                )}
            </div>
        </>
    )
}
