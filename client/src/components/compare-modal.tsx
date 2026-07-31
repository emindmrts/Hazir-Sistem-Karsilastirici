import { useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useCompare } from "@/hooks/use-compare"
import { Button } from "@/components/ui/button"
import {
  X, ExternalLink, Cpu, LayoutGrid, MemoryStick,
  HardDrive, Zap, Box, Thermometer, ShieldCheck,
  Eye, EyeOff
} from "lucide-react"
import { useLocation } from "wouter"
import { createSlug } from "@/hooks/use-slugs"

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
  getValue: (p: typeof import("@/hooks/use-products").Product.prototype) => string | undefined
}

const SPEC_DEFS: SpecDef[] = [
  { key: "cpu", label: "İşlemci", icon: <Cpu className="w-4 h-4" />, getValue: (p: any) => p.islemci },
  { key: "gpu", label: "Ekran Kartı", icon: <LayoutGrid className="w-4 h-4" />, getValue: (p: any) => p.ekranKarti },
  { key: "ram", label: "RAM", icon: <MemoryStick className="w-4 h-4" />, getValue: (p: any) => p.ram },
  { key: "storage", label: "Depolama", icon: <HardDrive className="w-4 h-4" />, getValue: (p: any) => p.ssd ?? p.depolama },
  { key: "mobo", label: "Anakart", icon: <Thermometer className="w-4 h-4" />, getValue: (p: any) => p.anakart },
  { key: "case", label: "Kasa", icon: <Box className="w-4 h-4" />, getValue: (p: any) => p.kasa },
  { key: "psu", label: "Güç Kaynağı", icon: <Zap className="w-4 h-4" />, getValue: (p: any) => p.psu },
  { key: "cooler", label: "Soğutucu", icon: <Thermometer className="w-4 h-4" />, getValue: (p: any) => p.sogutucu },
]

export function CompareModal() {
  const { items, removeFromCompare, modalOpen, setModalOpen } = useCompare()
  const [highlightDiffs, setHighlightDiffs] = useState(false)
  const [, setLocation] = useLocation()

  if (items.length < 2) return null

  const minPrice = Math.min(...items.map(p => p.fiyat))

  function isDifferent(specDef: SpecDef): boolean {
    const values = items.map(p => (specDef.getValue(p) || "—").trim().toUpperCase())
    return new Set(values).size > 1
  }

  return (
    <DialogPrimitive.Root open={modalOpen} onOpenChange={setModalOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="
            fixed inset-4 md:inset-8 lg:inset-12 z-50
            flex flex-col
            rounded-2xl border border-border/60
            bg-background shadow-2xl
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
            data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
            duration-200
            overflow-hidden
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border/50 shrink-0">
            <div>
              <DialogPrimitive.Title className="text-lg font-black tracking-tight">
                Sistem Karşılaştırması
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground mt-0.5">
                {items.length} sistem karşılaştırılıyor
              </DialogPrimitive.Description>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHighlightDiffs(!highlightDiffs)}
                className="h-8 px-3 rounded-full text-[11px] font-bold gap-1.5"
              >
                {highlightDiffs ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {highlightDiffs ? "Vurgulamayı Kapat" : "Farkları Vurgula"}
              </Button>
              <DialogPrimitive.Close
                className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="Karşılaştırma penceresini kapat"
              >
                <X className="w-4 h-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse min-w-[600px]">
              {/* Product headers */}
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-background w-[140px] md:w-[160px] p-3 border-b border-r border-border/40" />
                  {items.map((product) => {
                    const slug = product.slug ?? createSlug(product.name || product.sistemAdi, product.magaza)
                    const logo = getLogoUrl(product.magaza)
                    return (
                      <th key={slug} className="p-3 border-b border-border/40 text-center align-top min-w-[180px] relative group">
                        {/* Remove button */}
                        <button
                          onClick={() => removeFromCompare(slug)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                          title="Çıkar"
                          aria-label={`${product.sistemAdi} karşılaştırmadan çıkar`}
                        >
                          <X className="w-3 h-3" />
                        </button>

                        {/* Image */}
                        <div className="w-24 h-24 mx-auto mb-3 rounded-xl bg-gradient-to-br from-muted/60 to-muted/20 flex items-center justify-center overflow-hidden">
                          <img
                            src={product.resimUrl}
                            alt=""
                            width="96"
                            height="96"
                            className="w-full h-full object-contain p-2"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              const t = e.target as HTMLImageElement
                              t.onerror = null
                              t.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.5'%3E%3Crect width='18' height='18' x='3' y='3' rx='2'/%3E%3C/svg%3E"
                            }}
                          />
                        </div>

                        {/* Store badge */}
                        <div className="flex items-center justify-center gap-1.5 mb-2">
                          {logo ? (
                            <img src={logo} alt="" width="56" height="14" className="h-3.5 w-auto object-contain" />
                          ) : (
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{product.magaza}</span>
                          )}
                        </div>

                        {/* Name */}
                        <p className="text-xs font-semibold leading-snug line-clamp-2 mb-1 px-1">{product.sistemAdi}</p>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              <tbody>
                {/* Price row */}
                <tr>
                  <td className="sticky left-0 z-10 bg-background p-3 border-b border-r border-border/40">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <span className="text-xs font-black">₺</span>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">Fiyat</span>
                    </div>
                  </td>
                  {items.map((product) => {
                    const slug = product.slug ?? createSlug(product.name || product.sistemAdi, product.magaza)
                    const isCheapest = product.fiyat === minPrice && items.length > 1
                    return (
                      <td key={slug} className="p-3 border-b border-border/40 text-center">
                        <p className="text-lg font-black text-primary">{product.fiyat.toLocaleString("tr-TR")} ₺</p>
                        {isCheapest && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" />
                            En Ucuz
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>

                {/* Stok durumu */}
                <tr>
                  <td className="sticky left-0 z-10 bg-background p-3 border-b border-r border-border/40">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">Stok</span>
                    </div>
                  </td>
                  {items.map((product) => {
                    const slug = product.slug ?? createSlug(product.name || product.sistemAdi, product.magaza)
                    return (
                      <td key={slug} className="p-3 border-b border-border/40 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${product.stoktaVarMi ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                          {product.stoktaVarMi ? "Stokta" : "Stokta Yok"}
                        </span>
                      </td>
                    )
                  })}
                </tr>

                {/* Spec rows */}
                {SPEC_DEFS.map((spec) => {
                  const diff = isDifferent(spec)
                  const rowHighlight = highlightDiffs && diff
                  return (
                    <tr key={spec.key} className={rowHighlight ? "bg-amber-500/5 dark:bg-amber-500/10" : ""}>
                      <td className={`sticky left-0 z-10 p-3 border-b border-r border-border/40 ${rowHighlight ? "bg-amber-500/5 dark:bg-amber-500/10" : "bg-background"}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            {spec.icon}
                          </div>
                          <span className="text-xs font-bold text-muted-foreground">{spec.label}</span>
                        </div>
                      </td>
                      {items.map((product) => {
                        const slug = product.slug ?? createSlug(product.name || product.sistemAdi, product.magaza)
                        const val = spec.getValue(product)
                        return (
                          <td key={slug} className="p-3 border-b border-border/40 text-center">
                            <span className={`text-xs font-medium ${val ? "text-foreground" : "text-muted-foreground/60"}`}>
                              {val || "—"}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}

                {/* Action row */}
                <tr>
                  <td className="sticky left-0 z-10 bg-background p-3 border-r border-border/40" />
                  {items.map((product) => {
                    const slug = product.slug ?? createSlug(product.name || product.sistemAdi, product.magaza)
                    return (
                      <td key={slug} className="p-3 text-center">
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            className="rounded-full font-bold gap-1.5 shadow-sm w-full text-xs"
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
                            className="rounded-full font-bold text-xs w-full"
                            onClick={() => {
                              setModalOpen(false)
                              setLocation(`/sistem/${slug}`)
                            }}
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
