import { useEffect, useRef, lazy, Suspense } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Router, Route, Switch } from "wouter"
import { ThemeProvider } from "./components/theme-provider"
import { Layout } from "./components/layout"
import { ProductCard } from "./components/product-card"
import { FilterSidebar } from "./components/filter-sidebar"
// Detay sayfası ayrı chunk'ta yüklensin (anasayfa paketi küçülür)
const DetailPage = lazy(() =>
  import("./components/detail-page").then((m) => ({ default: m.DetailPage }))
)
import { SEO } from "./components/seo"
import { useProducts, useProductDetail } from "./hooks/use-products"
import { CompareProvider, isCompareEnabled } from "./hooks/use-compare"
import { FavoritesProvider } from "./hooks/use-favorites"
import { CompareBar } from "./components/compare-bar"
const ComparePage = lazy(() =>
  import("./components/compare-page").then((m) => ({ default: m.ComparePage }))
)
const FavoritesPage = lazy(() =>
  import("./components/favorites-page").then((m) => ({ default: m.FavoritesPage }))
)
const BlogPage = lazy(() =>
  import("./components/blog-page").then((m) => ({ default: m.BlogPage }))
)
const BlogArticlePage = lazy(() =>
  import("./components/blog-article-page").then((m) => ({ default: m.BlogArticlePage }))
)
import { PwaInstallBanner } from "./components/pwa-install-banner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, SearchX, SlidersHorizontal } from "lucide-react"
import { findBySlug } from "./hooks/use-slugs"

gsap.registerPlugin(ScrollTrigger)

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

  useEffect(() => {
    // Top bar visible by default
  }, [])

  useEffect(() => {
    if (!gridRef.current || isLoading) return

    const cards = gridRef.current.querySelectorAll<HTMLElement>(".product-card")
    if (!cards.length) return

    ScrollTrigger.getAll().forEach(t => t.kill())

    gsap.fromTo(
      cards,
      { opacity: 0, y: 40, scale: 0.96 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.45,
        ease: "power3.out",
        stagger: 0.035,
        clearProps: "transform",
      }
    )
  }, [products, isLoading])

  const handleSearchChange = (val: string) => {
    setFilters(prev => ({ ...prev, searchStr: val }))
    setPage(1)
  }

  // Generate JSON-LD for SEO
  const schemaProducts = products
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
      "itemListElement": schemaProducts.slice(0, 10).map((p, i) => ({
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
    ? `"${filters.searchStr}" için Türkiye'nin tüm bilgisayar mağazalarındaki hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın.`
    : "Türkiye'nin tüm bilgisayar mağazalarındaki hazır sistemleri fiyat, işlemci ve ekran kartına göre karşılaştırın. İtopya, Vatan, Sinerji, Gaming Gen ve daha fazlasında en uygun sistemi bulun."

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
        <header className="flex flex-col gap-1.5">
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
                className="md:hidden h-8 px-3 rounded-full gap-1.5 font-bold text-[11px] border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 active:scale-95 transition-all"
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

              <Select value={sortOrder} onValueChange={(v: "lowToHigh" | "highToLow") => setSortOrder(v)}>
                <SelectTrigger className="h-8 w-auto min-w-[110px] sm:w-[180px] text-[11px] font-bold rounded-full bg-background border-border/60 uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
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
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground">
              <SearchX className="w-8 h-8 opacity-80" />
            </div>
            <h3 className="text-xl font-bold tracking-tight mb-2">Sonuç Bulunamadı</h3>
            <p className="text-muted-foreground mb-6 max-w-sm text-sm">
              Daha fazla sonuç görmek için filtreleri sıfırlamayı deneyin.
            </p>
            <Button variant="outline" onClick={resetFilters}>Filtreleri Sıfırla</Button>
          </div>
        )}

        {/* Grid — cards are tagged with .product-card for GSAP selector */}
        {!isLoading && (
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
            {products.map((p, i) => (
              <div key={i} className="product-card opacity-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && products.length > 0 && (
          <div className="flex items-center justify-between pt-6 border-t border-border/60 mt-2">
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

        {/* FAQ — visible content matching FAQPage schema */}
        <section aria-labelledby="faq-heading" className="mt-10 border-t border-border/60 pt-8">
          <h2 id="faq-heading" className="text-lg md:text-xl font-black tracking-tight mb-4">
            Sıkça Sorulan Sorular
          </h2>
          <div className="flex flex-col gap-2">
            {HOME_FAQ.map((f, i) => (
              <details
                key={i}
                className="group rounded-xl border border-border/60 bg-card/50 px-4 py-3 open:bg-card"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold list-none">
                  {f.question}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  )
}

function DetailRoute({ params }: { params: { slug: string } }) {
  // Önce API'den tek ürünü dene (sayfalama modunda tüm veri istemcide yok).
  const api = useProductDetail(params.slug)
  if (api.product) {
    return (
      <Suspense fallback={<DetailLoading />}>
        <DetailPage product={api.product} allProducts={[]} similarProducts={api.similar ?? []} priceHistory={api.priceHistory} />
      </Suspense>
    )
  }
  if (api.loading) {
    return <DetailLoading />
  }
  // API yoksa eski akış: tüm katalog + slug eşleşmesi.
  return <LegacyDetailRoute slug={params.slug} />
}

function DetailLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm font-bold text-muted-foreground">Yükleniyor...</p>
    </div>
  )
}

function LegacyDetailRoute({ slug }: { slug: string }) {
  const { allProducts } = useProducts()
  const product = findBySlug(allProducts, slug)
  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-center px-4">
        <p className="text-6xl font-black text-muted/40">404</p>
        <p className="text-lg font-bold">Sistem bulunamadı.</p>
        <Button variant="outline" onClick={() => window.history.back()}>Geri Dön</Button>
      </div>
    )
  }
  return (
    <Suspense fallback={<DetailLoading />}>
      <DetailPage product={product} allProducts={allProducts} />
    </Suspense>
  )
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="sistem-ui-theme">
      <CompareProvider>
        <FavoritesProvider>
          <Router>
            <Switch>
            <Route path="/sistem/:slug" component={DetailRoute} />
            {/* Karşılaştırma yayında değilken rota kapalı (localhost hariç) */}
            {isCompareEnabled() && (
              <Route path="/karsilastir">
                <Suspense fallback={<DetailLoading />}>
                  <ComparePage />
                </Suspense>
              </Route>
            )}
              <Route path="/favoriler">
                <Layout sidebarContent={null}>
                  <Suspense fallback={<DetailLoading />}>
                    <FavoritesPage />
                  </Suspense>
                </Layout>
              </Route>
              <Route path="/blog">
                <Layout sidebarContent={null}>
                  <Suspense fallback={<DetailLoading />}>
                    <BlogPage />
                  </Suspense>
                </Layout>
              </Route>
              <Route path="/blog/:slug">
                {({ slug }) => (
                  <Layout sidebarContent={null}>
                    <Suspense fallback={<DetailLoading />}>
                      <BlogArticlePage key={slug ?? ""} slug={slug ?? ""} />
                    </Suspense>
                  </Layout>
                )}
              </Route>
              <Route path="/">
                <AppContent />
              </Route>
              {/* Path'siz Route her zaman eşleşir → tanımsız URL'lerde 404 ekranı */}
              <Route>
                <NotFound />
              </Route>
            </Switch>
            {isCompareEnabled() && <CompareBar />}
            <PwaInstallBanner />
          </Router>
        </FavoritesProvider>
      </CompareProvider>
    </ThemeProvider>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-center px-4">
      <p className="text-6xl font-black text-muted/40">404</p>
      <p className="text-lg font-bold">Aradığın sayfa bulunamadı.</p>
      <Button variant="outline" onClick={() => (window.location.href = "/")}>Anasayfaya Dön</Button>
    </div>
  )
}
