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

const STORAGE_KEY = "karsilastir-favs-v1"

function keyOf(p: Product): string {
    return p.slug || p.siteUrl || `${p.sistemAdi}::${p.magaza}`
}

function load(): Product[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const arr = JSON.parse(raw)
        return Array.isArray(arr) ? (arr as Product[]) : []
    } catch {
        return []
    }
}

interface FavoritesContextValue {
    items: Product[]
    count: number
    has: (p: Product) => boolean
    toggle: (p: Product) => void
    remove: (p: Product) => void
    clear: () => void
    /** Fitleri/fiyatları slug üzerinden tazele (detail API). */
    revalidate: () => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
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
                        change7dPct: r.product.change7dPct ?? it.change7dPct,
                    }
                } catch {
                    return it
                }
            })
        )
        setItems(fresh)
    }, [items])

    const value = useMemo(
        () => ({ items, count: items.length, has, toggle, remove, clear, revalidate }),
        [items, has, toggle, remove, clear, revalidate]
    )

    return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites(): FavoritesContextValue {
    const ctx = useContext(FavoritesContext)
    if (!ctx) throw new Error("useFavorites FavoritesProvider dışında kullanılamaz")
    return ctx
}