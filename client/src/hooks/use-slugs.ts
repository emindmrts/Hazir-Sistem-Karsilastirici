/**
 * Base slug from a product name and store.
 * Example: "KUARK VULCAN" + "itopya" → "itopya-kuark-vulcan"
 */
export function createSlug(name: string, store: string): string {
    const cleanName = name
        .toLocaleLowerCase('tr-TR')
        .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
        .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")

    const cleanStore = store
        .toLocaleLowerCase('tr-TR')
        .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
        .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
        .replace(/[^a-z0-9]/g, "")

    return `${cleanStore}-${cleanName}`
}

/** Deterministic short hash (djb2, base36) used to disambiguate colliding slugs. */
export function shortHash(str: string): string {
    let h = 5381
    for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0
    return h.toString(36).slice(0, 6)
}

interface Sluggable {
    name?: string
    sistemAdi?: string
    magaza?: string
    store?: string
    url?: string
    siteUrl?: string
    slug?: string
}

function nameOf(p: Sluggable): string {
    return p.name || p.sistemAdi || ""
}

function storeOf(p: Sluggable): string {
    return p.magaza || p.store || ""
}

/** Per-product identity for disambiguation: the store URL (unique per listing). */
function identityOf(p: Sluggable): string {
    return p.url || p.siteUrl || `${nameOf(p)}-${storeOf(p)}`
}

/**
 * Assigns a unique, stable `slug` to every product in place.
 *
 * A slug is just the name+store base when that base is unique. When several
 * products share the same base (same name+store but different listings), a short
 * hash of the store URL is appended so each distinct listing gets its own URL
 * (and appears in the sitemap). Rows sharing the same URL collapse to one slug.
 */
export function assignSlugs<T extends Sluggable>(products: T[]): T[] {
    const baseCounts = new Map<string, number>()
    for (const p of products) {
        const base = createSlug(nameOf(p), storeOf(p))
        baseCounts.set(base, (baseCounts.get(base) || 0) + 1)
    }
    for (const p of products) {
        const base = createSlug(nameOf(p), storeOf(p))
        p.slug = (baseCounts.get(base) || 0) > 1
            ? `${base}-${shortHash(identityOf(p))}`
            : base
    }
    return products
}

/**
 * Finds a product matching the given slug. Products must have been passed
 * through {@link assignSlugs} first (as `useProducts` does).
 */
export function findBySlug<T extends Sluggable>(
    products: T[],
    slug: string
): T | undefined {
    return products.find(p => p.slug === slug)
}
