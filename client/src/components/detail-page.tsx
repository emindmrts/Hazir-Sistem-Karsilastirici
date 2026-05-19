import { useEffect } from "react"
import { useLocation } from "wouter"
import { Helmet } from "react-helmet-async"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
    ArrowLeft, ExternalLink, Cpu, LayoutGrid, MemoryStick,
    HardDrive, Zap, Box, Thermometer, ShieldCheck, Store
} from "lucide-react"
import type { Product } from "@/hooks/use-products"
import { createSlug } from "@/hooks/use-slugs"
import { calculateFPScore } from "@/lib/fp-scoring"

function getLogoUrl(store: string) {
    const key = store.toLowerCase().replace(/[^a-z]/g, "")
    const validStores = ["vatan", "itopya", "gaminggen", "gamegaraj", "pckolik", "sinerji", "incehesap", "tebilon"]
    if (validStores.includes(key)) return `/logos/${key}.png`
    return null
}

function SpecRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
    if (!value || value === "N/A") return null
    return (
        <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-foreground leading-snug">{value}</p>
            </div>
        </div>
    )
}

function ScoreRing({ score }: { score: number }) {
    const r = 42
    const circ = 2 * Math.PI * r
    const offset = circ - (score / 100) * circ
    const color = score >= 80 ? "#22c55e" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#ef4444"

    return (
        <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                <circle
                    cx="48" cy="48" r={r} fill="none"
                    stroke={color} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 1s ease" }}
                />
            </svg>
            <div className="text-center z-10">
                <span className="text-2xl font-black" style={{ color }}>{score}</span>
                <span className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground">F/P</span>
            </div>
        </div>
    )
}

interface DetailPageProps {
    product: Product
    allProducts: Product[]
}

export function DetailPage({ product, allProducts }: DetailPageProps) {
    const [, setLocation] = useLocation()

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" })
    }, [product])

    const logoUrl = getLogoUrl(product.magaza)

    // F/P Score using the advanced algorithm
    const normalised = calculateFPScore(product, allProducts)

    // Similar systems: same GPU brand, different price (±25%)
    const similar = allProducts
        .filter(p =>
            p !== product &&
            p.gpuKey && product.gpuKey &&
            p.gpuKey === product.gpuKey &&
            p.stoktaVarMi &&
            Math.abs(p.fiyat - product.fiyat) / product.fiyat < 0.25
        )
        .slice(0, 4)

    const canonicalSlug = createSlug(product.name || product.sistemAdi, product.magaza)
    const pageTitle = `${product.sistemAdi} | ${product.magaza} | ${product.fiyat.toLocaleString("tr-TR")} ₺`
    const pageDesc = `${product.magaza} mağazasından ${product.sistemAdi} hazır sistem bilgisayarı. ${product.islemci ? product.islemci + " işlemcili" : ""} ${product.ekranKarti ? "ve " + product.ekranKarti + " ekran kartlı" : ""} bu sistemi ${product.fiyat.toLocaleString("tr-TR")} ₺ fiyatıyla inceleyin.`

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.sistemAdi,
        "description": pageDesc,
        "image": product.resimUrl,
        "brand": { "@type": "Brand", "name": product.magaza },
        "offers": {
            "@type": "Offer",
            "price": product.fiyat,
            "priceCurrency": "TRY",
            "availability": product.stoktaVarMi ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "url": product.siteUrl,
            "seller": { "@type": "Organization", "name": product.magaza }
        }
    }

    return (
        <>
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDesc} />
                <link rel="canonical" href={`/sistem/${canonicalSlug}`} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDesc} />
                <meta property="og:image" content={product.resimUrl} />
                <meta property="og:type" content="product" />
                <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
            </Helmet>

            <div className="min-h-screen bg-background">
                {/* Back button */}
                <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40">
                    <div className="mx-auto w-full max-w-screen-xl px-4 md:px-8 py-3 flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 font-bold text-muted-foreground hover:text-foreground -ml-1"
                            onClick={() => setLocation("/")}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Tüm Sistemler
                        </Button>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="text-xs text-muted-foreground truncate">{product.sistemAdi}</span>
                    </div>
                </div>

                <div className="mx-auto w-full max-w-screen-xl px-4 md:px-8 py-8 md:py-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12">

                        {/* ── Left: Image + Score ── */}
                        <div className="flex flex-col gap-6">
                            {/* Product Image */}
                            <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-gradient-to-br from-muted/60 to-muted/10 aspect-[4/3] flex items-center justify-center p-8">
                                {!product.stoktaVarMi && (
                                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
                                        <span className="rotate-[-12deg] border-2 border-muted-foreground/50 text-muted-foreground text-lg font-black px-6 py-2 rounded-xl tracking-widest">
                                            STOKTA YOK
                                        </span>
                                    </div>
                                )}
                                <img
                                    src={product.resimUrl}
                                    alt={product.sistemAdi}
                                    className="w-full h-full object-contain drop-shadow-xl"
                                    onError={(e) => {
                                        const t = e.target as HTMLImageElement
                                        t.onerror = null
                                        t.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='M21 15l-5-5L4 20'/%3E%3C/svg%3E"
                                    }}
                                />
                                {/* Store badge */}
                                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-border/60 rounded-full px-3 py-1.5 shadow-sm">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt={product.magaza} className="h-4 w-auto object-contain" />
                                    ) : (
                                        <Store className="w-3.5 h-3.5 text-muted-foreground" />
                                    )}
                                    <span className="text-xs font-bold">{product.magaza}</span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border/50 bg-card p-5 flex flex-col gap-4">
                                <div className="flex items-center gap-5">
                                    <ScoreRing score={normalised} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Fiyat / Performans</p>
                                            <span className="text-[8px] font-bold bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-amber-500/20">Beta</span>
                                        </div>
                                        <p className="text-3xl font-black text-foreground mb-3">
                                            {product.fiyat.toLocaleString("tr-TR")}
                                            <span className="text-lg text-primary ml-1">₺</span>
                                        </p>
                                        <Button
                                            className="w-full rounded-full font-bold gap-2 shadow-md hover:shadow-primary/30 transition-all"
                                            disabled={!product.stoktaVarMi}
                                            asChild
                                        >
                                            <a href={product.siteUrl} target="_blank" rel="noopener noreferrer">
                                                Mağazada İncele
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5">
                                    <p className="text-[10px] text-amber-600/80 leading-snug">
                                        <strong className="font-bold">Uyarı:</strong> Puanlama algoritması deneme (BETA) aşamasındadır. Yalnızca kaba bir referans olarak kullanınız, tek başına bu puana kanarak karar vermeyiniz.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── Right: Title + Specs ── */}
                        <div className="flex flex-col gap-6">
                            {/* Title */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Hazır Sistem</p>
                                <h1 className="text-2xl md:text-3xl font-black leading-tight tracking-tight mb-3">
                                    {product.sistemAdi}
                                </h1>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${product.stoktaVarMi ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        {product.stoktaVarMi ? "Stokta Mevcut" : "Stokta Yok"}
                                    </span>
                                </div>
                            </div>

                            {/* Specs List */}
                            <div className="rounded-2xl border border-border/50 bg-card p-5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Teknik Özellikler</p>
                                <SpecRow icon={<Cpu className="w-4 h-4" />} label="İşlemci" value={product.islemci} />
                                <SpecRow icon={<LayoutGrid className="w-4 h-4" />} label="Ekran Kartı" value={product.ekranKarti} />
                                <SpecRow icon={<MemoryStick className="w-4 h-4" />} label="RAM" value={product.ram} />
                                <SpecRow icon={<HardDrive className="w-4 h-4" />} label="Depolama" value={product.ssd ?? product.depolama} />
                                <SpecRow icon={<Thermometer className="w-4 h-4" />} label="Anakart" value={product.anakart} />
                                <SpecRow icon={<Box className="w-4 h-4" />} label="Kasa" value={product.kasa} />
                                <SpecRow icon={<Zap className="w-4 h-4" />} label="Güç Kaynağı" value={product.psu} />
                                <SpecRow icon={<Thermometer className="w-4 h-4" />} label="Soğutucu" value={product.sogutucu} />
                            </div>
                        </div>
                    </div>

                    {/* ── Similar Systems ── */}
                    {similar.length > 0 && (
                        <div className="mt-16">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-px flex-1 bg-border/50" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-2">Benzer Donanımlı Sistemler</p>
                                <div className="h-px flex-1 bg-border/50" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {similar.map((p) => {
                                    const slug = createSlug(p.name || p.sistemAdi, p.magaza)
                                    const sLogo = getLogoUrl(p.magaza)
                                    return (
                                        <button
                                            key={slug}
                                            onClick={() => setLocation(`/sistem/${slug}`)}
                                            className="group text-left rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                                        >
                                            <div className="bg-gradient-to-br from-muted/60 to-muted/10 flex items-center justify-center p-4 aspect-[4/3]">
                                                <img
                                                    src={p.resimUrl}
                                                    alt={p.sistemAdi}
                                                    className="h-full w-full object-contain drop-shadow"
                                                    onError={(e) => {
                                                        const t = e.target as HTMLImageElement
                                                        t.onerror = null
                                                        t.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='M21 15l-5-5L4 20'/%3E%3C/svg%3E"
                                                    }}
                                                />
                                            </div>
                                            <div className="p-3">
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    {sLogo ? (
                                                        <img src={sLogo} alt={p.magaza} className="h-3.5 w-auto object-contain" />
                                                    ) : (
                                                        <span className="text-[9px] font-bold text-muted-foreground">{p.magaza}</span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-2">{p.sistemAdi}</p>
                                                <p className="text-sm font-black text-primary">{p.fiyat.toLocaleString("tr-TR")} ₺</p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
