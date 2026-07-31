import { useEffect, useRef, useState, lazy, Suspense } from "react"
import { gsap } from "gsap"
import { Router, Route, Switch } from "wouter"
import { ThemeProvider } from "./components/theme-provider"
import { Layout } from "./components/layout"
import { ProductCard } from "./components/product-card"
import { FilterSidebar } from "./components/filter-sidebar"
import { SEO } from "./components/seo"
import { useProducts, type SortOrder } from "./hooks/use-products"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, SearchX, SlidersHorizontal } from "lucide-react"
import { findBySlug } from "./hooks/use-slugs"
import { CompareProvider } from "./hooks/use-compare"
import { CompareBar } from "./components/compare-bar"
import { CompareModal } from "./components/compare-modal"

// Ağır sayfalar ilk yüklemede gerekmez; isteğe bağlı (route bazlı) yüklenir.
const DetailPage = lazy(() => import("./components/detail-page").then(m => ({ default: m.DetailPage })))

function RouteFallback() {
    return (
        <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
    )
}

const HOME_FAQ = [
  {
    question: "Hazır sistem bilgisayar nedir?",
    answer:
      "Hazır sistem, işlemci, ekran kartı, anakart, RAM, depolama ve güç kaynağı gibi tüm parçaları önceden monte edilmiş, kutusundan çıktığı gibi kullanıma hazır masaüstü bilgisayardır. Parça uyumluluğu ile uğraşmadan doğrudan satın alabilirsiniz.",
  },
  {
    question: "En uygun hazır sistemi nasıl bulabilirim?",
    answer:
      "PcKarşılaştır.com Türkiye'nin önde gelen mağazalarındaki hazır sistemleri tek ekranda toplar. İşlemci, ekran kartı, mağaza ve fiyat aralığına göre filtreleyip fiyata göre sıralayarak bütçenize en uygun sistemi saniyeler içinde bulabilirsiniz.",
  },
  {
    question: "Hangi mağazaların hazır sistemleri karşılaştırılıyor?",
    answer:
      "Vatan Bilgisayar, İtopya, Sinerji, PCKolik, İncehesap, Gaming.Gen.TR, Game Garaj ve Tebilon gibi Türkiye'nin popüler teknoloji mağazalarının hazır sistem bilgisayarları karşılaştırılmaktadır.",
  },
  {
    question: "Fiyatlar ne sıklıkla güncelleniyor?",
    answer:
      "Fiyat ve stok bilgileri her gece otomatik olarak güncellenmektedir. Böylece güncel fiyatlar üzerinden karşılaştırma yapabilirsiniz. Nihai fiyat için ilgili mağazanın sayfasını kontrol etmeniz önerilir.",
  },
  {
    question: "Fiyat/performans (F/P) puanı nedir?",
    answer:
      "F/P puanı, bir sistemin donanımını fiyatına göre değerlendiren deneysel (beta) bir referans skorudur. Kaba bir karşılaştırma aracıdır; tek başına satın alma kararı için kullanılmamalıdır.",
  },
  {
    question: "RTX 5060 mı RTX 5070 mi almalıyım?",
    answer:
      "1080p monitör ile oyun oynuyorsanız RTX 5060 yeterli. 1440p veya yüksek yenileme hızı (144Hz+) istiyorsanız RTX 5070 tercih edin. RTX 5070, RTX 5060'dan yaklaşık %35-40 daha yüksek FPS üretir.",
  },
  {
    question: "Ryzen 5 mi Ryzen 7 mi?",
    answer:
      "Sadece oyun oynayacaksanız Ryzen 5 yeterli ve fiyat/performans açısından daha mantıklı. Oyun yanı sıra video edit, streaming veya içerik üretimi yapacaksanız Ryzen 7'nin 8 çekirdeği avantaj sağlar. X3D serisi (7800X3D) en yüksek oyun FPS'ini sunar.",
  },
  {
    question: "Hazır sistem mi yoksa pc toplama mı?",
    answer:
      "Hazır sistem; montaj, test, uyumluluk ve garanti avantajı sunar. PC toplama ise aynı bütçeyle %10-15 daha güçlü parçalar seçmenizi sağlar. Ancak teknik bilgi gerektirir. Hazır sistem, çoğu kullanıcı için daha az riskli ve daha pratik bir seçenektir.",
  },
  {
    question: "Kaç GB RAM olmalı?",
    answer:
      "Oyun için minimum 16GB RAM önerilir. İçerik üretimi (video edit, 3D render) için 32GB idealdir. Çift kanal (2x8GB) bellek, tek modüle göre daha performanslıdır.",
  },
  {
    question: "Hazır sistemde güç kaynağı neden önemli?",
    answer:
      "Güç kaynağı, sistem kararlılığı için kritiktir. 80+ Bronze minimum, 80+ Gold ve üzeri önerilir. RTX 5060 için 550W, RTX 5070 için 650W, RTX 5080 için 750W, RTX 5090 için 1000W+ gerekir. Kalitesiz PSU, sistem kapanması ve donanım hasarına yol açabilir.",
  },
]

function AppContent() {
  const {
    products, totalCount, isLoading, error,
    filters, setFilters, resetFilters,
    page, setPage, totalPages,
    pageSize, setPageSize,
    sortOrder, setSortOrder,
    availableCpuModels,
  } = useProducts()

  const activeFilterCount =
    filters.stores.length +
    filters.cpuBrands.length +
    filters.cpuSeries.length +
    (filters.cpuModels?.length || 0) +
    filters.gpuBrands.length +
    filters.gpuSeries.length +
    (filters.minPrice !== "" ? 1 : 0) +
    (filters.maxPrice !== "" ? 1 : 0) +
    (filters.inStock ? 1 : 0)

  const topBarRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLElement>(null)
  const skeletonRef = useRef<HTMLDivElement>(null)
  const emptyRef = useRef<HTMLDivElement>(null)
  const paginationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Heading entrance (SEO H1 + description)
    if (headingRef.current) {
      const [h1, desc] = headingRef.current.children
      const tl = gsap.timeline({ defaults: { ease: "power3.out", force3D: true } })
      tl.fromTo(h1, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5 })
        .fromTo(desc, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.4 }, "-=0.3")
    }

    // Top bar entrance
    if (topBarRef.current) {
      gsap.fromTo(topBarRef.current,
        { opacity: 0, y: -16 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", clearProps: "transform", force3D: true }
      )
    }
  }, [])

  useEffect(() => {
    if (!gridRef.current || isLoading) return

    const grid = gridRef.current
    const cards = grid.querySelectorAll<HTMLElement>(".product-card")
    if (!cards.length) return

    // Entrance stagger
    const isBelow = window.scrollY > 200
    gsap.fromTo(cards,
      { opacity: 0, y: isBelow ? 50 : -50, scale: 0.96 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.5,
        ease: "power3.out",
        stagger: { each: 0.03, from: isBelow ? "end" : "start" },
        clearProps: "transform",
        force3D: true,
      }
    )

    // Top-card glow (smart sort) — boxShadow paint tetikler; CSS transition ile,
    // layout/forced reflow olmadan.
    if (cards.length > 0 && sortOrder === "smart") {
      const top = cards[0]
      top.style.setProperty("box-shadow", "0 0 20px rgba(59,130,246,0.12)")
      top.style.setProperty("transition", "box-shadow 1s ease")
    }

    // Scroll fade — ScrollTrigger yerine IntersectionObserver (reflow yok, daha ucuz).
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            gsap.to(entry.target, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", clearProps: "transform" })
            io.unobserve(entry.target)
          }
        }
      },
      { rootMargin: "80px 0px" }
    )
    cards.forEach(card => {
      card.style.opacity = "0"
      card.style.transform = "translateY(24px)"
      card.style.willChange = "transform, opacity"
      io.observe(card)
    })
    return () => io.disconnect()
  }, [products, isLoading, sortOrder])

  // Skeleton stagger entrance
  useEffect(() => {
    if (!skeletonRef.current || !isLoading) return
    const skeletons = skeletonRef.current.children
    if (!skeletons.length) return
    gsap.fromTo(skeletons,
      { opacity: 0, y: 20, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.3, stagger: 0.04, ease: "power2.out" }
    )
  }, [isLoading])

  // Empty state entrance
  useEffect(() => {
    if (!emptyRef.current) return
    gsap.fromTo(emptyRef.current,
      { opacity: 0, y: 20, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" }
    )
  }, [products.length === 0])

  // Pagination entrance
  useEffect(() => {
    if (!paginationRef.current) return
    gsap.fromTo(paginationRef.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.4, delay: 0.3, ease: "power2.out" }
    )
  }, [products, page])

  const handleSearchChange = (val: string) => {
    setFilters(prev => ({ ...prev, searchStr: val }))
    setPage(1)
  }

  // Generate JSON-LD for SEO
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "PcKarşılaştır.com - Hazır Sistem Karşılaştırma",
    "description": "Türkiye'nin tüm bilgisayar mağazalarındaki hazır sistem bilgisayarlarını karşılaştırın.",
    "url": "https://www.pckarsilastir.com",
    "mainEntity": {
      "@type": "ItemList",
      "name": "Hazır Sistemler",
      "numberOfItems": totalCount,
      "itemListElement": products.slice(0, 10).map((p, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "item": {
          "@type": "Product",
          "name": p.sistemAdi || p.name,
          "description": `${p.islemci || "Yüksek performanslı"} işlemci ve ${p.ekranKarti || "güçlü"} ekran kartına sahip hazır sistem.`,
          "image": p.resimUrl || p.image,
          "offers": {
            "@type": "Offer",
            "price": p.fiyat || p.price,
            "priceCurrency": "TRY",
            "availability": p.stoktaVarMi ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "url": p.siteUrl || p.url
          },
          "brand": {
            "@type": "Brand",
            "name": p.magaza || p.store
          }
        }
      }))
    }
  }

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "PcKarşılaştır.com",
    "url": "https://www.pckarsilastir.com",
    "inLanguage": "tr-TR",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://www.pckarsilastir.com/?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": HOME_FAQ.map(f => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": { "@type": "Answer", "text": f.answer }
    }))
  }

  const jsonLd = [collectionJsonLd, websiteJsonLd, faqJsonLd]

  const dynamicTitle = filters.searchStr 
    ? `"${filters.searchStr}" İçin Hazır Sistemler` 
    : "En Uygun Hazır Sistemleri Karşılaştırın"

  const dynamicDescription = filters.searchStr
    ? `"${filters.searchStr}" için Türkiye'nin mağazalarındaki hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın.`
    : "Türkiye'nin tüm mağazalarındaki hazır sistemleri fiyat, işlemci ve ekran kartına göre karşılaştırın. İtopya, Vatan, Sinerji ve daha fazlasında en uygun sistemi bulun."

  return (
    <Layout
      searchValue={filters.searchStr}
      onSearchChange={handleSearchChange}
      activeFilterCount={activeFilterCount}
      sidebarContent={
        <FilterSidebar filters={filters} setFilters={setFilters} onReset={resetFilters} availableCpuModels={availableCpuModels} />
      }
    >
      <SEO 
        title={dynamicTitle} 
        description={dynamicDescription}
        keywords="hazır sistem, hazır sistem fiyatları, bilgisayar karşılaştırma, pc toplama, itopya hazır sistem, vatan hazır sistem, sinerji sistem, gaming pc, oyuncu bilgisayarı, uygun fiyatlı sistem, ekran kartı, işlemci"
        jsonLd={jsonLd}
      />
      <div className="flex flex-col gap-6">
        {/* Page heading (SEO H1) */}
        <header ref={headingRef} className="flex flex-col gap-1.5">
          <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight">
            Hazır Sistem Bilgisayar Fiyatları ve Karşılaştırması
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            İtopya, Vatan, Sinerji, Gaming Gen, PCKolik ve daha fazla mağazadaki hazır sistem
            bilgisayarları tek ekranda karşılaştırın. İşlemci, ekran kartı ve fiyata göre
            filtreleyerek bütçenize en uygun oyuncu ve ofis sistemini bulun.
          </p>
        </header>

        {/* Top bar / Filter Bar */}
        <div ref={topBarRef} className="sticky top-[56px] md:static z-30 bg-background/95 backdrop-blur-md -mx-4 px-4 py-3 border-b border-border/40 md:border-0 md:p-0 md:bg-transparent md:mx-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">Sonuç</span>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary ring-1 ring-inset ring-primary/20">
                {totalCount}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-1 justify-end">
              {/* Mobile Filter Trigger */}
              <Button
                variant="outline"
                size="sm"
                className="btn-press md:hidden h-8 px-3 rounded-full gap-1.5 font-bold text-[11px] border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:shadow-sm transition-all"
                onClick={() => {
                  const trigger = document.getElementById("mobile-filter-fab")
                  trigger?.click()
                }}
              >
                <SlidersHorizontal className="w-3 h-3" />
                FİLTRELE
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-black px-1">
                    {activeFilterCount}
                  </span>
                )}
              </Button>

              <Select value={sortOrder} onValueChange={(v: SortOrder) => setSortOrder(v)}>
                <SelectTrigger className="h-8 w-auto min-w-[110px] sm:w-[180px] text-[11px] font-bold rounded-full bg-background border-border/60 uppercase transition-all active:scale-95">
                  <SelectValue placeholder="Sıralama" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smart">Akıllı Sıralama</SelectItem>
                  <SelectItem value="lowToHigh">Ucuzdan Pahalıya</SelectItem>
                  <SelectItem value="highToLow">Pahalıdan Ucuza</SelectItem>
                </SelectContent>
              </Select>

              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
                <SelectTrigger className="h-8 w-[55px] text-[11px] font-bold rounded-full bg-background border-border/60 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[60, 120, 240, 480].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div ref={skeletonRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/50 overflow-hidden">
                <div className="shimmer aspect-[4/3] w-full" />
                <div className="p-4 space-y-3">
                  <div className="shimmer h-4 rounded w-full" />
                  <div className="shimmer h-3 rounded w-3/4" />
                  <div className="shimmer h-3 rounded w-1/2" />
                </div>
                <div className="shimmer h-14 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center">
            <p className="text-destructive font-semibold">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && products.length === 0 && (
          <div ref={emptyRef} className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground">
              <SearchX className="w-8 h-8 opacity-80" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2">Sonuç Bulunamadı</h2>
            <p className="text-muted-foreground mb-6 max-w-sm text-sm">
              Daha fazla sonuç görmek için filtreleri sıfırlamayı deneyin.
            </p>
            <Button variant="outline" onClick={resetFilters}>Filtreleri Sıfırla</Button>
          </div>
        )}

        {/* Grid — cards are tagged with .product-card for GSAP selector */}
        {!isLoading && (
          <>
            <h2 className="sr-only">Sistem Listesi</h2>
            <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
              {products.map((p, i) => (
                <div key={p.slug ?? p.sistemAdi + p.magaza} className="product-card opacity-0">
                  <ProductCard product={p} priority={i < 4} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {!isLoading && products.length > 0 && (
          <div ref={paginationRef} className="flex items-center justify-between pt-6 border-t border-border/60 mt-2">
            <Button
              variant="outline" size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              Önceki
            </Button>
            <span className="text-sm text-muted-foreground bg-muted/60 px-4 py-1.5 rounded-full font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline" size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="gap-1.5"
            >
              Sonraki
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}




        {/* Scroll-to-top FAB */}
        {!isLoading && products.length > 0 && (
          <ScrollToTop />
        )}
      </div>
    </Layout>
  )
}

function ScrollToTop() {
  const [visible, setVisible] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!btnRef.current) return
    gsap.to(btnRef.current, {
      opacity: visible ? 1 : 0,
      scale: visible ? 1 : 0.8,
      duration: 0.25,
      ease: "power2.out",
      pointerEvents: visible ? "auto" as const : "none" as const,
    })
  }, [visible])

  return (
    <button
      ref={btnRef}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-24 right-4 z-40 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-shadow flex items-center justify-center"
      style={{ opacity: 0, scale: 0.8, pointerEvents: "none" }}
      aria-label="Yukarı Çık"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  )
}

function DetailRoute({ params }: { params: { slug: string } }) {
  const { allProducts } = useProducts()
  const product = findBySlug(allProducts, params.slug)
  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-5 text-center px-4 py-16">
        <SEO
          title="Sayfa Bulunamadı (404)"
          description="Aradığınız hazır sistem sayfası bulunamadı."
        />
        <div className="w-14 h-14 rounded-xl bg-muted/60 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40">
            <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-bold">Sistem bulunamadı.</p>
          <p className="text-xs text-muted-foreground mt-1">Aradığınız sayfa kaldırılmış veya taşınmış olabilir.</p>
        </div>
        <div className="flex gap-2">
          <a href="/" className="h-9 px-4 inline-flex items-center rounded-full text-xs font-bold bg-primary text-primary-foreground">Anasayfa</a>
          <a href="/itopya-hazir-sistem" className="h-9 px-4 inline-flex items-center rounded-full text-xs font-bold bg-muted/60 border border-border/60">İtopya</a>
          <a href="/vatan-hazir-sistem" className="h-9 px-4 inline-flex items-center rounded-full text-xs font-bold bg-muted/60 border border-border/60">Vatan</a>
        </div>
      </div>
    )
  }
  return (
    <Suspense fallback={<RouteFallback />}>
      <DetailPage product={product} allProducts={allProducts} />
    </Suspense>
  )
}

function LandingRoute({ params }: { params: { slug: string } }) {
  // Landing pages (e.g. /itopya-hazir-sistem) render AppContent with
  // filters pre-applied via the landingPath detection in useProducts.
  // The static HTML at /{slug}.html already has SEO content for crawlers.
  void params
  return <AppContent />
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="sistem-ui-theme">
      <CompareProvider>
        <Router>
          <Switch>
            <Route path="/sistem/:slug" component={DetailRoute} />
            <Route path="/itopya-hazir-sistem" component={LandingRoute} />
            <Route path="/vatan-hazir-sistem" component={LandingRoute} />
            <Route path="/sinerji-hazir-sistem" component={LandingRoute} />
            <Route path="/pckolik-hazir-sistem" component={LandingRoute} />
            <Route path="/incehesap-hazir-sistem" component={LandingRoute} />
            <Route path="/gaminggen-hazir-sistem" component={LandingRoute} />
            <Route path="/gamegaraj-hazir-sistem" component={LandingRoute} />
            <Route path="/tebilon-hazir-sistem" component={LandingRoute} />
            <Route path="/rtx-5060-hazir-sistem" component={LandingRoute} />
            <Route path="/rtx-5070-hazir-sistem" component={LandingRoute} />
            <Route path="/rtx-5080-hazir-sistem" component={LandingRoute} />
            <Route path="/rtx-5090-hazir-sistem" component={LandingRoute} />
            <Route path="/rtx-4060-hazir-sistem" component={LandingRoute} />
            <Route path="/rx-9060-hazir-sistem" component={LandingRoute} />
            <Route path="/rx-9070-hazir-sistem" component={LandingRoute} />
            <Route path="/ryzen-5-hazir-sistem" component={LandingRoute} />
            <Route path="/ryzen-7-hazir-sistem" component={LandingRoute} />
            <Route path="/ryzen-9-hazir-sistem" component={LandingRoute} />
            <Route path="/core-i5-hazir-sistem" component={LandingRoute} />
            <Route path="/core-ultra-hazir-sistem" component={LandingRoute} />
            <Route path="/gaming-pc" component={LandingRoute} />
            <Route path="/ucuz-hazir-sistem" component={LandingRoute} />
            <Route path="/oyuncu-bilgisayari" component={LandingRoute} />
            <Route path="/0-30000-tl-hazir-sistem" component={LandingRoute} />
            <Route path="/30000-50000-tl-hazir-sistem" component={LandingRoute} />
            <Route path="/50000-100000-tl-hazir-sistem" component={LandingRoute} />
            <Route path="/100000-tl-uzeri-hazir-sistem" component={LandingRoute} />
            <Route path="/hazir-sistem-nasil-secilir" component={LandingRoute} />
            <Route path="/rtx-5060-vs-rtx-5070" component={LandingRoute} />
            <Route path="/ryzen-5-vs-ryzen-7" component={LandingRoute} />
            <Route path="/">
              <AppContent />
            </Route>
          </Switch>
        </Router>
        <CompareBar />
        <CompareModal />
      </CompareProvider>
    </ThemeProvider>
  )
}
