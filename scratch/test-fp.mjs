import fs from "fs"

const gpuScores = {
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

const cpuScores = {
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

export function getGpuTier(gpuStr) {
    if (!gpuStr) return "UNKNOWN"
    const upper = gpuStr.toUpperCase()
    for (const key of Object.keys(gpuScores).sort((a, b) => b.length - a.length)) {
        const regexStr = key.replace(/\s+/g, "\\s*")
        const regex = new RegExp(regexStr)
        if (regex.test(upper)) return key
    }
    const rtxMatch = upper.match(/RTX\s*(40[6-9]0|30[5-9]0|50[7-9]0)(?:\s*(TI|SUPER))?/)
    if (rtxMatch) return rtxMatch[0].replace(/\s+/g, " ")
    return "UNKNOWN"
}

export function getCpuTier(cpuStr) {
    if (!cpuStr) return "UNKNOWN"
    const upper = cpuStr.toUpperCase()
    for (const key of Object.keys(cpuScores).sort((a, b) => b.length - a.length)) {
        if (upper.includes(key)) return key
    }
    return "UNKNOWN"
}

function getRamCapacity(ramStr) {
    if (!ramStr) return 16
    const match = ramStr.toUpperCase().match(/(\d+)\s*GB/)
    if (match) return parseInt(match[1], 10)
    return 16
}

function getSsdCapacityTb(ssdStr) {
    if (!ssdStr) return 0.5
    const upper = ssdStr.toUpperCase()
    if (upper.includes("2TB") || upper.includes("2 TB")) return 2.0
    if (upper.includes("1TB") || upper.includes("1 TB")) return 1.0
    if (upper.includes("500GB") || upper.includes("512GB") || upper.includes("480GB")) return 0.5
    if (upper.includes("250GB") || upper.includes("256GB") || upper.includes("240GB")) return 0.25
    return 0.5
}

const rawData = JSON.parse(fs.readFileSync("c:/Users/samsu/Desktop/HAZIR SİSTEM/Hazir-Sistem-Karsilastirici/mock.json", "utf-8"))

let totalRawFp = 0
let validCount = 0

const normalized = rawData.map(raw => {
    return {
        fiyat: raw.price,
        stoktaVarMi: raw.store === "pckolik" ? true : raw.price > 0,
        ekranKarti: raw.specs?.GPU || "",
        islemci: raw.specs?.CPU || "",
        ram: raw.specs?.RAM || "",
        ssd: raw.specs?.SSD || raw.specs?.Storage || "",
        name: raw.name
    }
})

normalized.forEach(p => {
    if (p.fiyat > 0 && p.stoktaVarMi) {
        const gT = getGpuTier(p.ekranKarti)
        const cT = getCpuTier(p.islemci)
        const gS = gpuScores[gT] || 80
        const cS = cpuScores[cT] || 80
        const rGb = getRamCapacity(p.ram)
        const sTb = getSsdCapacityTb(p.ssd)
        const perf = (gS * 1.0) + (cS * 0.35) + (rGb * 1.5) + (sTb * 10)
        const rFp = (perf / p.fiyat) * 1000
        totalRawFp += rFp
        validCount++
    }
})

const averageRawFp = totalRawFp / validCount
console.log("Average Raw FP:", averageRawFp)

const allScores = normalized.filter(p => p.fiyat > 0 && p.stoktaVarMi).map(p => {
    const gT = getGpuTier(p.ekranKarti)
    const cT = getCpuTier(p.islemci)
    const gS = gpuScores[gT] || 80
    const cS = cpuScores[cT] || 80
    const rGb = getRamCapacity(p.ram)
    const sTb = getSsdCapacityTb(p.ssd)
    const perf = (gS * 1.0) + (cS * 0.35) + (rGb * 1.5) + (sTb * 10)
    const rawFp = (perf / p.fiyat) * 1000
    const scoreRatio = rawFp / averageRawFp
    const finalScore = Math.max(30, Math.min(99, Math.round(scoreRatio * 75)))
    return { name: p.name, gpu: gT, cpu: cT, price: p.fiyat, rawFp, ratio: scoreRatio, score: finalScore }
})

allScores.sort((a, b) => b.rawFp - a.rawFp)
console.table(allScores.slice(0, 30).map(s => ({ ...s, rawFp: s.rawFp.toFixed(2), ratio: s.ratio.toFixed(2) })))
