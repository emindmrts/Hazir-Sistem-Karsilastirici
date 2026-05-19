import type { Product } from "@/hooks/use-products"

// --- Donanım Bağıl Güç Puanları (Heuristic Scores) ---
// Not: Bu puanlar yaklaşık 3DMark / sentetik testlerin bağıl sıralamasıdır.

const gpuScores: Record<string, number> = {
    "RTX 5090": 450,
    "RTX 5080": 380,
    "RTX 4090": 350,
    "RX 7900 XTX": 320,
    "RTX 4080 SUPER": 280,
    "RTX 4080": 260,
    "RX 7900 XT": 250,
    "RTX 4070 TI SUPER": 230,
    "RTX 4070 TI": 210,
    "RX 7900 GRE": 200,
    "RTX 4070 SUPER": 190,
    "RX 7800 XT": 180,
    "RTX 4070": 170,
    "RX 6800 XT": 160,
    "RX 7700 XT": 150,
    "RTX 4060 TI": 130,
    "RX 6700 XT": 125,
    "RTX 3060 TI": 115,
    "RTX 4060": 100, // BASELINE
    "RX 7600 XT": 95,
    "RX 7600": 85,
    "RTX 3060": 75,
    "RX 6600 XT": 75,
    "ARC A770": 70,
    "RX 6600": 65,
    "ARC A750": 60,
    "RTX 3050": 50,
    "GTX 1660 SUPER": 45,
    "GTX 1650": 30,
}

const cpuScores: Record<string, number> = {
    "14900K": 250,
    "7950X3D": 240,
    "7800X3D": 220,
    "14700K": 200,
    "13700K": 190,
    "7900X": 180,
    "14600K": 170,
    "13600K": 160,
    "7700X": 150,
    "7600X": 135,
    "7600": 130,
    "7500F": 120, // POPÜLER BASELINE
    "14400F": 115,
    "13400F": 110,
    "12400F": 80,
    "5600X": 80,
    "5600": 75,
    "12100F": 60,
    "5500": 55,
    "4500": 40,
}

export function getGpuTier(gpuStr?: string): string {
    if (!gpuStr) return "UNKNOWN"
    const upper = gpuStr.toUpperCase()

    // 1. Seriler ve Çipler - Çok spesifik olanları önce arayalım
    for (const key of Object.keys(gpuScores).sort((a, b) => b.length - a.length)) {
        // Regex kullanarak key'i (örn. "RTX 4060 TI") tam olarak eşleştirmeye çalışalım
        // Boşlukları esnek bırakıyoruz: "RTX 4060 Ti" -> /RTX\s*4060\s*TI/i
        const regexStr = key.replace(/\s+/g, "\\s*")
        const regex = new RegExp(regexStr)
        if (regex.test(upper)) {
            return key
        }
    }

    // Eğer bilinen bir listeye girmiyorsa generic bir Regex fallback
    const rtxMatch = upper.match(/RTX\s*(40[6-9]0|30[5-9]0|50[7-9]0)(?:\s*(TI|SUPER))?/)
    if (rtxMatch) return rtxMatch[0].replace(/\s+/g, " ")

    const gtxMatch = upper.match(/GTX\s*(16[5-6]0|10[5-8]0)(?:\s*(TI|SUPER))?/)
    if (gtxMatch) return gtxMatch[0].replace(/\s+/g, " ")

    const rxMatch = upper.match(/RX\s*(6[4-9]00|7[6-9]00)(?:\s*(XT|GRE))?/)
    if (rxMatch) return rxMatch[0].replace(/\s+/g, " ")

    return "UNKNOWN"
}

export function getCpuTier(cpuStr?: string): string {
    if (!cpuStr) return "UNKNOWN"
    const upper = cpuStr.toUpperCase()

    for (const key of Object.keys(cpuScores).sort((a, b) => b.length - a.length)) {
        if (upper.includes(key)) {
            return key
        }
    }
    return "UNKNOWN"
}

function getRamCapacity(ramStr?: string): number {
    if (!ramStr) return 16
    // Sadece 1, 2 veya 3 basamaklı mantıklı RAM miktarlarını alalım (örn: 508016GB'ı engellemek için \b kullanıyoruz)
    const match = ramStr.toUpperCase().match(/\b(\d{1,3})\s*GB\b/)
    if (match) return parseInt(match[1], 10)
    return 16
}

function getSsdCapacityTb(ssdStr?: string): number {
    if (!ssdStr) return 0.5 // Default 500GB
    const upper = ssdStr.toUpperCase()
    if (upper.includes("2TB") || upper.includes("2 TB")) return 2.0
    if (upper.includes("1TB") || upper.includes("1 TB")) return 1.0
    if (upper.includes("500GB") || upper.includes("512GB") || upper.includes("480GB")) return 0.5
    if (upper.includes("250GB") || upper.includes("256GB") || upper.includes("240GB")) return 0.25
    return 0.5
}

/**
 * Calculates a dynamic Fiyat/Performans (Price/Performance) score using a synthetic performance formula.
 */
export function calculateFPScore(product: Product, allProducts: Product[]): number {
    if (!product.fiyat || product.fiyat <= 0) return 50

    // 1. Donanım Puanlarını Hesapla
    const gpuTier = getGpuTier(product.ekranKarti)
    const cpuTier = getCpuTier(product.islemci)
    
    const gpuScore = gpuScores[gpuTier] || 80  // Bilinmeyen GPU için standart 80
    const cpuScore = cpuScores[cpuTier] || 80  // Bilinmeyen CPU için standart 80
    const ramGb = getRamCapacity(product.ram)
    const ssdTb = getSsdCapacityTb(product.ssd || product.depolama)

    // 2. Toplam Sentetik Performans Skoru Formülü
    // Ağırlıklar: GPU en önemli, CPU ikinci, RAM ve SSD destekleyici
    const totalPerformance = (gpuScore * 1.0) + (cpuScore * 0.35) + (ramGb * 1.5) + (ssdTb * 10)

    // 3. Ham F/P Oranı (Performans Puanı / Fiyat * 1000)
    // Örnek: (100 + 42 + 24 + 5) = 171 Performans. Fiyat 25.000 ise RawFP = 6.84
    const rawFp = (totalPerformance / product.fiyat) * 1000

    // 4. Tüm Sistemlerin Ham F/P Oranlarını Bularak Normalizasyon Yap
    const rawFpList: number[] = []

    allProducts.forEach(p => {
        if (p.fiyat > 0 && p.stoktaVarMi) {
            const gT = getGpuTier(p.ekranKarti)
            const cT = getCpuTier(p.islemci)
            const gS = gpuScores[gT] || 80
            const cS = cpuScores[cT] || 80
            const rGb = getRamCapacity(p.ram)
            const sTb = getSsdCapacityTb(p.ssd || p.depolama)
            const perf = (gS * 1.0) + (cS * 0.35) + (rGb * 1.5) + (sTb * 10)
            const rFp = (perf / p.fiyat) * 1000
            
            rawFpList.push(rFp)
        }
    })

    if (rawFpList.length < 5) {
        return 70 // Yeterli sistem yoksa varsayılan puan
    }

    // Outlier'lara karşı koruma için Ortalama (Average) yerine Medyan (Median) kullanalım
    rawFpList.sort((a, b) => a - b)
    const mid = Math.floor(rawFpList.length / 2)
    const medianRawFp = rawFpList.length % 2 !== 0 
        ? rawFpList[mid] 
        : (rawFpList[mid - 1] + rawFpList[mid]) / 2

    // 5. Skoru 0-100 arasına oturt
    // Medyan değere 70 puan verelim ki üstüne çıkmak zorlaşsın.
    const scoreRatio = rawFp / medianRawFp
    let finalScore = scoreRatio * 70

    // Skoru yumuşat (Outlierları sınırla)
    finalScore = Math.max(30, Math.min(99, Math.round(finalScore)))

    return finalScore
}
