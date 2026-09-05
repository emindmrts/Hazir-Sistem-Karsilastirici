import { getCpuTier, getGpuTier, cpuScores, gpuScores } from "./fp-scoring"

/**
 * versus.com entegrasyonu — karşılaştırma sayfasında "hangisi daha güçlü"
 * rozetleri + detaylı test sayfalarına dış bağlantılar.
 *
 * URL kuralları (doğrulanmış):
 *   CPU: https://versus.com/en/amd-ryzen-5-7500f-vs-intel-core-i5-12400f
 *   GPU: https://versus.com/en/amd-radeon-rx-7600-vs-nvidia-geforce-rtx-4060
 *
 * Güç skorları dahili benchmark kademelerinden gelir (fp-scoring.ts);
 * versus.com bağlantıları detaylı testler için kanıt/derinleşme sunar.
 */

const CPU_NOISE = new Set([
    "islemci", "processor", "cpu", "box", "kutulu", "kutusuz", "tray",
    "mpk", "fan", "soket", "socket", "nesil", "oem", "paket",
])

/**
 * "AMD Ryzen 5 7500F" → "amd-ryzen-5-7500f"
 * "Intel Core i5 12400F" → "intel-core-i5-12400f"
 * "AMD R5 7500F" → "amd-ryzen-5-7500f"
 * Belirsiz/kısa girdilerde null (bozuk link üretmemek için).
 */
export function versusCpuSlug(cpu?: string, marka?: string): string | null {
    if (!cpu) return null
    const toks = cpu
        .toLowerCase()
        .replace(/\(.*?\)/g, " ")
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .filter((t) => !CPU_NOISE.has(t))
        .filter((t) => !/^\d+(ghz|mhz|nm|mb|w)$/.test(t))
        .filter((t) => !/^(am[45]|lga\d+)$/.test(t))
    if (toks.length < 2) return null

    let brand = ""
    if (toks[0] === "amd" || toks.includes("ryzen")) brand = "amd"
    else if (toks[0] === "intel" || toks.includes("intel")) brand = "intel"
    else if (marka === "AMD") brand = "amd"
    else if (marka === "Intel") brand = "intel"
    else return null

    const rest = toks
        .filter((t) => t !== "amd" && t !== "intel")
        .flatMap((t) => {
            const m = /^r([3579])$/.exec(t)
            return m ? ["ryzen", m[1]] : [t]
        })

    // Model numarası yoksa (örn. "Ryzen 5") versus sayfası yoktur
    if (!rest.some((t) => /\d{3,}/.test(t))) return null

    return [brand, ...rest].join("-")
}

/**
 * "RTX 4060" → "nvidia-geforce-rtx-4060"
 * "RX 7600 XT" → "amd-radeon-rx-7600-xt"
 * "ARC A750" → "intel-arc-a750"
 */
export function versusGpuSlug(tier?: string): string | null {
    if (!tier) return null
    const t = tier.toUpperCase().trim()
    if (t === "UNKNOWN" || t === "N/A" || t === "") return null
    const slug = t.toLowerCase().replace(/\s+/g, "-")
    if (/^(RTX|GTX)\b/.test(t)) return `nvidia-geforce-${slug}`
    if (/^RX\b/.test(t)) return `amd-radeon-${slug}`
    if (/^ARC\b/.test(t)) return `intel-${slug}` // tier zaten "arc-..." içerir
    return null
}

export function versusCpuUrl(a: string, b: string): string {
    return `https://versus.com/en/${a}-vs-${b}`
}

export function versusGpuUrl(a: string, b: string): string {
    return `https://versus.com/en/${a}-vs-${b}`
}

/** Benchmark kademesine göre güç; bilinmeyen kademe → null (rozet yok). */
export function cpuStrength(islemci?: string): number | null {
    const s = cpuScores[getCpuTier(islemci)]
    return typeof s === "number" ? s : null
}

export function gpuStrength(ekranKarti?: string): number | null {
    const s = gpuScores[getGpuTier(ekranKarti)]
    if (typeof s === "number") return s
    // Ayrik GPU yok (APU/dahili/islemci yazilmis): en zayif kademede say
    const u = (ekranKarti || "").toUpperCase()
    if (!u || u === "N/A" || u === "YOK") return null
    if (/RTX|GTX|\bRX\s?\d|ARC\s+[AB]\d|RADEON\s+RX/i.test(u)) return null // discrete ama taninmiyor
    if (/RYZEN|UHD|DAHILI|APU|VEGA|RADEON|INTEL.*GRAPHICS|GRAFIK/i.test(u)) return 10
    return null
}

/** En güçlü iki farklı öğe (VS bağlantısı için). */
export function topTwo<T>(items: T[], strength: (x: T) => number | null): [T, T] | null {
    const ranked = items
        .map((it) => ({ it, s: strength(it) }))
        .filter((x): x is { it: T; s: number } => x.s != null)
        .sort((a, b) => b.s - a.s)
    if (ranked.length < 2 || ranked[0].it === ranked[1].it) return null
    return [ranked[0].it, ranked[1].it]
}
