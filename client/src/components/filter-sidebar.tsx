import { useState, type Dispatch, type SetStateAction } from "react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SlidersHorizontal, RotateCcw, Package, ChevronDown } from "lucide-react"

export interface FilterState {
    minPrice: number | ""
    maxPrice: number | ""
    stores: string[]
    cpuBrands: string[]
    cpuSeries: string[]
    cpuModels?: string[]
    gpuBrands: string[]
    gpuSeries: string[]
    inStock: boolean
    searchStr: string
}

interface FilterSidebarProps {
    filters: FilterState
    setFilters: Dispatch<SetStateAction<FilterState>>
    onReset: () => void
    availableCpuModels?: { AMD: string[]; Intel: string[] }
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
    { id: "RX", label: "AMD RX" },
    { id: "ARC", label: "Intel ARC" },
]
const CPU_SERIES_GROUPS = [
    {
        brand: "Intel",
        items: ["Core Ultra", "Core i9", "Core i7", "Core i5", "Core i3"],
    },
    {
        brand: "AMD",
        items: ["Ryzen 9", "Ryzen 7", "Ryzen 5", "Ryzen 3"],
    },
]

const GPU_SERIES_GROUPS = [
    {
        brand: "RTX",
        gen: "RTX 50",
        items: ["5090", "5080", "5070 TI", "5070", "5060 TI", "5060", "5050"],
    },
    {
        brand: "RTX",
        gen: "RTX 40",
        items: ["4090", "4080 S", "4080", "4070 TI S", "4070 TI", "4070 S", "4070", "4060 TI", "4060"],
    },
    {
        brand: "RTX",
        gen: "RTX 30 & 20",
        items: ["3090", "3080", "3070", "3060 TI", "3060", "3050", "2060"],
    },
    {
        brand: "RX",
        gen: "RX 9000",
        items: ["9070 XT", "9070"],
    },
    {
        brand: "RX",
        gen: "RX 7000",
        items: ["7900 XTX", "7900 XT", "7900 GRE", "7800 XT", "7700 XT", "7600 XT", "7600"],
    },
    {
        brand: "RX",
        gen: "RX 6000",
        items: ["6700 XT", "6600"],
    },
    {
        brand: "ARC",
        gen: "ARC B",
        items: ["B580"],
    },
    {
        brand: "ARC",
        gen: "ARC A",
        items: ["A770", "A750"],
    },
]




interface SectionToggleProps {
    sectionKey: string
    label: string
    badge?: number
    collapsed: Record<string, boolean>
    onToggle: (key: string) => void
}

function SectionToggle({ sectionKey, label, badge, collapsed, onToggle }: SectionToggleProps) {
    return (
        <button
            onClick={() => onToggle(sectionKey)}
            className="flex items-center justify-between w-full group/sec"
        >
            <span className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/70 group-hover/sec:text-primary transition-colors">{label}</span>
                {badge != null && badge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1">
                        {badge}
                    </span>
                )}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/70 transition-transform duration-200 ${collapsed[sectionKey] ? "-rotate-90" : ""}`} />
        </button>
    )
}

export function FilterSidebar({ filters, setFilters, onReset, availableCpuModels }: FilterSidebarProps) {
    const activeCount =
        filters.stores.length +
        filters.cpuBrands.length +
        filters.cpuSeries.length +
        (filters.cpuModels?.length || 0) +
        filters.gpuBrands.length +
        filters.gpuSeries.length +
        (filters.minPrice !== "" ? 1 : 0) +
        (filters.maxPrice !== "" ? 1 : 0) +
        (filters.inStock ? 1 : 0)

    const toggle = (group: "stores" | "cpuBrands" | "cpuSeries" | "cpuModels" | "gpuBrands" | "gpuSeries") => (id: string, checked: boolean) => {
        const list = filters[group] || [];
        setFilters(prev => ({
            ...prev,
            [group]: checked
                ? [...list, id]
                : list.filter(x => x !== id),
        }))
    }

    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
        stock: false, price: false, stores: false, cpu: false, cpuSeries: false, cpuModel: false, gpuSeries: false, gpuBrand: false,
    })
    const toggleSection = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

    return (
        <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-gradient-to-r from-accent/40 to-transparent">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <h2 className="text-sm font-bold tracking-tight">Filtreler</h2>
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
                <div className="px-5 py-4 space-y-4">

                    {/* Stock */}
                    <div className="space-y-2">
                        <SectionToggle sectionKey="stock" label="Stok Durumu" badge={filters.inStock ? 1 : 0} collapsed={collapsed} onToggle={toggleSection} />
                        {!collapsed.stock && (
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
                        )}
                    </div>

                    <Separator className="bg-border/50" />

                    {/* Price */}
                    <div className="space-y-2">
                        <SectionToggle sectionKey="price" label="Fiyat Aralığı (₺)" badge={(filters.minPrice !== "" ? 1 : 0) + (filters.maxPrice !== "" ? 1 : 0)} collapsed={collapsed} onToggle={toggleSection} />
                        {!collapsed.price && (
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
                        )}
                    </div>

                    <Separator className="bg-border/50" />

                    {/* Stores */}
                    <div className="space-y-2">
                        <SectionToggle sectionKey="stores" label="Mağaza" badge={filters.stores.length} collapsed={collapsed} onToggle={toggleSection} />
                        {!collapsed.stores && (
                            <div className="grid grid-cols-2 gap-2">
                                {STORES.map(s => {
                                    const isSelected = filters.stores.includes(s.id)
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
                                                <img src={s.logo} alt="" width="28" height="28" className="w-full h-full object-contain" />
                                            </div>
                                            <span className={`text-xs font-semibold text-left line-clamp-1 ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                                                {s.label}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <Separator className="bg-border/50" />

                    {/* CPU Brand — tek seçim */}
                    <div className="space-y-2">
                        <SectionToggle sectionKey="cpu" label="İşlemci Markası" badge={filters.cpuBrands.length} collapsed={collapsed} onToggle={toggleSection} />
                        {!collapsed.cpu && (
                            <div className="flex gap-2">
                                {CPU_BRANDS.map(b => {
                                    const selected = filters.cpuBrands.includes(b)
                                    return (
                                        <button
                                            key={b}
                                            onClick={() => {
                                                if (selected) {
                                                    setFilters(prev => ({ ...prev, cpuBrands: [], cpuSeries: [], cpuModels: [] }))
                                                } else {
                                                    setFilters(prev => ({ ...prev, cpuBrands: [b], cpuSeries: [], cpuModels: [] }))
                                                }
                                            }}
                                            className={`
                                                flex-1 py-3 rounded-xl text-sm font-semibold border transition-all duration-200 flex items-center justify-center gap-2
                                                ${selected
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30"
                                                    : "bg-muted/40 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                                }
                                            `}
                                        >
                                            <img src={`/logos/${b.toLowerCase()}.png`} alt={b} width="80" height="20" className="h-5 w-auto" />
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <Separator className="bg-border/50" />

                    {/* CPU Series */}
                    <div className="space-y-2">
                        <SectionToggle sectionKey="cpuSeries" label="İşlemci Serisi" badge={filters.cpuSeries.length} collapsed={collapsed} onToggle={toggleSection} />
                        {!collapsed.cpuSeries && (
                            <div className="space-y-3">
                                {filters.cpuBrands.length === 0 ? (
                                    <p className="text-[11px] text-muted-foreground text-center py-3">
                                        Önce işlemci markasını seçmelisiniz
                                    </p>
                                ) : (
                                    CPU_SERIES_GROUPS.filter(g => filters.cpuBrands.includes(g.brand)).map(group => (
                                        <div key={group.brand} className="grid grid-cols-2 gap-1.5">
                                            {group.items.map(id => {
                                                const sel = filters.cpuSeries.includes(id)
                                                return (
                                                    <button
                                                        key={id}
                                                        onClick={() => {
                                                            if (sel) {
                                                                setFilters(prev => ({ ...prev, cpuSeries: [], cpuModels: [] }))
                                                            } else {
                                                                setFilters(prev => ({ ...prev, cpuSeries: [id], cpuModels: [] }))
                                                            }
                                                        }}
                                                        className={`
                                                            py-2 px-3 rounded-xl text-xs font-semibold border transition-all duration-200 text-center
                                                            ${sel
                                                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                                : "bg-muted/40 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                                            }
                                                        `}
                                                        title={id}
                                                    >
                                                        {id}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <Separator className="bg-border/50" />

                    {/* CPU Model */}
                    <div className="space-y-2">
                        <SectionToggle sectionKey="cpuModel" label="İşlemci Modeli" badge={filters.cpuModels?.length} collapsed={collapsed} onToggle={toggleSection} />
                        {!collapsed.cpuModel && (
                            <div className="space-y-3">
                                {filters.cpuSeries.length === 0 ? (
                                    <p className="text-[11px] text-muted-foreground text-center py-3">
                                        Önce işlemci serisini seçmelisiniz
                                    </p>
                                ) : (
                                    availableCpuModels && (Object.keys(availableCpuModels) as Array<keyof typeof availableCpuModels>).filter(b => filters.cpuBrands.includes(b)).map(brand => {
                                        const models = availableCpuModels[brand] || [];
                                        if (models.length === 0) return null;
                                        return (
                                            <div key={brand} className="space-y-1">
                                                <div className="grid grid-cols-3 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                                                    {models.map(model => {
                                                        const sel = filters.cpuModels?.includes(model)
                                                        return (
                                                            <button
                                                                key={model}
                                                                onClick={() => {
                                                                    if (sel) {
                                                                        setFilters(prev => ({ ...prev, cpuModels: [] }))
                                                                    } else {
                                                                        setFilters(prev => ({ ...prev, cpuModels: [model] }))
                                                                    }
                                                                }}
                                                                className={`
                                                                    py-1.5 px-1.5 rounded-lg text-[10px] font-semibold border transition-all duration-150 text-center truncate
                                                                    ${sel
                                                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                                        : "bg-muted/40 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                                                    }
                                                                `}
                                                                title={model}
                                                            >
                                                                {model}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    <Separator className="bg-border/50" />

                    {/* GPU Brand — tek seçim */}
                    <div className="space-y-2">
                        <SectionToggle sectionKey="gpuBrand" label="Ekran Kartı Markası" badge={filters.gpuBrands.length} collapsed={collapsed} onToggle={toggleSection} />
                        {!collapsed.gpuBrand && (
                            <div className="grid grid-cols-2 gap-2">
                                {GPU_BRANDS.map(g => {
                                    const selected = filters.gpuBrands.includes(g.id)
                                    return (
                                        <button
                                            key={g.id}
                                            onClick={() => {
                                                if (selected) {
                                                    setFilters(prev => ({ ...prev, gpuBrands: [], gpuSeries: [] }))
                                                } else {
                                                    setFilters(prev => ({ ...prev, gpuBrands: [g.id], gpuSeries: [] }))
                                                }
                                            }}
                                            className={`
                                                py-2 px-3 rounded-xl text-xs font-semibold border transition-all duration-200 text-center
                                                ${selected
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30"
                                                    : "bg-muted/40 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                                }
                                            `}
                                        >
                                            {g.label}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <Separator className="bg-border/50" />

                    {/* GPU Series — tek seçim */}
                    <div className="space-y-2">
                        <SectionToggle sectionKey="gpuSeries" label="Ekran Kartı Serisi" badge={filters.gpuSeries.length} collapsed={collapsed} onToggle={toggleSection} />
                        {!collapsed.gpuSeries && (
                            <div className="space-y-3">
                                {filters.gpuBrands.length === 0 ? (
                                    <p className="text-[11px] text-muted-foreground text-center py-3">
                                        Önce ekran kartı markasını seçmelisiniz
                                    </p>
                                ) : (
                                    GPU_SERIES_GROUPS.filter(g => g.brand === filters.gpuBrands[0]).map(group => {
                                        const activeInGroup = group.items.filter(id => filters.gpuSeries.includes(id)).length
                                        return (
                                            <div key={group.gen}>
                                                <div className="flex items-center justify-between w-full py-1 mb-1.5">
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{group.gen}</span>
                                                    {activeInGroup > 0 && (
                                                        <span className="inline-flex items-center justify-center min-w-[14px] h-3.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold px-1">
                                                            {activeInGroup}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-3 gap-1">
                                                    {group.items.map(id => {
                                                        const sel = filters.gpuSeries.includes(id)
                                                        return (
                                                            <button
                                                                key={id}
                                                                onClick={() => {
                                                                    if (sel) {
                                                                        setFilters(prev => ({ ...prev, gpuSeries: [] }))
                                                                    } else {
                                                                        setFilters(prev => ({ ...prev, gpuSeries: [id] }))
                                                                    }
                                                                }}
                                                                className={`
                                                                    py-1.5 px-1.5 rounded-lg text-[10px] font-semibold border transition-all duration-150 text-center truncate
                                                                    ${sel
                                                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                                        : "bg-muted/40 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                                                    }
                                                                `}
                                                                title={id}
                                                            >
                                                                {id}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </ScrollArea>
        </div>
    )
}
