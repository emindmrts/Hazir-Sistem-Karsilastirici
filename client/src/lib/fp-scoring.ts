import type { Product } from "@/hooks/use-products"

// --- Donanım Bağıl Güç Puanları (Heuristic Scores) ---
// Not: Bu puanlar yaklaşık 3DMark / sentetik testlerin bağıl sıralamasıdır.

const gpuScores: Record<string, number> = {
    "RTX 5090": 450,
    "RTX 5080": 380,
    "RTX 5070 TI": 300,
    "RTX 5070": 250,
    "RX 9070 XT": 260,
    "RX 9070": 230,
    "RTX 5060 TI": 180,
    "RX 9060 XT": 160,
    "RTX 5060": 145,
    "RX 9060": 130,
    "RTX 5050": 110,
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
    "ARC B580": 95,
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
    "9950X3D": 260,
    "9800X3D": 250,
    "9900X3D": 240,
    "285K": 230,
    "14900K": 250,
    "7950X3D": 240,
    "7800X3D": 220,
    "270K": 195,
    "265KF": 190,
    "265K": 190,
    "14700K": 200,
    "13700K": 190,
    "9700X": 180,
    "7900X": 180,
    "14600K": 170,
    "13600K": 160,
    "7700X": 150,
    "250KF": 145,
    "250K": 145,
    "245KF": 140,
    "245K": 140,
    "9600X": 140,
    "7600X": 135,
    "7600": 130,
    "7500F": 120, // POPÜLER BASELINE
    "14400F": 115,
    "225F": 110,
    "225": 110,
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
        // Regex kullanarak key'i (örn. "RTX 5060 TI") tam olarak eşleştirmeye çalışalım
        // Boşlukları esnek bırakıyoruz: "RTX 4060 Ti" -> /RTX\s*4060\s*TI/i
        const regexStr = key.replace(/\s+/g, "\\s*")
        const regex = new RegExp(regexStr)
        if (regex.test(upper)) {
            return key
        }
    }

    // Eğer bilinen bir listeye girmiyorsa generic bir Regex fallback
    const rtxMatch = upper.match(/RTX\s*(50[5-9]0|40[6-9]0|30[5-9]0)(?:\s*(TI|SUPER))?/)
    if (rtxMatch) return rtxMatch[0].replace(/\s+/g, " ")

    const gtxMatch = upper.match(/GTX\s*(16[5-6]0|10[5-8]0)(?:\s*(TI|SUPER))?/)
    if (gtxMatch) return gtxMatch[0].replace(/\s+/g, " ")

    const rxMatch = upper.match(/RX\s*(90[6-7]0|7[6-9]00|6[4-9]00)(?:\s*(XT|GRE))?/)
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

function getMoboScore(moboStr?: string): number {
    if (!moboStr) return 10
    const upper = moboStr.toUpperCase()
    if (upper.includes("Z890") || upper.includes("X870") || upper.includes("X670") || upper.includes("Z790") || upper.includes("B650E")) return 30
    if (upper.includes("B650") || upper.includes("B760") || upper.includes("B860") || upper.includes("B850") || upper.includes("X570") || upper.includes("B550")) return 20
    if (upper.includes("A620") || upper.includes("H610") || upper.includes("H810") || upper.includes("B840") || upper.includes("A520") || upper.includes("B450")) return 10
    return 12
}

function getCoolerScore(coolerStr?: string): number {
    if (!coolerStr) return 5
    const upper = coolerStr.toUpperCase()
    if (upper.includes("YOK") || upper.includes("N/A")) return 5
    if (upper.includes("SIVI") || upper.includes("LIQUID") || upper.includes("WATER") || upper.includes("240") || upper.includes("280") || upper.includes("360")) return 25
    if (upper.includes("KULE") || upper.includes("TOWER") || upper.includes("BAKIR")) return 12
    return 7
}

function getPsuScore(psuStr?: string, caseStr?: string): number {
    const combined = ((psuStr || "") + " " + (caseStr || "")).toUpperCase()
    const match = combined.match(/\b(\d{3,4})\s*W\b/)
    if (match) {
        const watts = parseInt(match[1], 10)
        if (watts >= 1000) return 20
        if (watts >= 850) return 16
        if (watts >= 750) return 12
        if (watts >= 650) return 8
        if (watts >= 500) return 5
    }
    return 6
}

export function calculateFPScore(product: Product, allProducts: Product[]): number {
    if (!product.fiyat || product.fiyat <= 0) return 50

    // 1. Donanım Puanlarını Hesapla
    const gpuTier = getGpuTier(product.ekranKarti)
    const cpuTier = getCpuTier(product.islemci)
    
    const gpuScore = gpuScores[gpuTier] || 80
    const cpuScore = cpuScores[cpuTier] || 80
    const ramGb = getRamCapacity(product.ram)
    const ssdTb = getSsdCapacityTb(product.ssd || product.depolama)
    const moboScore = getMoboScore(product.anakart)
    const coolerScore = getCoolerScore(product.sogutucu)
    const psuScore = getPsuScore(product.psu, product.kasa)

    // 2. Toplam Sentetik Performans Skoru Formülü
    // Bütün donanımları hesaba katıyoruz.
    const totalPerformance = (gpuScore * 1.0) + (cpuScore * 0.35) + (ramGb * 1.5) + (ssdTb * 10) + moboScore + coolerScore + psuScore

    // 3. Ham F/P Oranı (Performans Puanı / Fiyat * 1000)
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
            const mS = getMoboScore(p.anakart)
            const cSg = getCoolerScore(p.sogutucu)
            const pS = getPsuScore(p.psu, p.kasa)
            
            const perf = (gS * 1.0) + (cS * 0.35) + (rGb * 1.5) + (sTb * 10) + mS + cSg + pS
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
