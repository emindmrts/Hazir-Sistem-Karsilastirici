import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Analytics } from "@vercel/analytics/react"
import { ThemeProvider } from "./components/theme-provider"
import { Layout } from "./components/layout"
import { ProductCard } from "./components/product-card"
import { FilterSidebar } from "./components/filter-sidebar"
import { useProducts } from "./hooks/use-products"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, SearchX, SlidersHorizontal } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

function AppContent() {
  const {
    products, totalCount, isLoading, error,
    filters, setFilters, resetFilters,
    page, setPage, totalPages,
    pageSize, setPageSize,
    sortOrder, setSortOrder,
  } = useProducts()

  const activeFilterCount =
    filters.stores.length +
    filters.cpuBrands.length +
    filters.gpuBrands.length +
    (filters.minPrice !== "" ? 1 : 0) +
    (filters.maxPrice !== "" ? 1 : 0) +
    (filters.inStock ? 1 : 0)

  // Top bar ref – animates in on mount
  const topBarRef = useRef<HTMLDivElement>(null)

  // Grid container – used as ScrollTrigger parent
  const gridRef = useRef<HTMLDivElement>(null)

  // Animate top bar on first render (Removed for production stability)
  useEffect(() => {
    // Top bar is now visible by default to prevent issues on Vercel
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
      activeFilterCount={activeFilterCount}
      sidebarContent={
        <FilterSidebar filters={filters} setFilters={setFilters} onReset={resetFilters} />
      }
    >
      <div className="flex flex-col gap-6">
        {/* Top bar / Filter Bar */}
        <div ref={topBarRef} className="sticky top-[56px] md:static z-30 bg-background/95 backdrop-blur-md -mx-4 px-4 py-3 border-b border-border/40 md:border-0 md:p-0 md:bg-transparent md:mx-0 md:mb-2">
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
      </div>
    </Layout>
  )
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="sistem-ui-theme">
      <AppContent />
      <Analytics />
    </ThemeProvider>
  )
}
