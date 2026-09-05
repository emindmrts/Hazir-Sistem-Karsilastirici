import { useState, useEffect, useMemo, useRef } from "react"
import type { FilterState } from "../components/filter-sidebar"
import { assignSlugs } from "./use-slugs"
import { getCpuTier } from "../lib/fp-scoring"
import { fetchProductsPage, fetchFacets, fetchProductDetail } from "../lib/api"

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
        Motherboard?: string
        Case?: string
        PSU?: string
        Cooler?: string
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
    anakart?: string
    kasa?: string
    psu?: string
    sogutucu?: string
    stoktaVarMi: boolean
    gpuKey?: string
    islemciModel?: string
    /** F/P skoru — API modunda sunucu tarafından hesaplanır. */
    fpScore?: number
    /** Unique, stable URL slug assigned by assignSlugs(). */
    slug?: string
}

function parseCpuModel(cpuStr: string): string {
    if (!cpuStr) return ""
    if (/^(n\/a|intel|amd|ryzen|core|i3|i5|i7|i9|ultra)$/i.test(cpuStr.trim())) return ""

    const cleaned = cpuStr
        .replace(/İşlemci/gi, "")
        .replace(/INTEL-/gi, "")
        .replace(/AMD-/gi, "")
        .replace(/Intel/gi, "")
        .replace(/AMD/gi, "")
        .replace(/\s+/g, " ")
        .trim();

    const parts = cleaned.split(" ");
    for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i].trim().replace(/^i[3579]-/i, "");

        // Skip OEM kodlari (orn. 100-000001406)
        if (/^-?\d+-\d{5,}$/.test(part)) continue;
        
        // Skip general socket/cooler specs
        if (/ghz|lga|am\d|soket|box|kutulu|kutusuz|tray|fan|mpk/i.test(part)) continue;
        
        // Skip cache specs (e.g. 16mb, 32mb, önbellek)
        if (/mb|önbellek|onbellek/i.test(part)) continue;
        
        // Skip nanometer specs (e.g. 3nm, 5nm, 7nm, 10nm, 10nmm)
        if (/nm|nmm/i.test(part)) continue;
        
        // Skip core/thread specs
        if (/çekirdek|cekirdek|thread|pcie/i.test(part)) continue;

        // Skip storage/SSD specifications that leaked in
        if (/m\.?2|ssd|sata|nvme/i.test(part)) continue;

        // Skip motherboard chipsets (e.g. H610, B760, Z790, A620, X870)
        if (/^[hbzax]\d{3}/i.test(part)) continue;

        // Skip generic hardware words
        if (/anakart|motherboard|ram|gpu|ekran|kartı|karti|ddr/i.test(part)) continue;

        // Skip single/double digit numbers (cores/threads/series fallbacks)
        if (/^\d+$/.test(part) && part.length <= 2) continue;

        // Skip wattages (e.g., 65w, 105w, 120w, 170w)
        if (/^\d+w$/i.test(part)) continue;

        // Skip frequencies/version numbers with decimals/dots (e.g. 3.70, 4.2, 12., 14.)
        if (/\./.test(part)) continue;

        // Skip specific sockets like 1700 or 1851
        if (part === "1700" || part === "1851") continue;

        // Skip generation spec words (e.g. 14.nesil)
        if (/nesil|nesıl/i.test(part)) continue;

        // Skip frequency / memory clocks (e.g. 5600mhz)
        if (/mhz|hz/i.test(part)) continue;

        // Skip generic series names
        if (/^(ryzen|core|i3|i5|i7|i9|ultra|dual)$/i.test(part)) continue;

        if (/\d/.test(part)) {
            return part.toUpperCase();
        }
    }
    const fallback = (parts[parts.length - 1]?.toUpperCase() || "").replace(/^I[3579]-/, "");
    if (/^-?\d+-\d{5,}$/.test(fallback) || fallback === "") return "";
    if (/^(ryzen|core|i3|i5|i7|i9|ultra|dual|n\/a|intel|amd|anakart|motherboard|ram|ssd)$/i.test(fallback)) {
        return "";
    }
    if (/^\d+$/.test(fallback) && fallback.length <= 2) {
        return "";
    }
    if (/\./.test(fallback) || /w$/i.test(fallback) || /nm$/i.test(fallback) || fallback === "1700" || fallback === "1851" || /^[hbzax]\d{3}/i.test(fallback)) {
        return "";
    }
    return fallback;
}

// "N/A" / bos deger yok hukmundedir: arayuzde ham "N/A" metni gorunmez.
// Ayrica perakendecilerin parca adina ekledigi "(Stokta Yok)" dipnotlari
// ve "PSU Yok" kasa sonekleri temizlenir.
function orUndef(v: unknown): string | undefined {
    if (v == null) return undefined
    if (typeof v !== "string") return undefined
    const s = v
        .replace(/\s*\(stokta?\s+(yok|var)\)\s*/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
    const t = s.toLowerCase()
    if (t === "" || t === "n/a" || t === "yok" || t === "yoktur" || t === "-" || t === "--") return undefined
    return s
}

function normalise(raw: Record<string, unknown>): Product {
    const price = Number(raw.price ?? 0)
    const cpu = ((raw.specs as Record<string, string>)?.CPU) ?? ""
    const gpu = ((raw.specs as Record<string, string>)?.GPU) ?? ""
    const ram = ((raw.specs as Record<string, string>)?.RAM) ?? ""
    const ssd = ((raw.specs as Record<string, string>)?.SSD) ?? ""
    const storage = ((raw.specs as Record<string, string>)?.Storage) ?? ""
    const motherboard = ((raw.specs as Record<string, string>)?.Motherboard) ?? ""
    const pc_case = ((raw.specs as Record<string, string>)?.Case) ?? ""
    const psu = ((raw.specs as Record<string, string>)?.PSU) ?? ""
    const cooler = ((raw.specs as Record<string, string>)?.Cooler) ?? ""

    const cpuLower = cpu.toLowerCase()
    const cpuMarka = cpuLower.includes("intel") || cpuLower.includes("core") || cpuLower.includes("i3") || cpuLower.includes("i5") || cpuLower.includes("i7") || cpuLower.includes("i9")
        ? "Intel"
        : cpuLower.includes("amd") || cpuLower.includes("ryzen") || cpuLower.includes("r3") || cpuLower.includes("r5") || cpuLower.includes("r7")
            ? "AMD"
            : undefined

    // Model adi: bilinen cip tier'i kullan (farkli yazimlar birlesir).
    // Tier bilinmiyorsa eski heuristic'e dus.
    const cpuTierName = getCpuTier(cpu);
    const parsedModel = cpuTierName !== "UNKNOWN" ? cpuTierName : parseCpuModel(cpu);

    // Kasa "PSU Yok" diyorsa PSU satiri "Dahil Değil" olur; kasa adindaki
    // sonek temizlenir (bilgi PSU satirina tasinmis olur).
    let caseVal = orUndef(pc_case)
    let psuVal = orUndef(psu)
    if (!psuVal && /psu\s*yok/i.test(pc_case || "")) psuVal = "Dahil Değil"
    if (caseVal) {
        const stripped = caseVal.replace(/\s*PSU\s*YOK?\s*/gi, " ").replace(/\s+/g, " ").trim()
        if (stripped) caseVal = stripped
    }

    return {
        ...(raw as unknown as Product),
        sistemAdi: (raw.name as string) ?? "",
        fiyat: price,
        resimUrl: (raw.image as string) ?? (raw.img as string) ?? "",
        siteUrl: (raw.url as string) ?? (raw.link as string) ?? "",
        magaza: (raw.store as string) ?? "",
        islemci: orUndef(cpu),
        islemciMarka: cpuMarka,
        islemciModel: parsedModel || undefined,
        ekranKarti: orUndef(gpu),
        ram: orUndef(ram),
        ssd: orUndef(ssd),
        gpuKey: (orUndef(gpu) ?? "").split(" ").slice(0, 3).join(" ").toUpperCase(),

        depolama: orUndef(storage),
        anakart: orUndef(motherboard),
        kasa: caseVal,
        psu: psuVal,
        sogutucu: orUndef(cooler),
        stoktaVarMi: (raw.store as string) === "pckolik" ? true : price > 0,
    }
}

const EMPTY_MODELS = { AMD: [] as string[], Intel: [] as string[] }

export function useProducts() {
    // "api": sunucu taraflı sayfalama (~50KB/sayfa). Başarısız olursa
    // kalıcı olarak "static" moda düşer (2MB mock.json, eski davranış).
    const [mode, setMode] = useState<"api" | "static">("api")

    // API modu state
    const [apiItems, setApiItems] = useState<Product[]>([])
    const [apiTotal, setApiTotal] = useState(0)
    const [apiPages, setApiPages] = useState(1)
    const [apiModels, setApiModels] = useState<{ AMD: string[]; Intel: string[] } | null>(null)

    // Statik mod state (eski davranış)
    const [staticAll, setStaticAll] = useState<Product[]>([])

    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const fellBack = useRef(false)
    const prevSearch = useRef<string | null>(null)

    const [filters, setFilters] = useState<FilterState>({
        minPrice: "",
        maxPrice: "",
        stores: [],
        cpuBrands: [],
        gpuBrands: [],
        gpuSeries: [],
        cpuSeries: [],
        cpuModels: [],
        inStock: true,
        searchStr: "",
    })

    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(60)
    const [sortOrder, setSortOrder] = useState<"lowToHigh" | "highToLow">("lowToHigh")

    // URL'den filtreleri bir kez yükle (her iki modda da geçerli)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const urlFilters: Partial<FilterState> = {}
        if (params.get("q")) urlFilters.searchStr = params.get("q") || ""
        if (params.get("stores")) urlFilters.stores = params.get("stores")?.split(",") || []
        if (params.get("min")) urlFilters.minPrice = Number(params.get("min")) || ""
        if (params.get("max")) urlFilters.maxPrice = Number(params.get("max")) || ""
        if (params.get("cpu")) urlFilters.cpuBrands = params.get("cpu")?.split(",") || []
        if (params.get("cpuSeries")) urlFilters.cpuSeries = params.get("cpuSeries")?.split(",") || []
        if (params.get("cpuModels")) urlFilters.cpuModels = params.get("cpuModels")?.split(",") || []
        if (params.get("gpu")) urlFilters.gpuBrands = params.get("gpu")?.split(",") || []

        if (Object.keys(urlFilters).length > 0) {
            setFilters(prev => ({ ...prev, ...urlFilters }))
        }
    }, [])

    // API modu: filtre/sayfa değiştikçe sunucudan sayfa çek
    useEffect(() => {
        if (mode !== "api") return
        let cancelled = false
        setIsLoading(true)

        // Arama yazarken istek yağmurunu önle
        const delay = prevSearch.current !== null && prevSearch.current !== filters.searchStr ? 300 : 0
        prevSearch.current = filters.searchStr

        const t = setTimeout(async () => {
            try {
                const [pg, fc] = await Promise.all([
                    fetchProductsPage({
                        searchStr: filters.searchStr,
                        minPrice: filters.minPrice,
                        maxPrice: filters.maxPrice,
                        stores: filters.stores,
                        cpuBrands: filters.cpuBrands,
                        cpuSeries: filters.cpuSeries,
                        cpuModels: filters.cpuModels ?? [],
                        gpuBrands: filters.gpuBrands,
                        gpuSeries: filters.gpuSeries,
                        inStock: filters.inStock,
                        page,
                        pageSize,
                        sortOrder,
                    }),
                    fetchFacets({ cpuBrands: filters.cpuBrands, cpuSeries: filters.cpuSeries }),
                ])
                if (cancelled) return
                setApiItems(pg.data as Product[])
                setApiTotal(pg.pagination.totalItems)
                setApiPages(pg.pagination.totalPages)
                setApiModels(fc.cpuModels)
                setError(null)
            } catch (err: unknown) {
                if (cancelled) return
                console.warn("API kullanılamıyor, statik moda geçiliyor:", err)
                if (!fellBack.current) {
                    fellBack.current = true
                    setMode("static")
                } else {
                    setError(`Hata: ${(err as Error).message}`)
                }
            } finally {
                if (!cancelled && mode === "api") setIsLoading(false)
            }
        }, delay)

        return () => {
            cancelled = true
            clearTimeout(t)
        }
    }, [mode, filters, page, pageSize, sortOrder])

    // Statik mod: tüm kataloğu indir (eski davranış, fallback)
    useEffect(() => {
        if (mode !== "static") return
        let cancelled = false
        async function fetchProducts() {
            try {
                setIsLoading(true)
                const res = await fetch("/mock.json")
                if (!res.ok) throw new Error("Ürünler yüklenirken hata oluştu.")
                const raw: Record<string, unknown>[] = await res.json()

                if (!cancelled) setStaticAll(assignSlugs(raw.map(p => normalise(p))))
            } catch (err: unknown) {
                console.error("fetchProducts hatası:", err)
                if (!cancelled) setError(`Hata: ${(err as Error).message}`)
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        fetchProducts()
        return () => {
            cancelled = true
        }
    }, [mode])

    // Sync filters to URL
    useEffect(() => {
        const params = new URLSearchParams()
        if (filters.searchStr) params.set("q", filters.searchStr)
        if (filters.stores.length) params.set("stores", filters.stores.join(","))
        if (filters.minPrice) params.set("min", filters.minPrice.toString())
        if (filters.maxPrice) params.set("max", filters.maxPrice.toString())
        if (filters.cpuBrands.length) params.set("cpu", filters.cpuBrands.join(","))
        if (filters.cpuSeries.length) params.set("cpuSeries", filters.cpuSeries.join(","))
        if (filters.cpuModels && filters.cpuModels.length) params.set("cpuModels", filters.cpuModels.join(","))
        if (filters.gpuBrands.length) params.set("gpu", filters.gpuBrands.join(","))
        
        const newRelativePathQuery = window.location.pathname + '?' + params.toString()
        if (params.toString()) {
            window.history.replaceState(null, '', newRelativePathQuery)
        } else {
            window.history.replaceState(null, '', window.location.pathname)
        }
    }, [filters])

    // Statik mod: CPU model dropdown (API modunda /api/facets kullanılır)
    const staticCpuModels = useMemo(() => {
        const amdModels = new Set<string>()
        const intelModels = new Set<string>()
        staticAll.forEach(p => {
            if (p.islemciModel && p.islemciMarka) {
                // If brand filter is active, only include models from that brand
                if (filters.cpuBrands.length > 0 && !filters.cpuBrands.includes(p.islemciMarka)) {
                    return
                }
                // If series filter is active, only include models from that series
                if (filters.cpuSeries.length > 0 && p.islemci) {
                    const matchesSeries = filters.cpuSeries.some(s => {
                        const t = p.islemci!.toUpperCase()
                        const upperS = s.toUpperCase()
                        if (upperS === "CORE I3") return t.includes("I3")
                        if (upperS === "CORE I5") return t.includes("I5")
                        if (upperS === "CORE I7") return t.includes("I7")
                        if (upperS === "CORE I9") return t.includes("I9")
                        if (upperS === "RYZEN 3") return t.includes("RYZEN 3") || t.includes("R3")
                        if (upperS === "RYZEN 5") return t.includes("RYZEN 5") || t.includes("R5")
                        if (upperS === "RYZEN 7") return t.includes("RYZEN 7") || t.includes("R7")
                        if (upperS === "RYZEN 9") return t.includes("RYZEN 9") || t.includes("R9")
                        return t.includes(upperS)
                    })
                    if (!matchesSeries) return
                }
                
                if (p.islemciMarka === "AMD") {
                    amdModels.add(p.islemciModel)
                } else if (p.islemciMarka === "Intel") {
                    intelModels.add(p.islemciModel)
                }
            }
        })
        return {
            AMD: Array.from(amdModels).sort(),
            Intel: Array.from(intelModels).sort()
        }
    }, [staticAll, filters.cpuBrands, filters.cpuSeries])

    // Statik mod: filtre + sıralama (API modunda sunucu yapar)
    const staticProcessed = useMemo(() => {
        let result = [...staticAll]

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

        if (filters.cpuSeries.length > 0) {
            result = result.filter(p => {
                if (!p.islemci) return false
                const t = p.islemci.toUpperCase()
                return filters.cpuSeries.some(s => {
                    const upperS = s.toUpperCase()
                    if (upperS === "CORE I3") return t.includes("I3")
                    if (upperS === "CORE I5") return t.includes("I5")
                    if (upperS === "CORE I7") return t.includes("I7")
                    if (upperS === "CORE I9") return t.includes("I9")
                    if (upperS === "RYZEN 3") return t.includes("RYZEN 3") || t.includes("R3")
                    if (upperS === "RYZEN 5") return t.includes("RYZEN 5") || t.includes("R5")
                    if (upperS === "RYZEN 7") return t.includes("RYZEN 7") || t.includes("R7")
                    if (upperS === "RYZEN 9") return t.includes("RYZEN 9") || t.includes("R9")
                    return t.includes(upperS)
                })
            })
        }

        if (filters.cpuModels && filters.cpuModels.length > 0) {
            result = result.filter(p => p.islemciModel && filters.cpuModels!.includes(p.islemciModel))
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

        if (filters.gpuSeries.length > 0) {
            result = result.filter(p => {
                if (!p.ekranKarti) return false
                const t = p.ekranKarti.toUpperCase()
                return filters.gpuSeries.some(s => t.includes(s))
            })
        }

        if (filters.minPrice !== "") result = result.filter(p => p.fiyat >= (filters.minPrice as number))
        if (filters.maxPrice !== "") result = result.filter(p => p.fiyat <= (filters.maxPrice as number))

        result.sort((a: Product, b: Product) => sortOrder === "lowToHigh" ? a.fiyat - b.fiyat : b.fiyat - a.fiyat)
        return result
    }, [staticAll, filters, sortOrder])

    const staticTotalPages = Math.max(1, Math.ceil(staticProcessed.length / pageSize))
    const staticPaginated = useMemo(() => {
        const start = (page - 1) * pageSize
        return staticProcessed.slice(start, start + pageSize)
    }, [staticProcessed, page, pageSize])

    // Moda göre çıktı seç
    const products = mode === "api" ? apiItems : staticPaginated
    const totalCount = mode === "api" ? apiTotal : staticProcessed.length
    const totalPages = mode === "api" ? apiPages : staticTotalPages
    const allProducts = mode === "api" ? [] : staticAll
    const availableCpuModels = mode === "api" ? (apiModels ?? EMPTY_MODELS) : staticCpuModels

    useEffect(() => {
        if (page > totalPages) setPage(1)
    }, [totalPages, page])

    const resetFilters = () => {
        setFilters({ minPrice: "", maxPrice: "", stores: [], cpuBrands: [], gpuBrands: [], gpuSeries: [], cpuSeries: [], cpuModels: [], inStock: true, searchStr: "" })
        setPage(1)
    }

    return {
        products,
        allProducts,
        totalCount,
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
        setSortOrder,
        availableCpuModels
    }
}

/** Detay sayfası için tek ürün + benzerler (API; düşerse tanımsız döner). */
export function useProductDetail(slug: string) {
    const [state, setState] = useState<{ loading: boolean; product?: Product; similar?: Product[] }>({
        loading: true,
    })

    useEffect(() => {
        let cancelled = false
        setState({ loading: true })
        fetchProductDetail(slug)
            .then(r => {
                if (!cancelled) setState({ loading: false, product: r.product, similar: r.similar })
            })
            .catch(() => {
                if (!cancelled) setState({ loading: false })
            })
        return () => {
            cancelled = true
        }
    }, [slug])

    return state
}
