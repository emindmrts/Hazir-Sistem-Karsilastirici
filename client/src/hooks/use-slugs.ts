/**
 * Generates a URL-friendly slug from a product name and store.
 * Example: "KUARK VULCAN" + "itopya" → "itopya-kuark-vulcan"
 */
export function createSlug(name: string, store: string): string {
    const cleanName = name
        .toLowerCase()
        .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
        .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")

    const cleanStore = store
        .toLowerCase()
        .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
        .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
        .replace(/[^a-z0-9]/g, "")

    return `${cleanStore}-${cleanName}`
}

/**
 * Finds a product from the array matching the given slug.
 */
export function findBySlug<T extends { name: string; sistemAdi: string; magaza: string }>(
    products: T[],
    slug: string
): T | undefined {
    return products.find(p => createSlug(p.name || p.sistemAdi, p.magaza) === slug)
}
