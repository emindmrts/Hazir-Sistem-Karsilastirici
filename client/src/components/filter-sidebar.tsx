import type { Dispatch, SetStateAction } from "react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SlidersHorizontal, RotateCcw, Package } from "lucide-react"

export interface FilterState {
    minPrice: number | ""
    maxPrice: number | ""
    stores: string[]
    cpuBrands: string[]
    gpuBrands: string[]
    inStock: boolean
    searchStr: string
}

interface FilterSidebarProps {
    filters: FilterState
    setFilters: Dispatch<SetStateAction<FilterState>>
    onReset: () => void
}

const STORES = [
    { id: "itopya", label: "Itopya", logo: "/logos/itopya.png" },
    { id: "gamingGen", label: "GamingGen", logo: "/logos/gaminggen.png" },
    { id: "gameGaraj", label: "Game Garaj", logo: "/logos/gamegaraj.png" },
    { id: "pckolik", label: "PcKolik", logo: "/logos/pckolik.png" },
    { id: "vatan", label: "Vatan", logo: "/logos/vatan.png" },
    { id: "sinerji", label: "Sinerji", logo: "/logos/sinerji.png" },
    { id: "inceHesap", label: "İnceHesap", logo: "/logos/incehesap.png" },
    { id: "tebilon", label: "Tebilon", logo: "/logos/tebilon.png" },
]

const CPU_BRANDS = ["Intel", "AMD"]
const GPU_BRANDS = [
    { id: "RTX", label: "NVIDIA RTX" },
    { id: "GTX", label: "NVIDIA GTX" },
    { id: "RX", label: "AMD RX" },
    { id: "ARC", label: "Intel ARC" },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/70 mb-2.5">
            {children}
        </p>
    )
}

export function FilterSidebar({ filters, setFilters, onReset }: FilterSidebarProps) {
    const activeCount =
        filters.stores.length +
        filters.cpuBrands.length +
        filters.gpuBrands.length +
        (filters.minPrice !== "" ? 1 : 0) +
        (filters.maxPrice !== "" ? 1 : 0) +
        (filters.inStock ? 1 : 0)

    const toggle = (group: "stores" | "cpuBrands" | "gpuBrands") => (id: string, checked: boolean) => {
        setFilters(prev => ({
            ...prev,
            [group]: checked
                ? [...prev[group], id]
                : prev[group].filter(x => x !== id),
        }))
    }

    return (
        <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-gradient-to-r from-accent/40 to-transparent">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <h4 className="text-sm font-bold tracking-tight">Filtreler</h4>
                    {activeCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
                            {activeCount}
                        </span>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReset}
                    className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70 px-2 rounded-lg"
                >
                    <RotateCcw className="w-3 h-3" />
                    Sıfırla
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="px-5 py-5 space-y-5">

                    {/* Stock toggle — pill style */}
                    <div
                        className={`
                            flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200
                            ${filters.inStock
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-muted/30 border-border/50 text-foreground hover:border-border"
                            }
                        `}
                        onClick={() => setFilters(prev => ({ ...prev, inStock: !prev.inStock }))}
                    >
                        <div className="flex items-center gap-2.5">
                            <Package className={`w-4 h-4 ${filters.inStock ? "text-primary" : "text-muted-foreground"}`} />
                            <Label htmlFor="inStock" className="text-sm font-medium cursor-pointer select-none">
                                Sadece stokta olanlar
                            </Label>
                        </div>
                        <Checkbox
                            id="inStock"
                            checked={filters.inStock}
                            onCheckedChange={(c) => setFilters(prev => ({ ...prev, inStock: c === true }))}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <Separator className="bg-border/50" />

                    {/* Price */}
                    <div className="space-y-2.5">
                        <SectionLabel>Fiyat Aralığı (₺)</SectionLabel>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                placeholder="Min"
                                className="h-9 text-sm bg-muted/40 border-border/50 focus-visible:border-primary/50 focus-visible:bg-background rounded-lg"
                                value={filters.minPrice}
                                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value ? Number(e.target.value) : "" }))}
                            />
                            <span className="text-muted-foreground/60 text-sm shrink-0 font-light">—</span>
                            <Input
                                type="number"
                                placeholder="Maks"
                                className="h-9 text-sm bg-muted/40 border-border/50 focus-visible:border-primary/50 focus-visible:bg-background rounded-lg"
                                value={filters.maxPrice}
                                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value ? Number(e.target.value) : "" }))}
                            />
                        </div>
                    </div>

                    <Separator className="bg-border/50" />

                    {/* Stores with PNG logos */}
                    <div className="space-y-2">
                        <SectionLabel>Mağaza</SectionLabel>
                        <div className="grid grid-cols-2 gap-2">
                            {STORES.map(s => {
                                const isSelected = filters.stores.includes(s.id);
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => toggle("stores")(s.id, !isSelected)}
                                        className={`
                                            flex items-center gap-2.5 p-2 rounded-xl border transition-all duration-200
                                            ${isSelected 
                                                ? "border-primary bg-primary/5 shadow-sm" 
                                                : "border-border/50 bg-background hover:bg-muted/50 hover:border-border"
                                            }
                                        `}
                                    >
                                        <div className="w-7 h-7 shrink-0 bg-white dark:bg-zinc-900 rounded-md p-1 border border-border/40 flex items-center justify-center">
                                            <img src={s.logo} alt={s.label} className="w-full h-full object-contain" />
                                        </div>
                                        <span className={`text-xs font-semibold text-left line-clamp-1 ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                                            {s.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <Separator className="bg-border/50" />

                    {/* CPU Brand — pill toggle */}
                    <div className="space-y-2">
                        <SectionLabel>İşlemci Markası</SectionLabel>
                        <div className="flex gap-2">
                            {CPU_BRANDS.map(b => (
                                <button
                                    key={b}
                                    onClick={() => toggle("cpuBrands")(b, !filters.cpuBrands.includes(b))}
                                    className={`
                                        flex-1 py-2 rounded-xl text-sm font-semibold border transition-all duration-200
                                        ${filters.cpuBrands.includes(b)
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30"
                                            : "bg-muted/40 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                        }
                                    `}
                                >
                                    {b}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator className="bg-border/50" />

                    {/* GPU Brand — pill toggle */}
                    <div className="space-y-2">
                        <SectionLabel>Ekran Kartı</SectionLabel>
                        <div className="grid grid-cols-2 gap-2">
                            {GPU_BRANDS.map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => toggle("gpuBrands")(g.id, !filters.gpuBrands.includes(g.id))}
                                    className={`
                                        py-2 px-3 rounded-xl text-xs font-semibold border transition-all duration-200 text-center
                                        ${filters.gpuBrands.includes(g.id)
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30"
                                            : "bg-muted/40 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                        }
                                    `}
                                >
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </ScrollArea>
        </div>
    )
}
