import { useCompare } from "@/hooks/use-compare"
import { Button } from "@/components/ui/button"
import { X, GitCompareArrows, Trash2 } from "lucide-react"
import { createSlug } from "@/hooks/use-slugs"

function getLogoUrl(store: string) {
  const key = store.toLowerCase().replace(/[^a-z]/g, "")
  const validStores = ["vatan", "itopya", "gaminggen", "gamegaraj", "pckolik", "sinerji", "incehesap", "tebilon"]
  if (validStores.includes(key)) return `/logos/${key}.png`
  return null
}

export function CompareBar() {
  const { items, removeFromCompare, clearCompare, setModalOpen } = useCompare()

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 md:z-40 pointer-events-none">
      <div className="mx-auto max-w-screen-xl px-4 pb-4 md:pb-6">
        <div
          className="
            pointer-events-auto
            flex items-center gap-3
            rounded-2xl
            border border-border/60
            bg-background/80 backdrop-blur-xl
            shadow-2xl shadow-black/10
            dark:shadow-black/40
            p-3 md:p-4
            animate-in slide-in-from-bottom-4 duration-300 ease-out
          "
        >
          {/* Items */}
          <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-none min-w-0">
            {items.map((product) => {
              const slug = product.slug ?? createSlug(product.name || product.sistemAdi, product.magaza)
              const logo = getLogoUrl(product.magaza)
              return (
                <div
                  key={slug}
                  className="
                    relative flex items-center gap-2
                    shrink-0
                    rounded-xl border border-border/50
                    bg-card/80
                    p-2 pr-7
                    min-w-0 max-w-[200px]
                    group/item
                  "
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={product.resimUrl}
                      alt=""
                      width="40"
                      height="40"
                      className="w-full h-full object-contain p-0.5"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement
                        t.onerror = null
                        t.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.5'%3E%3Crect width='18' height='18' x='3' y='3' rx='2'/%3E%3C/svg%3E"
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      {logo ? (
                        <img src={logo} alt="" width="48" height="16" className="h-3 w-auto object-contain" />
                      ) : (
                        <span className="text-[8px] font-bold text-muted-foreground uppercase">{product.magaza}</span>
                      )}
                    </div>
                    <p className="text-[10px] font-semibold leading-tight truncate text-foreground/80">{product.sistemAdi}</p>
                    <p className="text-[10px] font-bold text-primary">{product.fiyat.toLocaleString("tr-TR")} ₺</p>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeFromCompare(slug)}
                    className="
                      absolute -top-1.5 -right-1.5
                      w-5 h-5 rounded-full
                      bg-destructive text-destructive-foreground
                      flex items-center justify-center
                      opacity-0 group-hover/item:opacity-100
                      transition-all duration-150
                      shadow-sm hover:scale-110 active:scale-90
                    "
                    title="Karşılaştırmadan Çıkar"
                    aria-label={`${product.sistemAdi} karşılaştırmadan çıkar`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}

            {/* Empty slots */}
            {Array.from({ length: 4 - items.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="
                  shrink-0 w-10 h-10 md:w-12 md:h-12
                  rounded-xl border-2 border-dashed border-border/40
                  flex items-center justify-center
                  text-muted-foreground/60
                "
              >
                <span className="text-[9px] font-bold">+</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCompare}
              className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90 transition-all"
              title="Listeyi Temizle"
              aria-label="Karşılaştırma listesini temizle"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              disabled={items.length < 2}
              className="
                h-9 px-4 rounded-full font-bold text-xs gap-2
                shadow-md hover:shadow-primary/30
                transition-all
              "
            >
              <GitCompareArrows className="w-4 h-4" />
              <span className="hidden sm:inline">Karşılaştır</span>
              <span className="sm:hidden">({items.length})</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
