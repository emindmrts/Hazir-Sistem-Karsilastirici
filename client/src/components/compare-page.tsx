import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { gsap } from "gsap"
import { useCompare } from "@/hooks/use-compare"
import { useProducts } from "@/hooks/use-products"
import { Button } from "@/components/ui/button"
import { calculateFPScore } from "@/lib/fp-scoring"
import type { Product } from "@/hooks/use-products"
import { createSlug, findBySlug } from "@/hooks/use-slugs"
import {
  ExternalLink, ShieldCheck,
  Eye, EyeOff, Plus, X, ArrowLeft, ArrowRight,
  ChevronLeft, Sparkles, Gauge, Star, Trash2,
  TrendingUp, Link2, Check
} from "lucide-react"
import { useLocation } from "wouter"
import { Header } from "./header"
import { Footer } from "./footer"
import { SPEC_STYLES } from "@/lib/spec-styles"

function getLogoUrl(store: string) {
  const key = store.toLowerCase().replace(/[^a-z]/g, "")
  const validStores = ["vatan", "itopya", "gaminggen", "gamegaraj", "pckolik", "sinerji", "incehesap", "tebilon"]
  if (validStores.includes(key)) return `/logos/${key}.png`
  return null
}

interface SpecDef {
  key: string
  label: string
  icon: React.ReactNode
  accent: string
  getValue: (p: any) => string | undefined
  category?: "core" | "memory" | "chassis"
}

const SPEC_DEFS: SpecDef[] = SPEC_STYLES.map(s => ({
  key: s.key,
  label: s.label,
  icon: <s.Icon className="w-4 h-4" />,
  accent: `${s.bg} ${s.text}`,
  getValue: (p: any) => (s.key === "depolama" ? (p.ssd ?? p.depolama) : p[s.key]),
  ...(s.category ? { category: s.category } : {}),
}))

function shortenName(name: string) {
  return name
    .replace(/Hazır Sistem/gi, "")
    .replace(/Gaming (PC|Bilgisayar|Kasa)/gi, "")
    .replace(/Oyun Bilgisayarı/gi, "")
    .replace(/Masaüstü Bilgisayar/gi, "")
    .replace(/PC/g, "")
    .replace(/\s\s+/g, ' ')
    .trim()
}

function getFpScoreColor(score: number): string {
  if (score >= 85) return "text-emerald-500"
  if (score >= 70) return "text-primary"
  if (score >= 55) return "text-amber-500"
  return "text-muted-foreground"
}

export function ComparePage() {
  const { items, removeFromCompare, clearCompare, addToCompare } = useCompare()
  const { allProducts } = useProducts()
  const [highlightDiffs, setHighlightDiffs] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pageScrolled, setPageScrolled] = useState(false)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)
  const tableAnchorRef = useRef<HTMLDivElement>(null)
  const tableBodyRef = useRef<HTMLTableSectionElement>(null)
  const slotsRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const [, setLocation] = useLocation()
  const prevCountRef = useRef(items.length)
  const initRef = useRef(false)
  const urlLoadedRef = useRef(false)

  // Scroll tracking for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setPageScrolled(window.scrollY > 400)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // URL'den ürünleri yükle (?compare=slug1,slug2)
  useEffect(() => {
    if (urlLoadedRef.current || allProducts.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const compareSlugs = params.get("compare")
    if (!compareSlugs) return

    const slugs = compareSlugs.split(",").filter(Boolean)
    setLoadingUrl(true)
    for (const slug of slugs) {
      const product = findBySlug(allProducts, slug)
      if (product) addToCompare(product)
    }
    urlLoadedRef.current = true
    setLoadingUrl(false)

    // Clean URL
    const cleanUrl = window.location.pathname
    window.history.replaceState(null, "", cleanUrl)
  }, [allProducts, addToCompare])

  // URL sync - compare state'ini URL'e yansıt
  useEffect(() => {
    if (!urlLoadedRef.current) return
    if (items.length === 0) {
      const cleanUrl = window.location.pathname
      window.history.replaceState(null, "", cleanUrl)
      return
    }
    const slugs = items.map(p => p.slug ?? createSlug(p.name || p.sistemAdi, p.magaza))
    const params = new URLSearchParams()
    params.set("compare", slugs.join(","))
    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState(null, "", newUrl)
  }, [items])

  // Paylaş linki
  const shareUrl = useMemo(() => {
    if (items.length === 0) return ""
    const slugs = items.map(p => p.slug ?? createSlug(p.name || p.sistemAdi, p.magaza))
    const params = new URLSearchParams()
    params.set("compare", slugs.join(","))
    return `${window.location.origin}/karsilastir?${params.toString()}`
  }, [items])

  const copyShareLink = useCallback(() => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [shareUrl])

  useEffect(() => {
    if (items.length === 2 && prevCountRef.current === 1 && tableAnchorRef.current) {
      setTimeout(() => {
        tableAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 300)
    }
    prevCountRef.current = items.length
  }, [items.length])

  // GSAP: hero heading entrance
  const heroRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!heroRef.current) return
    const children = heroRef.current.children
    if (!children.length) return
    gsap.fromTo(children,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power3.out", clearProps: "transform" }
    )
  }, [])

  // GSAP: table rows stagger
  useEffect(() => {
    if (items.length < 2 || !tableBodyRef.current) return
    const rows = tableBodyRef.current.querySelectorAll("tr")
    if (rows.length === 0) return
    gsap.fromTo(rows,
      { opacity: 0, y: 12, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.35, stagger: 0.04, ease: "power2.out", clearProps: "transform" }
    )
  }, [items.length])

  // GSAP: slot entrance
  useEffect(() => {
    if (!slotsRef.current || initRef.current) { initRef.current = true; return }
    const slotEls = slotsRef.current.children
    if (!slotEls.length) return
    gsap.fromTo(slotEls,
      { opacity: 0, scale: 0.85, y: 16 },
      { opacity: 1, scale: 1, y: 0, duration: 0.35, stagger: 0.07, ease: "back.out(1.5)" }
    )
  }, [items.length])

  // GSAP: price bars animation
  useEffect(() => {
    if (!tableBodyRef.current || items.length < 2) return
    const bars = tableBodyRef.current.querySelectorAll<HTMLElement>("[data-price-bar]")
    if (!bars.length) return
    gsap.fromTo(bars,
      { width: "0%" },
      { width: (i) => `${getPriceBarWidth(items[i].fiyat)}%`, duration: 1, stagger: 0.1, ease: "power3.out", delay: 0.5 }
    )
  }, [items.length])

  // GSAP: highlight diffs pulse animation
  useEffect(() => {
    if (!tableBodyRef.current || items.length < 2) return
    const highlighted = tableBodyRef.current.querySelectorAll<HTMLElement>("[data-diff-highlight]")
    if (!highlighted.length) return
    if (highlightDiffs) {
      // backgroundColor paint tetikler; opacity+transform (composited) animasyonu,
      // renk ise animasyonsuz set edilir.
      gsap.set(highlighted, { backgroundColor: "rgba(251,191,36,0.12)" })
      gsap.fromTo(highlighted,
        { opacity: 0.4, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.35, stagger: 0.02, ease: "power2.out", clearProps: "opacity" }
      )
    } else {
      gsap.to(highlighted, { opacity: 0, scale: 1, duration: 0.25, ease: "power2.out", clearProps: "opacity" })
      gsap.set(highlighted, { backgroundColor: "rgba(251,191,36,0)" })
    }
  }, [highlightDiffs, items.length])

  const handleTableScroll = () => {
    if (tableRef.current) setScrolled(tableRef.current.scrollLeft > 10)
  }

  const minPrice = useMemo(() => items.length > 0 ? Math.min(...items.map(p => p.fiyat)) : 0, [items])
  const maxPrice = useMemo(() => items.length > 0 ? Math.max(...items.map(p => p.fiyat)) : 0, [items])

  const getPriceBarWidth = useCallback((price: number) => {
    if (maxPrice === minPrice) return 100
    return ((maxPrice - price) / (maxPrice - minPrice)) * 60 + 40
  }, [minPrice, maxPrice])

  const isDifferent = useCallback((specDef: SpecDef): boolean => {
    const values = items.map(p => (specDef.getValue(p) || "—").trim().toUpperCase())
    return new Set(values).size > 1
  }, [items])

  const fpScores = useMemo(() =>
    items.map(p => ({
      slug: p.slug ?? createSlug(p.name || p.sistemAdi, p.magaza),
      score: calculateFPScore(p, allProducts)
    })),
    [items, allProducts]
  )
  const maxFpScore = useMemo(() =>
    fpScores.length > 0 ? Math.max(...fpScores.map(f => f.score)) : 0,
    [fpScores]
  )

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 w-full">
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-primary/[0.02] to-background border-b border-border/40">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative px-4 md:px-8 py-10 md:py-14 max-w-screen-2xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div ref={heroRef}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
                    <Sparkles className="w-3 h-3" />
                    KARŞILAŞTIRMA
                  </span>
                </div>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight">
                  Sistem{" "}
                  <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Karşılaştırması
                  </span>
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-xl">
                  Seçtiğiniz hazır sistemleri yan yana karşılaştırın, fiyat ve özellik farklarını görün.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {items.length >= 2 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHighlightDiffs(!highlightDiffs)}
                      className={`h-9 px-4 rounded-full text-xs font-bold gap-2 transition-all duration-300 ${
                        highlightDiffs
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20"
                          : ""
                      }`}
                      aria-label={highlightDiffs ? "Fark vurgulamayı kapat" : "Farkları vurgula"}
                    >
                      {highlightDiffs ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{highlightDiffs ? "Vurgulamayı Kapat" : "Farkları Vurgula"}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyShareLink}
                      className="h-9 px-3 rounded-full text-xs font-bold gap-2 transition-all duration-300"
                      aria-label="Karşılaştırma linkini kopyala"
                    >
                      {copied ? (
                        <><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-500">Kopyalandı</span></>
                      ) : (
                        <><Link2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Paylaş</span></>
                      )}
                    </Button>
                  </>
                )}
                {items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCompare}
                    className="h-9 px-3 rounded-full text-xs font-bold gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    aria-label="Karşılaştırma listesini temizle"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Temizle</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 py-8 max-w-screen-2xl mx-auto">
          {/* Slot Cards */}
          <div ref={slotsRef} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {Array.from({ length: 4 }).map((_, i) => {
              const product = items[i]
              const isNextSlot = !product && i === items.length && items.length < 4
              const slug = product?.slug ?? createSlug(product?.name || product?.sistemAdi || "", product?.magaza || "")
              return (
                <div
                  key={i}
                  role="region"
                  aria-label={product ? `${i + 1}. slot: ${shortenName(product.sistemAdi)}` : `${i + 1}. slot: Boş`}
                  className={`relative group rounded-2xl border-2 p-4 text-center transition-all duration-500 ${
                    product
                      ? "border-primary/30 bg-gradient-to-b from-primary/[0.04] to-background hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                      : isNextSlot
                        ? "border-dashed border-primary/20 bg-primary/[0.02] animate-pulse"
                        : "border-dashed border-border/30 bg-muted/20 hover:border-border/60 hover:bg-muted/30"
                  }`}
                >
                  {product ? (
                    <>
                      <button
                        onClick={() => removeFromCompare(slug)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border border-border/60 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200 z-10"
                        title={`${shortenName(product.sistemAdi)} çıkar`}
                        aria-label={`${shortenName(product.sistemAdi)} karşılaştırmadan çıkar`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-muted/60 to-muted/20 flex items-center justify-center overflow-hidden ring-1 ring-border/40 group-hover:ring-primary/30 transition-all duration-300">
                        <img
                          src={product.resimUrl}
                          alt=""
                          width="56"
                          height="56"
                          className="w-full h-full object-contain p-1.5 transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const t = e.target as HTMLImageElement
                            t.onerror = null
                            t.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.5'%3E%3Crect width='18' height='18' x='3' y='3' rx='2'/%3E%3C/svg%3E"
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-center gap-1.5 mb-1.5">
                        {(() => {
                          const logo = getLogoUrl(product.magaza)
                          return logo ? (
                            <img src={logo} alt="" width="56" height="14" className="h-3.5 w-auto object-contain" />
                          ) : (
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{product.magaza}</span>
                          )
                        })()}
                      </div>
                      <p className="text-xs font-semibold leading-snug line-clamp-2 mb-1">{shortenName(product.sistemAdi)}</p>
                      <p className="text-sm font-black text-primary">{product.fiyat.toLocaleString("tr-TR")} ₺</p>
                      {!product.stoktaVarMi && (
                        <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[9px] font-bold border border-destructive/20">
                          Stokta Yok
                        </span>
                      )}
                      <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">
                        {i + 1}
                      </div>
                    </>
                  ) : (
                    <div className="py-3">
                      <div className={`w-14 h-14 mx-auto mb-3 rounded-xl border-2 border-dashed flex items-center justify-center transition-all duration-500 ${
                        isNextSlot ? "border-primary/30 bg-primary/[0.04]" : "border-border/20 bg-muted/30"
                      }`}>
                        <Plus className={`w-6 h-6 transition-all duration-500 ${
                          isNextSlot ? "text-primary/60" : "text-muted-foreground/60"
                        }`} />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground/60">Boş Slot</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div ref={tableAnchorRef} />

          {/* Comparison Table */}
          {items.length >= 2 ? (
            <>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-bold border border-primary/10">
                    <Gauge className="w-3.5 h-3.5" />
                    {items.length} Sistem
                  </span>
                </div>
                {scrolled && (
                  <button
                    onClick={() => tableRef.current?.scrollTo({ left: 0, behavior: "smooth" })}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Tablonun başına dön"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Başa Dön
                  </button>
                )}
              </div>

              <div
                ref={tableRef}
                onScroll={handleTableScroll}
                className="rounded-2xl border border-border/60 bg-card overflow-auto shadow-lg shadow-black/5"
                role="region"
                aria-label="Sistem karşılaştırma tablosu"
              >
                <table className="w-full border-collapse min-w-[640px]">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 bg-card w-[140px] md:w-[170px] p-4 border-b border-r border-border/40">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Özellik</span>
                      </th>
                      {items.map((product) => {
                        const slug = product.slug ?? createSlug(product.name || product.sistemAdi, product.magaza)
                        const logo = getLogoUrl(product.magaza)
                        return (
                          <th key={slug} scope="col" className="p-4 border-b border-border/40 text-center align-top min-w-[200px] relative group bg-gradient-to-b from-card to-muted/5">
                            <button
                              onClick={() => removeFromCompare(slug)}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background border border-border/40 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200 z-10"
                              title="Çıkar"
                              aria-label={`${shortenName(product.sistemAdi)} karşılaştırmadan çıkar`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="w-20 h-20 mx-auto mb-3 rounded-xl bg-gradient-to-br from-muted/60 to-muted/20 flex items-center justify-center overflow-hidden ring-1 ring-border/40 group-hover:ring-primary/30 transition-all duration-300">
                              <img
                                src={product.resimUrl}
                                alt=""
                                width="80"
                                height="80"
                                className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  const t = e.target as HTMLImageElement
                                  t.onerror = null
                                  t.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.5'%3E%3Crect width='18' height='18' x='3' y='3' rx='2'/%3E%3C/svg%3E"
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-center gap-1.5 mb-2">
                              {logo ? (
                                <img src={logo} alt="" width="64" height="16" className="h-4 w-auto object-contain" />
                              ) : (
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">{product.magaza}</span>
                              )}
                            </div>
                            <p className="text-xs font-semibold leading-snug line-clamp-2 mb-2 px-2">{product.sistemAdi}</p>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody ref={tableBodyRef}>
                    {/* Price row */}
                    <tr>
                      <td className="sticky left-0 z-10 bg-card p-4 border-b border-r border-border/40">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <span className="text-sm font-black">₺</span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-muted-foreground">Fiyat</span>
                            <p className="text-[9px] text-muted-foreground/60">Karşılaştırma</p>
                          </div>
                        </div>
                      </td>
                      {items.map((product) => {
                        const slug = product.slug ?? createSlug(product.name || product.sistemAdi, product.magaza)
                        const isCheapest = product.fiyat === minPrice && items.length > 1
                        const barWidth = getPriceBarWidth(product.fiyat)
                        return (
                          <td key={slug} className="p-4 border-b border-border/40 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <p className="text-xl md:text-2xl font-black text-primary tracking-tight">
                                {product.fiyat.toLocaleString("tr-TR")} ₺
                              </p>
                              <div className="w-full max-w-[140px] h-1.5 rounded-full bg-muted/60 overflow-hidden">
                                <div
                                  data-price-bar
                                  className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700 ease-out"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                              {isCheapest && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[9px] font-bold border border-emerald-500/20">
                                  <ShieldCheck className="w-3 h-3" />
                                  En Ucuz
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>

                    {/* F/P Score row */}
                    <tr>
                      <td className="sticky left-0 z-10 bg-card p-4 border-b border-r border-border/40">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-muted-foreground">F/P Puanı</span>
                            <p className="text-[9px] text-muted-foreground/60">Performans / Fiyat</p>
                          </div>
                        </div>
                      </td>
                      {fpScores.map((fp) => {
                        const isBest = fp.score === maxFpScore && fpScores.length > 1
                        const label = fp.score >= 85 ? "Mükemmel" : fp.score >= 70 ? "İyi" : fp.score >= 55 ? "Orta" : "Düşük"
                        return (
                          <td key={fp.slug} className="p-4 border-b border-border/40 text-center">
                            <div className="flex flex-col items-center gap-1.5 group/score">
                              <span className={`text-2xl font-black tracking-tight ${getFpScoreColor(fp.score)}`}>
                                {fp.score}
                              </span>
                              <div className="w-full max-w-[100px] h-1 rounded-full bg-muted/60 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                                    fp.score >= 85 ? "bg-emerald-500" :
                                    fp.score >= 70 ? "bg-primary" :
                                    fp.score >= 55 ? "bg-amber-500" : "bg-muted-foreground/40"
                                  }`}
                                  style={{ width: `${Math.min(100, fp.score)}%` }}
                                />
                              </div>
                              {isBest && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold border border-primary/20">
                                  <Star className="w-2.5 h-2.5" />
                                  En İyi F/P
                                </span>
                              )}
                              <span className={`text-[9px] font-medium ${getFpScoreColor(fp.score)}`}>{label}</span>
                            </div>
                          </td>
                        )
                      })}
                    </tr>

                    {/* Stok */}
                    <tr>
                      <td className="sticky left-0 z-10 bg-card p-4 border-b border-r border-border/40">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-muted-foreground">Stok</span>
                            <p className="text-[9px] text-muted-foreground/60">Durum</p>
                          </div>
                        </div>
                      </td>
                      {items.map((product) => {
                        const slug = product.slug ?? createSlug(product.name || product.sistemAdi, product.magaza)
                        const inStock = product.stoktaVarMi
                        return (
                          <td key={slug} className="p-4 border-b border-border/40 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                              inStock
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-muted/50 text-muted-foreground border-border/40"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${inStock ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
                              {inStock ? "Stokta" : "Stokta Yok"}
                            </span>
                          </td>
                        )
                      })}
                    </tr>

                    {/* Core specs */}
                    <tr>
                      <td colSpan={items.length + 1} className="bg-muted/30 px-4 py-2.5 border-b border-border/40">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-muted-foreground/40" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Temel Bileşenler</span>
                        </div>
                      </td>
                    </tr>
                    {SPEC_DEFS.filter(s => s.category === "core").map((spec) => {
                      const diff = isDifferent(spec)
                      const rowHighlight = highlightDiffs && diff
                      return (
                        <tr key={spec.key} className={`transition-colors duration-300 ${rowHighlight ? "bg-amber-500/5 dark:bg-amber-500/10" : "hover:bg-muted/20"}`}>
                          <td className={`sticky left-0 z-10 p-4 border-b border-r border-border/40 transition-colors duration-300 ${rowHighlight ? "bg-amber-500/5 dark:bg-amber-500/10" : "bg-card"}`}>
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${spec.accent}`}>{spec.icon}</div>
                              <span className="text-xs font-bold text-muted-foreground">{spec.label}</span>
                            </div>
                          </td>
                          {items.map((product) => {
                            const slug = product.slug ?? createSlug(product.name || product.sistemAdi, product.magaza)
                            const val = spec.getValue(product)
                            return (
                              <td key={slug} className={`p-4 border-b border-border/40 text-center transition-colors duration-300 ${rowHighlight ? "bg-amber-500/5 dark:bg-amber-500/10" : ""}`}>
                                <span className={`text-xs md:text-sm font-medium leading-relaxed ${val ? "text-foreground" : "text-muted-foreground/60 italic"}`}>
                                  {val || "Belirtilmemiş"}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}

                    {/* Memory specs */}
                    <tr>
                      <td colSpan={items.length + 1} className="bg-muted/30 px-4 py-2.5 border-b border-border/40">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-muted-foreground/40" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bellek ve Depolama</span>
                        </div>
                      </td>
                    </tr>
                    {SPEC_DEFS.filter(s => s.category === "memory").map((spec) => {
                      const diff = isDifferent(spec)
                      const rowHighlight = highlightDiffs && diff
                      return (
                        <tr key={spec.key} className={`transition-colors duration-300 ${rowHighlight ? "bg-amber-500/5 dark:bg-amber-500/10" : "hover:bg-muted/20"}`}>
                          <td className={`sticky left-0 z-10 p-4 border-b border-r border-border/40 transition-colors duration-300 ${rowHighlight ? "bg-amber-500/5 dark:bg-amber-500/10" : "bg-card"}`}>
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${spec.accent}`}>{spec.icon}</div>
                              <span className="text-xs font-bold text-muted-foreground">{spec.label}</span>
                            </div>
                          </td>
                          {items.map((product) => {
                            const slug = product.slug ?? createSlug(product.name || product.sistemAdi, product.magaza)
                            const val = spec.getValue(product)
                            return (
                              <td key={slug} className={`p-4 border-b border-border/40 text-center transition-colors duration-300 ${rowHighlight ? "bg-amber-500/5 dark:bg-amber-500/10" : ""}`}>
                                <span className={`text-xs md:text-sm font-medium leading-relaxed ${val ? "text-foreground" : "text-muted-foreground/60 italic"}`}>
                                  {val || "Belirtilmemiş"}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}

                    {/* Chassis specs */}
                    <tr>
                      <td colSpan={items.length + 1} className="bg-muted/30 px-4 py-2.5 border-b border-border/40">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-muted-foreground/40" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Kasa ve Güç</span>
                        </div>
                      </td>
                    </tr>
                    {SPEC_DEFS.filter(s => s.category === "chassis").map((spec) => {
                      const diff = isDifferent(spec)
                      const rowHighlight = highlightDiffs && diff
                      return (
                        <tr key={spec.key} className={`transition-colors duration-300 ${rowHighlight ? "bg-amber-500/5 dark:bg-amber-500/10" : "hover:bg-muted/20"}`}>
                          <td className={`sticky left-0 z-10 p-4 border-b border-r border-border/40 transition-colors duration-300 ${rowHighlight ? "bg-amber-500/5 dark:bg-amber-500/10" : "bg-card"}`}>
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${spec.accent}`}>{spec.icon}</div>
                              <span className="text-xs font-bold text-muted-foreground">{spec.label}</span>
                            </div>
                          </td>
                          {items.map((product) => {
                            const slug = product.slug ?? createSlug(product.name || product.sistemAdi, product.magaza)
                            const val = spec.getValue(product)
                            return (
                              <td key={slug} className={`p-4 border-b border-border/40 text-center transition-colors duration-300 ${rowHighlight ? "bg-amber-500/5 dark:bg-amber-500/10" : ""}`}>
                                <span className={`text-xs md:text-sm font-medium leading-relaxed ${val ? "text-foreground" : "text-muted-foreground/60 italic"}`}>
                                  {val || "Belirtilmemiş"}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}

                    {/* Action row */}
                    <tr className="bg-muted/10">
                      <td className="sticky left-0 z-10 bg-card p-4 border-r border-border/40" />
                      {items.map((product) => {
                        const slug = product.slug ?? createSlug(product.name || product.sistemAdi, product.magaza)
                        return (
                          <td key={slug} className="p-4 text-center">
                            <div className="flex flex-col gap-2 max-w-[160px] mx-auto">
                              <Button
                                size="sm"
                                className="rounded-full font-bold gap-1.5 shadow-sm w-full text-xs h-9"
                                disabled={!product.stoktaVarMi}
                                asChild
                              >
                                <a href={product.siteUrl} target="_blank" rel="nofollow noopener noreferrer">
                                  İncele
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full font-bold text-xs w-full h-9"
                                onClick={() => setLocation(`/sistem/${slug}`)}
                              >
                                Detay
                              </Button>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex md:hidden items-center justify-center gap-2 mt-4 text-xs text-muted-foreground/60 animate-pulse" aria-hidden="true">
                <ArrowRight className="w-3.5 h-3.5" />
                Karşılaştırmayı görmek için kaydırın
                <ArrowLeft className="w-3.5 h-3.5" />
              </div>
            </>
          ) : items.length === 1 ? (
            <div className="rounded-2xl border border-dashed border-border/30 bg-gradient-to-b from-muted/10 to-background p-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-5 ring-1 ring-primary/10">
                <Plus className="w-8 h-8 text-primary/60" />
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-2">Bir Sistem Daha Ekleyin</h2>
              <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
                Şu anda <strong className="text-foreground">1 sistem</strong> seçili. Karşılaştırma yapabilmek için en az 2 sistem gerekiyor.
              </p>
              <div className="flex items-center justify-center gap-2 mt-6">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/5 text-primary text-xs font-bold border border-primary/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  1 / 4
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/30 bg-gradient-to-b from-muted/10 to-background p-16 md:p-20 text-center">
              <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center mx-auto mb-6 ring-1 ring-primary/10 shadow-lg shadow-primary/5">
                <Star className="w-10 h-10 text-primary/30" />
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-3">Henüz Sistem Seçilmedi</h2>
              <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed mb-8">
                Sistem kartlarındaki <strong className="text-foreground font-bold bg-muted/50 px-1.5 py-0.5 rounded">Karşılaştır</strong> butonuna tıklayarak 
                sistemi karşılaştırma listenize ekleyin, ardından bu sayfada detaylı karşılaştırmayı görüntüleyin.
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-bold border border-border/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                  0 / 4
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/")}
                  className="rounded-full text-xs font-bold gap-1.5 h-9"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Sisteme Git
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Scroll to top button */}
        {pageScrolled && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-24 right-6 z-40 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 transition-all duration-300 animate-in fade-in zoom-in-75"
            aria-label="Yukarı çık"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
        )}

        {/* Loading overlay for URL params */}
        {loadingUrl && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">Karşılaştırma yükleniyor...</p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}