import type { Dispatch, SetStateAction } from "react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SlidersHorizontal, RotateCcw } from "lucide-react"

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
    { id: "itopya", label: "Itopya" },
    { id: "gamingGen", label: "GamingGen" },
    { id: "gameGaraj", label: "Game Garaj" },
    { id: "pckolik", label: "PcKolik" },
    { id: "vatan", label: "Vatan" },
    { id: "sinerji", label: "Sinerji" },
    { id: "inceHesap", label: "İnceHesap" },
    { id: "tebilon", label: "Tebilon" },
]

const CPU_BRANDS = ["Intel", "AMD"]
const GPU_BRANDS = [
    { id: "RTX", label: "NVIDIA RTX" },
    { id: "GTX", label: "NVIDIA GTX" },
    { id: "RX", label: "AMD RX" },
    { id: "ARC", label: "Intel ARC" },
]

export function FilterSidebar({ filters, setFilters, onReset }: FilterSidebarProps) {
    const activeCount =
        filters.stores.length +
        filters.cpuBrands.length +
        filters.gpuBrands.length +
        (filters.minPrice !== "" ? 1 : 0) +
        (filters.maxPrice !== "" ? 1 : 0)

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
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold tracking-tight">Filtreler</h4>
                    {activeCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                            {activeCount}
                        </span>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReset}
                    className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2"
                >
                    <RotateCcw className="w-3 h-3" />
                    Sıfırla
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="px-5 py-4 space-y-5">
                    {/* Stock */}
                    <div className="flex items-center justify-between py-1">
                        <Label htmlFor="inStock" className="text-sm font-medium cursor-pointer">
                            Sadece stokta olanlar
                        </Label>
                        <Checkbox
                            id="inStock"
                            checked={filters.inStock}
                            onCheckedChange={(c) => setFilters(prev => ({ ...prev, inStock: c === true }))}
                        />
                    </div>

                    <Separator />

                    {/* Price */}
                    <div className="space-y-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Fiyat Aralığı (₺)</p>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                placeholder="Min"
                                className="h-8 text-sm"
                                value={filters.minPrice}
                                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value ? Number(e.target.value) : "" }))}
                            />
                            <span className="text-muted-foreground text-sm shrink-0">—</span>
                            <Input
                                type="number"
                                placeholder="Maks"
                                className="h-8 text-sm"
                                value={filters.maxPrice}
                                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value ? Number(e.target.value) : "" }))}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Stores */}
                    <div className="space-y-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Mağaza</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                            {STORES.map(s => (
                                <div key={s.id} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`store-${s.id}`}
                                        checked={filters.stores.includes(s.id)}
                                        onCheckedChange={(c) => toggle("stores")(s.id, c === true)}
                                    />
                                    <Label htmlFor={`store-${s.id}`} className="text-sm font-normal cursor-pointer leading-none">
                                        {s.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* CPU Brand */}
                    <div className="space-y-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">İşlemci Markası</p>
                        <div className="flex gap-3">
                            {CPU_BRANDS.map(b => (
                                <div key={b} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`cpu-${b}`}
                                        checked={filters.cpuBrands.includes(b)}
                                        onCheckedChange={(c) => toggle("cpuBrands")(b, c === true)}
                                    />
                                    <Label htmlFor={`cpu-${b}`} className="text-sm font-normal cursor-pointer">{b}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* GPU Brand */}
                    <div className="space-y-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Ekran Kartı</p>
                        <div className="space-y-2.5">
                            {GPU_BRANDS.map(g => (
                                <div key={g.id} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`gpu-${g.id}`}
                                        checked={filters.gpuBrands.includes(g.id)}
                                        onCheckedChange={(c) => toggle("gpuBrands")(g.id, c === true)}
                                    />
                                    <Label htmlFor={`gpu-${g.id}`} className="text-sm font-normal cursor-pointer">{g.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}
