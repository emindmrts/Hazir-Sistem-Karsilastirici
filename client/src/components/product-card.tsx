import { Card, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Cpu, HardDrive, LayoutGrid, MemoryStick } from "lucide-react"
import type { Product } from "@/hooks/use-products"

function getLogoUrl(store: string) {
    const key = store.toLowerCase().replace(/[^a-z]/g, "")
    // Listed stores have a dedicated logo in the /logos/ folder
    const validStores = ["vatan", "itopya", "gaminggen", "gamegaraj", "pckolik", "sinerji", "incehesap", "tebilon", "gencergaming"]
    if (validStores.includes(key)) {
        return `/logos/${key}.png`
    }
    return null
}
function StoreBadge({ store }: { store: string }) {
    const logoUrl = getLogoUrl(store)

    return (
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-background/90 border border-border/60 shadow-sm backdrop-blur-sm overflow-hidden">
            {logoUrl ? (
                <img
                    src={logoUrl}
                    alt={store}
                    title={store}
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                        const t = e.currentTarget
                        t.style.display = "none"
                        t.nextElementSibling?.classList.remove("hidden")
                    }}
                />
            ) : null}
            <span className={`text-[9px] font-bold uppercase leading-none ${logoUrl ? "hidden" : ""}`}>
                {store.slice(0, 2)}
            </span>
        </div>
    )
}


export function ProductCard({ product }: { product: Product }) {
    return (
        <Card className="group flex flex-col sm:flex-col overflow-hidden border-border/60 bg-card transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/30">

            {/* ── MOBILE: horizontal layout ── */}
            <div className="flex sm:hidden">
                {/* Image — left column */}
                <div className="relative bg-gradient-to-br from-muted/60 to-muted/20 flex items-center justify-center w-28 shrink-0 overflow-hidden">
                    <div className="absolute top-2 left-2 z-10">
                        <StoreBadge store={product.magaza} />
                    </div>
                    {!product.stoktaVarMi && (
                        <div className="absolute inset-0 bg-background/75 backdrop-blur-sm z-20 flex items-center justify-center">
                            <span className="rotate-[-18deg] border border-muted-foreground/50 text-muted-foreground text-[9px] font-bold px-1.5 py-0.5 rounded select-none">
                                STOKTA YOK
                            </span>
                        </div>
                    )}
                    <img
                        src={product.resimUrl}
                        alt={product.sistemAdi}
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-sm p-2"
                        loading="lazy"
                        onError={(e) => {
                            const t = e.target as HTMLImageElement
                            t.onerror = null
                            t.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='M21 15l-5-5L4 20'/%3E%3C/svg%3E"
                        }}
                    />
                </div>

                {/* Details — right column */}
                <div className="flex flex-col flex-1 min-w-0 p-3 gap-2 justify-between">
                    <h3 className="font-semibold text-xs leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {product.sistemAdi}
                    </h3>
                    <div className="space-y-0.5 text-[10px] text-muted-foreground">
                        {product.islemci && (
                            <div className="flex items-center gap-1.5">
                                <Cpu className="w-3 h-3 shrink-0 text-primary/60" />
                                <span className="truncate line-clamp-1">{product.islemci}</span>
                            </div>
                        )}
                        {product.ekranKarti && (
                            <div className="flex items-center gap-1.5">
                                <LayoutGrid className="w-3 h-3 shrink-0 text-primary/60" />
                                <span className="truncate line-clamp-1">{product.ekranKarti}</span>
                            </div>
                        )}
                        <div className="flex gap-3 mt-0.5">
                            {product.ram && (
                                <div className="flex items-center gap-1">
                                    <MemoryStick className="w-3 h-3 shrink-0" />
                                    <span className="whitespace-nowrap">{product.ram}</span>
                                </div>
                            )}
                            {(product.ssd ?? product.depolama) && (
                                <div className="flex items-center gap-1">
                                    <HardDrive className="w-3 h-3 shrink-0" />
                                    <span className="whitespace-nowrap">{product.ssd ?? product.depolama}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Price + CTA */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                        <p className="text-base font-bold text-primary leading-none">
                            {product.fiyat.toLocaleString("tr-TR")} ₺
                        </p>
                        <Button
                            size="sm"
                            className="rounded-full shrink-0 gap-1 text-xs h-7 px-3 font-semibold shadow-sm"
                            disabled={!product.stoktaVarMi}
                            asChild
                        >
                            <a href={product.siteUrl} target="_blank" rel="noopener noreferrer">
                                İncele
                                <ExternalLink className="h-3 w-3 opacity-75" />
                            </a>
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── SM+: original vertical card (unchanged) ── */}
            <div className="hidden sm:flex sm:flex-col sm:flex-1">
                {/* Image */}
                <div className="relative bg-gradient-to-br from-muted/60 to-muted/20 flex items-center justify-center p-6 aspect-[4/3] overflow-hidden">
                    <div className="absolute top-3 right-3 z-10">
                        <StoreBadge store={product.magaza} />
                    </div>
                    {!product.stoktaVarMi && (
                        <div className="absolute inset-0 bg-background/75 backdrop-blur-sm z-20 flex items-center justify-center">
                            <span className="rotate-[-18deg] border-2 border-muted-foreground/50 text-muted-foreground text-sm font-bold px-3 py-1 rounded select-none">
                                STOKTA YOK
                            </span>
                        </div>
                    )}
                    <img
                        src={product.resimUrl}
                        alt={product.sistemAdi}
                        className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-md"
                        loading="lazy"
                        onError={(e) => {
                            const t = e.target as HTMLImageElement
                            t.onerror = null
                            t.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='M21 15l-5-5L4 20'/%3E%3C/svg%3E"
                        }}
                    />
                </div>

                {/* Details */}
                <CardHeader className="flex-1 p-4 pb-3 space-y-3">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {product.sistemAdi}
                    </h3>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                        {product.islemci && (
                            <div className="flex items-center gap-2">
                                <Cpu className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                                <span className="truncate">{product.islemci}</span>
                            </div>
                        )}
                        {product.ekranKarti && (
                            <div className="flex items-center gap-2">
                                <LayoutGrid className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                                <span className="truncate">{product.ekranKarti}</span>
                            </div>
                        )}
                        <div className="flex gap-4 pt-0.5">
                            {product.ram && (
                                <div className="flex items-center gap-1.5">
                                    <MemoryStick className="w-3 h-3 shrink-0" />
                                    <span>{product.ram}</span>
                                </div>
                            )}
                            {(product.ssd ?? product.depolama) && (
                                <div className="flex items-center gap-1.5">
                                    <HardDrive className="w-3 h-3 shrink-0" />
                                    <span>{product.ssd ?? product.depolama}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardFooter className="p-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2 bg-muted/20">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">Fiyat</p>
                        <p className="text-xl font-bold text-primary leading-none">
                            {product.fiyat.toLocaleString("tr-TR")} ₺
                        </p>
                    </div>
                    <Button
                        size="sm"
                        className="rounded-full shrink-0 gap-1.5 font-semibold shadow-sm hover:shadow-primary/25 transition-all"
                        disabled={!product.stoktaVarMi}
                        asChild
                    >
                        <a href={product.siteUrl} target="_blank" rel="noopener noreferrer">
                            İncele
                            <ExternalLink className="h-3.5 w-3.5 opacity-75" />
                        </a>
                    </Button>
                </CardFooter>
            </div>
        </Card>
    )
}

