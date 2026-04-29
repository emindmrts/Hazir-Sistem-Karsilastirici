import { useState, useEffect, useMemo } from "react"
import type { FilterState } from "../components/filter-sidebar"

// The shape of data returned from the backend mock.json
export interface Product {
    name: string
    price: number
    image?: string
    url?: string
    store?: string
    specs?: {
        CPU?: string
        GPU?: string
        RAM?: string
        SSD?: string
        Storage?: string
    }
    // Normalised fields we expose to components
    sistemAdi: string
    fiyat: number
    resimUrl: string
    siteUrl: string
    magaza: string
    islemci?: string
    islemciMarka?: string
    ekranKarti?: string
    ram?: string
    ssd?: string
    depolama?: string
    stoktaVarMi: boolean
}

function normalise(raw: Record<string, unknown>): Product {
    const price = Number(raw.price ?? 0)
    const cpu = ((raw.specs as Record<string, string>)?.CPU) ?? ""
    const gpu = ((raw.specs as Record<string, string>)?.GPU) ?? ""
    const ram = ((raw.specs as Record<string, string>)?.RAM) ?? ""
    const ssd = ((raw.specs as Record<string, string>)?.SSD) ?? ""
    const storage = ((raw.specs as Record<string, string>)?.Storage) ?? ""

    const cpuLower = cpu.toLowerCase()
    const cpuMarka = cpuLower.includes("intel") || cpuLower.includes("core") || cpuLower.includes("i3") || cpuLower.includes("i5") || cpuLower.includes("i7") || cpuLower.includes("i9")
        ? "Intel"
        : cpuLower.includes("amd") || cpuLower.includes("ryzen") || cpuLower.includes("r3") || cpuLower.includes("r5") || cpuLower.includes("r7")
            ? "AMD"
            : undefined

    return {
        ...(raw as unknown as Product),
        sistemAdi: (raw.name as string) ?? "",
        fiyat: price,
        resimUrl: (raw.image as string) ?? (raw.img as string) ?? "",
        siteUrl: (raw.url as string) ?? (raw.link as string) ?? "",
        magaza: (raw.store as string) ?? "",
        islemci: cpu || undefined,
        islemciMarka: cpuMarka,
        ekranKarti: gpu || undefined,
        ram: ram || undefined,
        ssd: ssd || undefined,
        gpuKey: gpu.split(" ").slice(0, 3).join(" ").toUpperCase(),
        depolama: storage || undefined,
        stoktaVarMi: (raw.store as string) === "pckolik" ? true : price > 0,
    }
}

export function useProducts() {
    const [allProducts, setAllProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [filters, setFilters] = useState<FilterState>({
        minPrice: "",
        maxPrice: "",
        stores: [],
        cpuBrands: [],
        gpuBrands: [],
        inStock: true,
        searchStr: "",
    })

    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(60)
    const [sortOrder, setSortOrder] = useState<"lowToHigh" | "highToLow">("lowToHigh")

    useEffect(() => {
        async function fetchProducts() {
            try {
                setIsLoading(true)
                const res = await fetch("/api/getProducts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pageSize: 99999, page: 1 }),
                })
                if (!res.ok) throw new Error("Ürünler yüklenirken hata oluştu.")
                const json = await res.json()
                const raw: Record<string, unknown>[] = json.data ?? json
                
                setAllProducts(raw.map(p => normalise(p)))

                // Load filters from URL
                const params = new URLSearchParams(window.location.search)
                const urlFilters: Partial<FilterState> = {}
                if (params.get("q")) urlFilters.searchStr = params.get("q") || ""
                if (params.get("stores")) urlFilters.stores = params.get("stores")?.split(",") || []
                if (params.get("min")) urlFilters.minPrice = Number(params.get("min")) || ""
                if (params.get("max")) urlFilters.maxPrice = Number(params.get("max")) || ""
                if (params.get("cpu")) urlFilters.cpuBrands = params.get("cpu")?.split(",") || []
                if (params.get("gpu")) urlFilters.gpuBrands = params.get("gpu")?.split(",") || []
                
                if (Object.keys(urlFilters).length > 0) {
                    setFilters(prev => ({ ...prev, ...urlFilters }))
                }

            } catch (err: unknown) {
                console.error("fetchProducts hatası:", err)
                setError(`Hata: ${(err as Error).message}`)
            } finally {
                setIsLoading(false)
            }
        }
        fetchProducts()
    }, [])

    // Sync filters to URL
    useEffect(() => {
        const params = new URLSearchParams()
        if (filters.searchStr) params.set("q", filters.searchStr)
        if (filters.stores.length) params.set("stores", filters.stores.join(","))
        if (filters.minPrice) params.set("min", filters.minPrice.toString())
        if (filters.maxPrice) params.set("max", filters.maxPrice.toString())
        if (filters.cpuBrands.length) params.set("cpu", filters.cpuBrands.join(","))
        if (filters.gpuBrands.length) params.set("gpu", filters.gpuBrands.join(","))
        
        const newRelativePathQuery = window.location.pathname + '?' + params.toString()
        if (params.toString()) {
            window.history.replaceState(null, '', newRelativePathQuery)
        } else {
            window.history.replaceState(null, '', window.location.pathname)
        }
    }, [filters])

    const processedProducts = useMemo(() => {
        let result = [...allProducts]

        if (filters.inStock) result = result.filter(p => p.stoktaVarMi)

        if (filters.searchStr.trim()) {
            const q = filters.searchStr.toLowerCase()
            result = result.filter(p =>
                p.sistemAdi.toLowerCase().includes(q) ||
                (p.islemci && p.islemci.toLowerCase().includes(q)) ||
                (p.ekranKarti && p.ekranKarti.toLowerCase().includes(q))
            )
        }

        if (filters.stores.length > 0) {
            result = result.filter(p => filters.stores.some(s => p.magaza.toLowerCase().includes(s.toLowerCase())))
        }

        if (filters.cpuBrands.length > 0) {
            result = result.filter(p => p.islemciMarka && filters.cpuBrands.includes(p.islemciMarka))
        }

        if (filters.gpuBrands.length > 0) {
            result = result.filter(p => {
                if (!p.ekranKarti) return false
                const t = p.ekranKarti.toUpperCase()
                if (filters.gpuBrands.includes("RTX") && t.includes("RTX")) return true
                if (filters.gpuBrands.includes("GTX") && t.includes("GTX")) return true
                if (filters.gpuBrands.includes("RX") && t.includes("RX") && !t.includes("RTX")) return true
                if (filters.gpuBrands.includes("ARC") && t.includes("ARC")) return true
                return false
            })
        }

        if (filters.minPrice !== "") result = result.filter(p => p.fiyat >= (filters.minPrice as number))
        if (filters.maxPrice !== "") result = result.filter(p => p.fiyat <= (filters.maxPrice as number))

        result.sort((a: Product, b: Product) => sortOrder === "lowToHigh" ? a.fiyat - b.fiyat : b.fiyat - a.fiyat)
        return result
    }, [allProducts, filters, sortOrder])

    const totalPages = Math.max(1, Math.ceil(processedProducts.length / pageSize))
    const paginatedProducts = useMemo(() => {
        const start = (page - 1) * pageSize
        return processedProducts.slice(start, start + pageSize)
    }, [processedProducts, page, pageSize])

    useEffect(() => {
        if (page > totalPages) setPage(1)
    }, [totalPages, page])

    const resetFilters = () => {
        setFilters({ minPrice: "", maxPrice: "", stores: [], cpuBrands: [], gpuBrands: [], inStock: true, searchStr: "" })
        setPage(1)
    }

    return {
        products: paginatedProducts,
        totalCount: processedProducts.length,
        isLoading,
        error,
        filters,
        setFilters,
        resetFilters,
        page,
        setPage,
        totalPages,
        pageSize,
        setPageSize,
        sortOrder,
        setSortOrder
    }
}
