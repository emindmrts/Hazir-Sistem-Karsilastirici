import { X, Scale } from "lucide-react"
import { useLocation } from "wouter"
import { useCompare } from "../hooks/use-compare"
import { Button } from "@/components/ui/button"

/** Sepette ürün varken altta beliren karşılaştırma çubuğu. */
export function CompareBar() {
    const { items, remove, clear } = useCompare()
    const [location, setLocation] = useLocation()

    if (items.length === 0) return null

    // Karşılaştırma sayfasının kendisinde bar tabloyu kapatmasın
    const onComparePage = location === "/karsilastir"

    return (
        <>
            {!onComparePage && (
                <div className="fixed bottom-4 inset-x-4 z-50 mx-auto max-w-3xl">
                    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md px-4 py-3 shadow-2xl">
                        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
                            {items.map((p) => {
                                const key = p.slug || p.siteUrl || `${p.sistemAdi}::${p.magaza}`
                                return (
                                    <div
                                        key={key}
                                        className="relative shrink-0 w-11 h-11 rounded-lg bg-muted/50 border border-border/50 overflow-hidden"
                                        title={p.sistemAdi}
                                    >
                                        {p.resimUrl ? (
                                            <img src={p.resimUrl} alt="" className="w-full h-full object-contain p-1" />
                                        ) : (
                                            <Scale className="w-4 h-4 m-auto text-muted-foreground" />
                                        )}
                                        <button
                                            onClick={() => remove(p)}
                                            aria-label={`${p.sistemAdi} çıkar`}
                                            className="absolute top-0 right-0 w-4 h-4 rounded-bl-md bg-background/90 text-muted-foreground hover:text-foreground flex items-center justify-center"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                        <Button
                            size="sm"
                            className="rounded-full shrink-0 gap-1.5 font-bold"
                            disabled={items.length < 2}
                            onClick={() => setLocation("/karsilastir")}
                        >
                            <Scale className="w-3.5 h-3.5" />
                            Karşılaştır ({items.length})
                        </Button>
                        <button
                            onClick={clear}
                            className="shrink-0 text-[11px] font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2"
                        >
                            Temizle
                        </button>
                    </div>
                </div>
            )}
            {/* Sabit bar footer'ı kapatmasın diye boşluk */}
            {!onComparePage && <div aria-hidden className="h-20" />}
        </>
    )
}
