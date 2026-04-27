import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ThemeProvider } from "./components/theme-provider"
import { Layout } from "./components/layout"
import { ProductCard } from "./components/product-card"
import { FilterSidebar } from "./components/filter-sidebar"
import { useProducts } from "./hooks/use-products"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

function AppContent() {
  const {
    products, totalCount, isLoading, error,
    filters, setFilters, resetFilters,
    page, setPage, totalPages,
    pageSize, setPageSize,
    sortOrder, setSortOrder,
  } = useProducts()

  // Top bar ref – animates in on mount
  const topBarRef = useRef<HTMLDivElement>(null)

  // Grid container – used as ScrollTrigger parent
  const gridRef = useRef<HTMLDivElement>(null)

  // Animate top bar on first render
  useEffect(() => {
    if (!topBarRef.current) return
    gsap.fromTo(
      topBarRef.current,
      { opacity: 0, y: -16 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", delay: 0.35 }
    )
  }, [])

  // Re-run card animation whenever products change (page change / filter change)
  useEffect(() => {
    if (!gridRef.current || isLoading) return

    const cards = gridRef.current.querySelectorAll<HTMLElement>(".product-card")
    if (!cards.length) return

    // Kill any existing ScrollTriggers from previous renders
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

  return (
    <Layout
      searchValue={filters.searchStr}
      onSearchChange={handleSearchChange}
      sidebarContent={
        <FilterSidebar filters={filters} setFilters={setFilters} onReset={resetFilters} />
      }
    >
      <div className="flex flex-col gap-6">
        {/* Top bar */}
        <div ref={topBarRef} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between opacity-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sonuç:</span>
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary ring-1 ring-inset ring-primary/20">
              {totalCount.toLocaleString("tr-TR")} ürün
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden md:inline">Sıralama:</span>
              <Select value={sortOrder} onValueChange={(v: "lowToHigh" | "highToLow") => setSortOrder(v)}>
                <SelectTrigger className="h-8 w-[180px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lowToHigh">Fiyat ↑ (Düşük → Yüksek)</SelectItem>
                  <SelectItem value="highToLow">Fiyat ↓ (Yüksek → Düşük)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden md:inline">Sayfa:</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
                <SelectTrigger className="h-8 w-[72px] text-sm">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
      </div>
    </Layout>
  )
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="sistem-ui-theme">
      <AppContent />
    </ThemeProvider>
  )
}
