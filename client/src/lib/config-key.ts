import { getCpuTier, getGpuTier } from "./fp-scoring"
import type { Product } from "../hooks/use-products"
import type { ProductGroup } from "./api"

/**
 * Donanım konfigürasyon imzası — lib/productIndex.mjs içindeki
 * configKey()/groupByConfig() ile birebir aynı mantık.
 * Perakendeci isimlendirmesinden bağımsız: aynı konfigürasyon,
 * farklı isimlerle listelense bile aynı anahtarı üretir.
 * Eksik verili ürünler null döner ve hep tek başına durur
 * (yanlış birleştirme olmaz).
 */

function ramKey(s?: string): string | null {
    if (!s) return null
    const m = s.toUpperCase().match(/(\d{1,4})\s*GB/)
    if (!m) return null
    const ddr =
        s.toUpperCase().match(/DDR\s*([45])/)?.[1] ||
        /\bD([45])\b/.exec(s.toUpperCase())?.[1] ||
        "?"
    return `${m[1]}-DDR${ddr}`
}

function storKey(s?: string): string | null {
    if (!s) return null
    const m = s.toUpperCase().match(/(\d+(?:[.,]\d+)?)\s*(TB|GB)/)
    if (!m) return null
    const gb = m[2] === "TB" ? Math.round(parseFloat(m[1].replace(",", ".")) * 1000) : Number(m[1])
    const u = s.toUpperCase()
    const t = /NVME|M\.?2/.test(u) ? "N" : /SSD/.test(u) ? "S" : /HDD/.test(u) ? "H" : "?"
    return `${gb}${t}`
}

function chipKey(s?: string): string | null {
    if (!s) return null
    const m = s.toUpperCase().match(/([ABHXZ]\d{3})/)
    return m ? m[1] : null
}

export function configKey(p: Product): string | null {
    const c = getCpuTier(p.islemci)
    const g = getGpuTier(p.ekranKarti)
    const r = ramKey(p.ram)
    const st = storKey(p.ssd || p.depolama)
    const ch = chipKey(p.anakart)
    if (c === "UNKNOWN" || g === "UNKNOWN" || !r || !st || !ch) return null
    return `${c}|${g}|${r}|${st}|${ch}`
}

export function groupOffers(products: Product[]): ProductGroup[] {
    const map = new Map<string, Product[]>()
    for (const p of products) {
        const key = configKey(p)
        const gkey = key ?? `solo:${p.slug || p.siteUrl || `${p.sistemAdi}::${p.magaza}`}`
        const arr = map.get(gkey)
        if (arr) arr.push(p)
        else map.set(gkey, [p])
    }
    const groups: ProductGroup[] = []
    for (const [key, offers] of map) {
        offers.sort((a, b) => a.fiyat - b.fiyat)
        const prices = offers.map((o) => o.fiyat).filter((f) => f > 0)
        const stores = [...new Set(offers.map((o) => o.magaza).filter(Boolean))]
        const cheapest = offers[0]
        groups.push({
            key,
            title: cheapest.sistemAdi,
            image: cheapest.resimUrl,
            minPrice: prices.length ? Math.min(...prices) : 0,
            maxPrice: prices.length ? Math.max(...prices) : 0,
            storeCount: stores.length,
            offerCount: offers.length,
            stores,
            offers,
        })
    }
    return groups
}
