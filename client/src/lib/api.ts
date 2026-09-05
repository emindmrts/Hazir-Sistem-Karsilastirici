import type { Product } from "@/hooks/use-products"

/**
 * Backend API istemcisi (sunucu taraflı sayfalama).
 *
 * API_BASE çözümü:
 *   - VITE_API_URL tanımlıysa onu kullan (örn. Vercel static + Railway API).
 *   - Tanımlı değilse same-origin "/api" (Railway full-stack + `vite dev`
 *     proxy'si buraya düşer).
 *
 * API'ye ulaşılamazsa veya cevap beklenen şekilde değilse çağrılar throw
 * eder — useProducts/useProductDetail bu durumda statik /mock.json
 * akışına düşer (fallback). Böylece API'siz deploy'da site çalışmaya
 * devam eder.
 */

export const API_BASE: string =
    ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "")

async function req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, init)
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
    const ct = res.headers.get("content-type") ?? ""
    if (!ct.includes("application/json")) throw new Error(`API non-JSON: ${path}`)
    return (await res.json()) as T
}

export interface ProductsPageResponse {
    data: Product[]
    pagination: {
        totalItems: number
        totalPages: number
        currentPage: number
        pageSize: number
    }
    grouped?: false
}

export interface ProductGroup {
    key: string
    title: string
    image: string
    minPrice: number
    maxPrice: number
    storeCount: number
    offerCount: number
    stores: string[]
    offers: Product[]
}

export interface GroupedPageResponse {
    data: ProductGroup[]
    pagination: {
        totalItems: number
        totalPages: number
        currentPage: number
        pageSize: number
    }
    grouped: true
}

export interface ProductDetailResponse {
    product: Product
    similar: Product[]
}

export interface FacetsResponse {
    cpuModels: { AMD: string[]; Intel: string[] }
}

function isGroupedPage(r: unknown): r is GroupedPageResponse {
    if (typeof r !== "object" || r === null) return false
    const o = r as Record<string, unknown>
    const p = o.pagination as Record<string, unknown> | undefined
    return (
        o.grouped === true &&
        Array.isArray(o.data) &&
        typeof p === "object" && p !== null &&
        typeof p.totalItems === "number" &&
        typeof p.totalPages === "number"
    )
}

function isProductsPage(r: unknown): r is ProductsPageResponse {
    if (typeof r !== "object" || r === null) return false
    const o = r as Record<string, unknown>
    if (!Array.isArray(o.data)) return false
    const p = o.pagination as Record<string, unknown> | undefined
    return (
        typeof p === "object" && p !== null &&
        typeof p.totalItems === "number" &&
        typeof p.totalPages === "number"
    )
}

export interface ProductQuery {
    searchStr?: string
    minPrice?: number | ""
    maxPrice?: number | ""
    stores?: string[]
    cpuBrands?: string[]
    cpuSeries?: string[]
    cpuModels?: string[]
    gpuBrands?: string[]
    gpuSeries?: string[]
    inStock?: boolean
    page?: number
    pageSize?: number
    sortOrder?: "lowToHigh" | "highToLow"
    groupByConfig?: boolean
}

export async function fetchProductsPage(q: ProductQuery): Promise<ProductsPageResponse | GroupedPageResponse> {
    const r = await req<unknown>("/api/getProducts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(q),
    })
    if (!isProductsPage(r) && !isGroupedPage(r)) throw new Error("API unexpected shape: /api/getProducts")
    return r
}

export async function fetchFacets(params: {
    cpuBrands?: string[]
    cpuSeries?: string[]
}): Promise<FacetsResponse> {
    const sp = new URLSearchParams()
    for (const b of params.cpuBrands ?? []) sp.append("cpuBrands", b)
    for (const s of params.cpuSeries ?? []) sp.append("cpuSeries", s)
    const qs = sp.toString()
    const r = await req<unknown>(`/api/facets${qs ? `?${qs}` : ""}`)
    if (
        typeof r !== "object" || r === null ||
        typeof (r as Record<string, unknown>).cpuModels !== "object"
    ) {
        throw new Error("API unexpected shape: /api/facets")
    }
    return r as FacetsResponse
}

export async function fetchProductDetail(slug: string): Promise<ProductDetailResponse> {
    const r = await req<unknown>(`/api/product/${encodeURIComponent(slug)}`)
    if (
        typeof r !== "object" || r === null ||
        typeof (r as Record<string, unknown>).product !== "object" ||
        !Array.isArray((r as Record<string, unknown>).similar)
    ) {
        throw new Error("API unexpected shape: /api/product/:slug")
    }
    return r as ProductDetailResponse
}
