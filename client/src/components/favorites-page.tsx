import { Button } from "@/components/ui/button"
import { Bookmark, Trash2, HeartCrack } from "lucide-react"
import { Link } from "wouter"
import { ProductCard } from "./product-card"
import { useFavorites } from "@/hooks/use-favorites"
import { SEO } from "./seo"

export function FavoritesPage() {
    const { items, clear } = useFavorites()

    return (
        <>
            <SEO
                title="Favorilerim - PcKarşılaştır.com"
                description="Beğendiğiniz hazır sistem bilgisayarlarını listelediğiniz favoriler sayfası."
            />
            <div className="mx-auto w-full max-w-screen-2xl px-4 md:px-8 py-8 md:py-12">
                <div className="flex items-center justify-between gap-3 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Bookmark className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black tracking-tight">Favorilerim</h1>
                            <p className="text-xs text-muted-foreground">
                                {items.length > 0
                                    ? `${items.length} sistem kaydedildi. Fiyatlar her gece otomatik güncellenir.`
                                    : "Beğendiğiniz sistemleri burada saklayın."}
                            </p>
                        </div>
                    </div>
                    {items.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full gap-1.5 text-xs font-semibold"
                            onClick={clear}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Temizle
                        </Button>
                    )}
                </div>

                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground">
                            <HeartCrack className="w-8 h-8 opacity-80" />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight mb-2">Henüz favori yok</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm text-sm">
                            Sistem kartlarındaki veya detay sayfasındaki kalp ikonuna basarak favorilerinize ekleyin.
                        </p>
                        <Link href="/">
                            <Button variant="outline">Sistemleri Keşfet</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
                        {items.map((p, i) => (
                            <div key={p.slug || i}>
                                <ProductCard product={p} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}