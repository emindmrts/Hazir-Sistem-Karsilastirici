import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react"
import type { Product } from "./use-products"
import { fetchProductDetail } from "../lib/api"

const STORAGE_KEY = "karsilastir-tray-v1"
export const MAX_COMPARE = 4

/**
 * GEÇİCİ kapı: karşılaştırma özelliği yayına alınana kadar sadece
 * localhost'ta görünür. Yayına alırken `return true` yapman yeterli.
 * (Build tipi fark etmez — hostname'e bakılır, çünkü yerelde de
 * production build servis ediliyor.)
 */
export function isCompareEnabled(): boolean {
    if (typeof window === "undefined") return false
    const h = window.location.hostname
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]"
}

function keyOf(p: Product): string {
    return p.slug || p.siteUrl || `${p.sistemAdi}::${p.magaza}`
}

function load(): Product[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const arr = JSON.parse(raw)
        return Array.isArray(arr) ? (arr as Product[]).slice(0, MAX_COMPARE) : []
    } catch {
        return []
    }
}

interface CompareContextValue {
    items: Product[]
    has: (p: Product) => boolean
    toggle: (p: Product) => void
    remove: (p: Product) => void
    clear: () => void
    /** Fiyat/stok tazele (slug üzerinden API; düşerse eski değer korunur). */
    revalidate: () => Promise<void>
    full: boolean
}

const CompareContext = createContext<CompareContextValue | null>(null)

export function CompareProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<Product[]>(load)

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
        } catch {
            // storage dolu/kapalıysa sessiz geç
        }
    }, [items])

    const has = useCallback(
        (p: Product) => items.some((i) => keyOf(i) === keyOf(p)),
        [items]
    )

    const toggle = useCallback((p: Product) => {
        setItems((prev) => {
            const k = keyOf(p)
            if (prev.some((i) => keyOf(i) === k)) return prev.filter((i) => keyOf(i) !== k)
            if (prev.length >= MAX_COMPARE) return prev
            return [...prev, p]
        })
    }, [])

    const remove = useCallback((p: Product) => {
        setItems((prev) => prev.filter((i) => keyOf(i) !== keyOf(p)))
    }, [])

    const clear = useCallback(() => setItems([]), [])

    const revalidate = useCallback(async () => {
        const fresh = await Promise.all(
            items.map(async (it) => {
                if (!it.slug) return it
                try {
                    const r = await fetchProductDetail(it.slug)
                    return {
                        ...it,
                        fiyat: r.product.fiyat,
                        price: r.product.price,
                        stoktaVarMi: r.product.stoktaVarMi,
                        resimUrl: r.product.resimUrl ?? it.resimUrl,
                        fpScore: r.product.fpScore ?? it.fpScore,
                    }
                } catch {
                    return it
                }
            })
        )
        setItems(fresh)
    }, [items])

    const value = useMemo(
        () => ({
            items,
            has,
            toggle,
            remove,
            clear,
            revalidate,
            full: items.length >= MAX_COMPARE,
        }),
        [items, has, toggle, remove, clear, revalidate]
    )

    return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
}

export function useCompare(): CompareContextValue {
    const ctx = useContext(CompareContext)
    if (!ctx) throw new Error("useCompare CompareProvider dışında kullanılamaz")
    return ctx
}
