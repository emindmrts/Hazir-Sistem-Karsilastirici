import type { Product } from "@/hooks/use-products"

const GPU_SCORES: [RegExp, number][] = [
  [/\bRTX\s*5090/i, 100], [/\bRTX\s*5080/i, 92], [/\bRTX\s*5070\s*TI/i, 83], [/\bRTX\s*5070/i, 75],
  [/\bRTX\s*5060\s*TI/i, 67], [/\bRTX\s*5060/i, 60], [/\bRTX\s*5050/i, 50],
  [/\bRTX\s*4090/i, 90], [/\bRTX\s*4080\s*SUPER/i, 82], [/\bRTX\s*4080/i, 78],
  [/\bRTX\s*4070\s*TI\s*SUPER/i, 74], [/\bRTX\s*4070\s*TI/i, 71], [/\bRTX\s*4070\s*SUPER/i, 68],
  [/\bRTX\s*4070/i, 64], [/\bRTX\s*4060\s*TI/i, 57], [/\bRTX\s*4060/i, 50],
  [/\bRTX\s*3090/i, 62], [/\bRTX\s*3080/i, 57],
  [/\bRTX\s*3070\s*TI/i, 53], [/\bRTX\s*3070/i, 50],
  [/\bRTX\s*3060\s*TI/i, 44], [/\bRTX\s*3060/i, 38], [/\bRTX\s*3050/i, 28],
  [/\bGTX\s*1660\s*SUPER/i, 30], [/\bGTX\s*1660\b/i, 26], [/\bGTX\s*1650/i, 18],
  [/\bRTX\s*2080\s*TI/i, 48], [/\bRTX\s*2080\b/i, 45],
  [/\bRTX\s*2070\s*SUPER/i, 42], [/\bRTX\s*2070\b/i, 38],
  [/\bRTX\s*2060\s*SUPER/i, 36], [/\bRTX\s*2060\b/i, 32],
  [/\bRX\s*9070\s*XT/i, 80], [/\bRX\s*9070\b/i, 74],
  [/\bRX\s*9060\s*XT/i, 65], [/\bRX\s*9060\b/i, 58],
  [/\bRX\s*7900\s*XTX/i, 82], [/\bRX\s*7900\s*XT/i, 75], [/\bRX\s*7900\s*GRE/i, 68],
  [/\bRX\s*7800\s*XT/i, 65], [/\bRX\s*7700\s*XT/i, 58],
  [/\bRX\s*7600\s*XT/i, 50], [/\bRX\s*7600\b/i, 44],
  [/\bRX\s*6950\s*XT/i, 60], [/\bRX\s*6900\s*XT/i, 58], [/\bRX\s*6800\s*XT/i, 55], [/\bRX\s*6800\b/i, 50],
  [/\bRX\s*6750\s*XT/i, 50], [/\bRX\s*6700\s*XT/i, 47], [/\bRX\s*6700\b/i, 42],
  [/\bRX\s*6650\s*XT/i, 40], [/\bRX\s*6600\s*XT/i, 38], [/\bRX\s*6600\b/i, 35],
  [/\bRX\s*6500\s*XT/i, 22],
  [/\bARC\s*B580/i, 50], [/\bARC\s*B570/i, 45],
  [/\bARC\s*A770/i, 44], [/\bARC\s*A750/i, 40], [/\bARC\s*A580/i, 35], [/\bARC\s*A380/i, 25],
]

const CPU_SCORES: [RegExp, number][] = [
  [/\b9950X3D/i, 96], [/\b9900X3D/i, 92], [/\b9800X3D/i, 94],
  [/\b7950X3D/i, 90], [/\b7900X3D/i, 86], [/\b7800X3D/i, 88],
  [/\b9700X/i, 78], [/\b7900X/i, 77], [/\b7700X/i, 70],
  [/\b9600X/i, 68],
  [/\b7600X/i, 65], [/\b7600\b/i, 60], [/\b7500F/i, 58],
  [/\b285K/i, 89], [/\b270K/i, 84], [/\b265K/i, 80],
  [/\b265\b/i, 80],
  [/\b250K/i, 70], [/\b250\b/i, 70],
  [/\b245K/i, 67], [/\b245\b/i, 67],
  [/\b225\b/i, 55],
  [/\b14900K/i, 92], [/\b14900\b/i, 91],
  [/\b14700K/i, 82], [/\b14700\b/i, 81],
  [/\b14600K/i, 75], [/\b14600\b/i, 74],
  [/\b14500\b/i, 65],
  [/\b14400\b/i, 58],
  [/\b14300\b/i, 55],
  [/\b13900K/i, 85], [/\b13900\b/i, 84],
  [/\b13700K/i, 78], [/\b13700\b/i, 77],
  [/\b13600K/i, 70], [/\b13600\b/i, 69],
  [/\b13500\b/i, 62],
  [/\b13400\b/i, 55],
  [/\b13100\b/i, 42],
  [/\b12900K/i, 72], [/\b12900\b/i, 71],
  [/\b12700K/i, 65], [/\b12700\b/i, 64],
  [/\b12600K/i, 58], [/\b12600\b/i, 57],
  [/\b12400\b/i, 42],
  [/\b12100\b/i, 35],
  [/\b5700X3D/i, 48], [/\b5700X/i, 42], [/\b5700G/i, 38],
  [/\b5600X/i, 45], [/\b5600\b/i, 40],
  [/\b5500\b/i, 33],
  [/\b4500\b/i, 25],
]

const KNOWN_PSU_BRANDS = [
  /SEASONIC/i, /CORSAIR/i, /EVGA/i, /BE\s*QUIET/i, /FRACTAL/i,
  /MSI/i, /ASUS\s*ROG/i, /GIGABYTE/i, /THERMALTAKE/i, /COOLER\s*MASTER/i,
  /NZXT/i, /SUPER\s*FLOWER/i, /FSP/i, /CHIEFTEC/i, /XPG/i,
]

const GPU_MIN_PSU: [RegExp, number][] = [
  [/\bRTX\s*5090/i, 1000], [/\bRTX\s*5080/i, 850], [/\bRTX\s*5070\s*TI/i, 750], [/\bRTX\s*5070/i, 650],
  [/\bRTX\s*5060\s*TI/i, 550], [/\bRTX\s*5060/i, 500], [/\bRTX\s*5050/i, 450],
  [/\bRTX\s*4090/i, 850], [/\bRTX\s*4080\s*SUPER/i, 750], [/\bRTX\s*4080/i, 750],
  [/\bRTX\s*4070\s*TI\s*SUPER/i, 700], [/\bRTX\s*4070\s*TI/i, 700], [/\bRTX\s*4070\s*SUPER/i, 650],
  [/\bRTX\s*4070/i, 650], [/\bRTX\s*4060\s*TI/i, 550], [/\bRTX\s*4060/i, 500],
  [/\bRTX\s*3090/i, 750], [/\bRTX\s*3080/i, 750], [/\bRTX\s*3070\s*TI/i, 650], [/\bRTX\s*3070/i, 650],
  [/\bRTX\s*3060\s*TI/i, 600], [/\bRTX\s*3060/i, 550],
  [/\bRX\s*9070\s*XT/i, 750], [/\bRX\s*9070\b/i, 700],
  [/\bRX\s*7900\s*XTX/i, 850], [/\bRX\s*7900\s*XT/i, 750], [/\bRX\s*7900\s*GRE/i, 700],
  [/\bRX\s*7800\s*XT/i, 700], [/\bRX\s*7700\s*XT/i, 650],
  [/\bRX\s*7600\s*XT/i, 600], [/\bRX\s*7600\b/i, 550],
  [/\bRX\s*6800\s*XT/i, 650], [/\bRX\s*6700\s*XT/i, 600],
  [/\bARC\s*B580/i, 600], [/\bARC\s*A770/i, 650], [/\bARC\s*A750/i, 600],
]

const CPU_TDP_ESTIMATE: [RegExp, number][] = [
  [/\b9950X3D/i, 170], [/\b9900X3D/i, 120], [/\b9800X3D/i, 120],
  [/\b7950X3D/i, 120], [/\b7900X3D/i, 120], [/\b7800X3D/i, 120],
  [/\b9700X/i, 65], [/\b7900X/i, 65], [/\b7700X/i, 65], [/\b9600X/i, 65],
  [/\b7600X/i, 65], [/\b7600\b/i, 65], [/\b7500F/i, 65],
  [/\b285K/i, 250], [/\b270K/i, 250], [/\b265K/i, 250], [/\b250K/i, 125], [/\b245K/i, 125], [/\b225\b/i, 65],
  [/\b14900K/i, 250], [/\b14900\b/i, 220], [/\b14700K/i, 220], [/\b14700\b/i, 180],
  [/\b14600K/i, 180], [/\b14600\b/i, 150], [/\b14500\b/i, 150], [/\b14400\b/i, 65], [/\b14300\b/i, 65],
  [/\b13900K/i, 250], [/\b13900\b/i, 220], [/\b13700K/i, 220], [/\b13700\b/i, 180],
  [/\b13600K/i, 180], [/\b13600\b/i, 150], [/\b13500\b/i, 150], [/\b13400\b/i, 65], [/\b13100\b/i, 65],
  [/\b12900K/i, 240], [/\b12900\b/i, 200], [/\b12700K/i, 190], [/\b12700\b/i, 150],
  [/\b12600K/i, 150], [/\b12600\b/i, 110], [/\b12400\b/i, 65], [/\b12100\b/i, 60],
  [/\b5700X3D/i, 105], [/\b5700X/i, 65], [/\b5700G/i, 65],
  [/\b5600X/i, 65], [/\b5600\b/i, 65], [/\b5500\b/i, 65], [/\b4500\b/i, 65],
]

const GPU_TDP_ESTIMATE: [RegExp, number][] = [
  [/\bRTX\s*5090/i, 575], [/\bRTX\s*5080/i, 360], [/\bRTX\s*5070\s*TI/i, 300], [/\bRTX\s*5070/i, 250],
  [/\bRTX\s*5060\s*TI/i, 150], [/\bRTX\s*5060/i, 130], [/\bRTX\s*5050/i, 100],
  [/\bRTX\s*4090/i, 450], [/\bRTX\s*4080\s*SUPER/i, 320], [/\bRTX\s*4080/i, 320],
  [/\bRTX\s*4070\s*TI\s*SUPER/i, 285], [/\bRTX\s*4070\s*TI/i, 285], [/\bRTX\s*4070\s*SUPER/i, 220],
  [/\bRTX\s*4070/i, 200], [/\bRTX\s*4060\s*TI/i, 160], [/\bRTX\s*4060/i, 115],
  [/\bRTX\s*3090/i, 350], [/\bRTX\s*3080/i, 320], [/\bRTX\s*3070\s*TI/i, 290], [/\bRTX\s*3070/i, 220],
  [/\bRTX\s*3060\s*TI/i, 200], [/\bRTX\s*3060/i, 170],
  [/\bGTX\s*1660\s*SUPER/i, 125], [/\bGTX\s*1660\b/i, 120], [/\bGTX\s*1650/i, 75],
  [/\bRTX\s*2080\s*TI/i, 260], [/\bRTX\s*2080\b/i, 225], [/\bRTX\s*2070\s*SUPER/i, 215], [/\bRTX\s*2070\b/i, 185],
  [/\bRTX\s*2060\s*SUPER/i, 175], [/\bRTX\s*2060\b/i, 160],
  [/\bRX\s*9070\s*XT/i, 340], [/\bRX\s*9070\b/i, 280],
  [/\bRX\s*7900\s*XTX/i, 355], [/\bRX\s*7900\s*XT/i, 300], [/\bRX\s*7900\s*GRE/i, 260],
  [/\bRX\s*7800\s*XT/i, 260], [/\bRX\s*7700\s*XT/i, 200],
  [/\bRX\s*7600\s*XT/i, 190], [/\bRX\s*7600\b/i, 165],
  [/\bRX\s*6950\s*XT/i, 335], [/\bRX\s*6900\s*XT/i, 300], [/\bRX\s*6800\s*XT/i, 300], [/\bRX\s*6800\b/i, 250],
  [/\bRX\s*6750\s*XT/i, 250], [/\bRX\s*6700\s*XT/i, 230], [/\bRX\s*6700\b/i, 175],
  [/\bRX\s*6650\s*XT/i, 175], [/\bRX\s*6600\s*XT/i, 160], [/\bRX\s*6600\b/i, 132],
  [/\bARC\s*B580/i, 190], [/\bARC\s*A770/i, 225], [/\bARC\s*A750/i, 225],
]

const KNOWN_CASE_BRANDS = [/CORSAIR/i, /NZXT/i, /LIAN\s*LI/i, /FRACTAL/i, /COOLER\s*MASTER/i, /THERMALTAKE/i, /PHANTEKS/i, /BE\s*QUIET/i, /ASUS/i, /MSI/i]

// ─────────────────────────────────────────────
// Detection functions
// ─────────────────────────────────────────────

function detectGpuScore(gpuStr?: string): { score: number; gen: number } {
  if (!gpuStr) return { score: 10, gen: 0 }
  for (const [re, score] of GPU_SCORES) {
    if (re.test(gpuStr)) {
      const gen = /RTX\s*5090|RTX\s*5080|RTX\s*5070|RTX\s*5060|RTX\s*5050|RX\s*9070|RX\s*9060|ARC\s*B/i.test(gpuStr) ? 5
        : /RTX\s*4090|RTX\s*4080|RTX\s*4070|RTX\s*4060|RTX\s*4050|RX\s*7900|RX\s*7800|RX\s*7700|RX\s*7600|ARC\s*A/i.test(gpuStr) ? 4
        : /RTX\s*3090|RTX\s*3080|RTX\s*3070|RTX\s*3060|RTX\s*3050|RX\s*6900|RX\s*6800|RX\s*6700|RX\s*6600|RX\s*6500/i.test(gpuStr) ? 3
        : /RTX\s*2080|RTX\s*2070|RTX\s*2060/i.test(gpuStr) ? 2
        : 1
      return { score, gen }
    }
  }
  return { score: 15, gen: 0 }
}

function detectCpuScore(cpuStr?: string): { score: number; gen: number } {
  if (!cpuStr) return { score: 10, gen: 0 }
  for (const [re, score] of CPU_SCORES) {
    if (re.test(cpuStr)) {
      const gen = /9950X3D|9900X3D|9800X3D|9700X|9600X/i.test(cpuStr) ? 3
        : /7950X3D|7900X3D|7800X3D|7700X|7600X|7600|7500F|285K|270K|265K|250K|245K|225/i.test(cpuStr) ? 3
        : /14900K|14900|14700K|14700|14600K|14600|14500|14400|14300/i.test(cpuStr) ? 2
        : /13900K|13900|13700K|13700|13600K|13600|13500|13400|13100/i.test(cpuStr) ? 2
        : 1
      return { score, gen }
    }
  }
  return { score: 15, gen: 0 }
}

function detectRamLatency(upper: string): number {
  const m = upper.match(/\bCL\s*(\d{1,2})\b/i)
  if (!m) return 0
  const cl = parseInt(m[1])
  if (cl <= 28) return 4
  if (cl <= 30) return 3
  if (cl <= 32) return 2
  if (cl <= 36) return 1
  return 0
}

function detectRamSpeed(upper: string): number {
  const m = upper.match(/\b(\d{4,5})\s*MHz\b/)
  if (!m) return 0
  const speed = parseInt(m[1])
  if (speed >= 6000) return 6
  if (speed >= 5600) return 5
  if (speed >= 5200) return 4
  if (speed >= 4800) return 3
  if (speed >= 3600) return 3
  if (speed >= 3200) return 2
  return 1
}

function detectRamScore(ramStr?: string): number {
  if (!ramStr) return 10
  const upper = ramStr.toUpperCase()
  const m = upper.match(/\b(\d{1,3})\s*GB\b/)
  const gb = m ? parseInt(m[1]) : 16
  const ddr5 = /DDR5|DDR\s*5/i.test(upper)
  const genBonus = ddr5 ? 6 : 2
  const speedBonus = detectRamSpeed(upper)
  const latencyBonus = detectRamLatency(upper)
  const dual = /2\s*[xX*]|Ç[İI]FT|DUAL|2X/i.test(upper) ? 4 : 0
  const base = gb >= 32 ? 30 : gb >= 16 ? 20 : gb >= 8 ? 10 : 5
  return base + genBonus + speedBonus + latencyBonus + dual
}

function detectStorageScore(ssdStr?: string, depolama?: string): number {
  const s = (ssdStr || depolama || "").toUpperCase()
  const isNvme = /NVME/i.test(s)
  const isM2 = /M\.2/i.test(s)
  const isSata = /SATA/i.test(s)
  const isHdd = /HDD|HARD\s*DISK|7200/i.test(s)
  const hasSsd = /SSD|NVME|M\.2/i.test(s)
  const isGen4 = /GEN\s*4|PCIe\s*4/i.test(s)
  const isGen5 = /GEN\s*5|PCIe\s*5/i.test(s)
  const typeBonus = isGen5 ? 8 : isGen4 ? 6 : isNvme || isM2 ? 5 : isSata ? 2 : isHdd && !hasSsd ? -6 : 0
  const hasBoth = hasSsd && isHdd

  const sizeScore = /4\s*TB/i.test(s) ? 28 : /2\s*TB/i.test(s) ? 22 : /1\s*TB/i.test(s) ? 16
    : /512\s*GB|500\s*GB/i.test(s) ? 12 : /256\s*GB|250\s*GB/i.test(s) ? 7 : 8
  const hddOnlyPenalty = isHdd && !hasSsd ? -10 : 0
  const dualDriveBonus = hasBoth ? 5 : 0
  return sizeScore + typeBonus + hddOnlyPenalty + dualDriveBonus
}

function detectCoolerScore(sogutucu?: string): number {
  if (!sogutucu) return 3
  const u = sogutucu.toUpperCase()
  const knownBrand = /DEEPCOOL|NOCTUA|COOLER\s*MASTER|CORSAIR|NZXT|ARCTIC|BE\s*QUIET|THERMALTAKE|MSI|ASUS|LIAN\s*LI/i.test(u)
  const brandBonus = knownBrand ? 2 : 0

  const hasAio = /SIVI|LIQUID|AIO/i.test(u)
  const rad360 = /360|420/i.test(u)
  const rad280 = /280/i.test(u)
  const rad240 = /240/i.test(u)
  if (hasAio && rad360) return 13 + brandBonus
  if (hasAio && rad280) return 11 + brandBonus
  if (hasAio && rad240) return 10 + brandBonus
  if (hasAio) return 9 + brandBonus
  if (/HAVA|AIR|KULE|TOWER/i.test(u)) return 6 + brandBonus
  if (knownBrand) return 5
  return 4
}

function detectPsuScore(psuStr?: string): number {
  if (!psuStr) return 5
  const upper = psuStr.toUpperCase()
  const m = upper.match(/\b(\d{3,4})\s*W\b/)
  const w = m ? parseInt(m[1]) : 0
  const isKnownBrand = KNOWN_PSU_BRANDS.some(re => re.test(upper))
  const brandBonus = isKnownBrand ? 4 : -2
  const has80Plus = /80\s*\+/i.test(upper)
  const isGold = /GOLD/i.test(upper)
  const isPlatinum = /PLATINUM/i.test(upper)
  const isTitanium = /TITANIUM/i.test(upper)
  const isModular = /MOD[ÜU]LER|FULL\s*MOD/i.test(upper)
  const effBonus = isTitanium ? 6 : isPlatinum ? 4 : isGold ? 2 : has80Plus ? 1 : 0
  const modularBonus = isModular ? 2 : 0
  if (w >= 1000) return 18 + brandBonus + effBonus + modularBonus
  if (w >= 850) return 14 + brandBonus + effBonus + modularBonus
  if (w >= 750) return 10 + brandBonus + effBonus + modularBonus
  if (w >= 650) return 7 + brandBonus + effBonus + modularBonus
  if (w >= 550) return 5 + brandBonus + effBonus + modularBonus
  return 3 + (isKnownBrand ? 1 : 0) + effBonus + modularBonus
}

function detectPsuHeadroom(psuStr?: string, gpuStr?: string, cpuStr?: string): number {
  if (!psuStr) return 0
  const psuM = psuStr.toUpperCase().match(/\b(\d{3,4})\s*W\b/)
  const psuW = psuM ? parseInt(psuM[1]) : 0
  if (psuW === 0) return 0

  let gpuTdp = 150
  for (const [re, tdp] of GPU_TDP_ESTIMATE) {
    if (gpuStr && re.test(gpuStr)) { gpuTdp = tdp; break }
  }
  let cpuTdp = 100
  for (const [re, tdp] of CPU_TDP_ESTIMATE) {
    if (cpuStr && re.test(cpuStr)) { cpuTdp = tdp; break }
  }
  const estimatedLoad = gpuTdp + cpuTdp + 80
  const headroom = psuW - estimatedLoad

  if (headroom < 0) return -15
  if (headroom < 50) return -5
  if (headroom > 400) return 2
  if (headroom > 200) return 1
  return 0
}

function detectPsuInsufficiency(psuStr?: string, gpuStr?: string): number {
  if (!psuStr || !gpuStr) return 0
  const psuM = psuStr.toUpperCase().match(/\b(\d{3,4})\s*W\b/)
  const psuW = psuM ? parseInt(psuM[1]) : 0
  if (psuW === 0) return 0
  for (const [re, minW] of GPU_MIN_PSU) {
    if (re.test(gpuStr) && psuW < minW) return -20
  }
  return 0
}

function detectMoboScore(moboStr?: string): number {
  if (!moboStr) return 5
  const u = moboStr.toUpperCase()
  const hasPcie5 = /Z890|X870E?|X670E?|B850|B860/.test(u)
  const pcieBonus = hasPcie5 ? 3 : 0
  const hasWifi = /WIFI|WI-FI|BT|BLUETOOTH|\bAC\b|\bAX\b|\bBE\b/i.test(u)
  const wifiBonus = hasWifi ? 2 : 0
  const canOverclock = /Z890|Z790|Z690|X870|X670|B650|B860|B850|X570/.test(u)
  const ocBonus = canOverclock ? 2 : 0
  if (/Z890|X870|X670|Z790/.test(u)) return 15 + pcieBonus + wifiBonus + ocBonus
  if (/B650|B760|B860|B850|X570/.test(u)) return 10 + pcieBonus + wifiBonus + ocBonus
  if (/H610|A620|H810/.test(u)) return 6 + pcieBonus + wifiBonus
  return 7 + pcieBonus + wifiBonus
}

function detectCaseScore(kasa?: string): number {
  if (!kasa) return 3
  const u = kasa.toUpperCase()
  const knownBrand = KNOWN_CASE_BRANDS.some(re => re.test(u))
  const hasMesh = /MESH|AKI[ŞS]/i.test(u)
  const hasGlass = /CAM|GLASS|TEMPER/i.test(u)
  const hasFan = /FAN|VENT[İI]LAT[ÖO]R/i.test(u)
  const isMini = /MINI|ITX/i.test(u)
  let score = knownBrand ? 6 : 4
  if (hasMesh) score += 2
  if (hasGlass) score += 1
  if (hasFan) score += 1
  if (isMini) score += 2
  return score
}

function detectBottleneck(gpu: number, cpu: number): number {
  if (gpu <= 0 || cpu <= 0) return 0
  const ratio = Math.max(gpu, cpu) / Math.min(gpu, cpu)
  if (ratio > 2.5) return -10
  if (ratio > 2.0) return -5
  if (ratio > 1.5) return -2
  return 0
}

function specCompleteness(product: Product): number {
  let count = 0
  if (product.islemci) count++
  if (product.ekranKarti) count++
  if (product.ram) count++
  if (product.ssd || product.depolama) count++
  if (product.anakart) count++
  if (product.kasa) count++
  if (product.psu) count++
  if (product.sogutucu) count++
  return count
}

const EXTRAS_KEYWORDS = [
  /MONIT[ÖO]R/i, /KLAVYE/i, /KEYBOARD/i, /MOUSE/i, /FARE/i,
  /KULAKL[Iİ]K/i, /HEADSET/i, /HOPARL[ÖO]R/i, /SPEAKER/i,
  /WINDOWS\s*(11|10)\s*(PRO|HOME)?/i, /L[İI]SANS/i,
  /MICROSOFT\s*365/i, /OF[FİI]S/i,
]

function detectExtrasPenalty(name?: string): number {
  if (!name) return 0
  let count = 0
  for (const re of EXTRAS_KEYWORDS) {
    if (re.test(name)) count++
  }
  return count * 3
}

// ─────────────────────────────────────────────
// Main sort function
// ─────────────────────────────────────────────

export function smartSort(products: Product[]): Product[] {
  if (products.length === 0) return products

  const len = products.length

  // ── 1. Raw component scores ──
  const gpuRaw = products.map(p => detectGpuScore(p.ekranKarti))
  const cpuRaw = products.map(p => detectCpuScore(p.islemci))
  const cpuScoreRaw = cpuRaw.map(c => c.score)
  const cpuGenRaw = cpuRaw.map(c => c.gen)
  const ramRaw = products.map(p => detectRamScore(p.ram))
  const storageRaw = products.map(p => detectStorageScore(p.ssd, p.depolama))
  const psuRaw = products.map(p => detectPsuScore(p.psu))
  const moboRaw = products.map(p => detectMoboScore(p.anakart))
  const coolerRaw = products.map(p => detectCoolerScore(p.sogutucu))
  const kasaRaw = products.map(p => detectCaseScore(p.kasa))
  const compRaw = products.map(p => specCompleteness(p))
  const extraRaw = products.map(p => detectExtrasPenalty(p.sistemAdi))

  const gpuScoreRaw = gpuRaw.map(g => g.score)
  const gpuGenRaw = gpuRaw.map(g => g.gen)
  const maxGpu = Math.max(...gpuScoreRaw, 1)
  const maxCpu = Math.max(...cpuScoreRaw, 1)

  // ── 2. Price-to-performance value ──
  const rawValues = Array.from({ length: len }, (_, i) => {
    const total = (gpuScoreRaw[i] * 1.2) + (cpuScoreRaw[i] * 0.45) + ramRaw[i] + storageRaw[i] + psuRaw[i] + moboRaw[i] + coolerRaw[i] + kasaRaw[i] + (compRaw[i] * 1.5) - extraRaw[i]
    return total / Math.max(products[i].fiyat, 1)
  })
  const maxRawValue = Math.max(...rawValues, 0.001)

  // ── 3. Price-bracket relative value ──
  const brackets = [0, 20000, 40000, 60000, Infinity]
  const bracketRaw: number[][] = Array.from({ length: brackets.length - 1 }, () => [])
  for (let i = 0; i < len; i++) {
    const price = products[i].fiyat
    let bi = 0
    for (let b = 1; b < brackets.length; b++) {
      if (price < brackets[b]) { bi = b - 1; break }
    }
    bracketRaw[bi].push(rawValues[i])
  }
  const bracketMaxes = bracketRaw.map(arr => arr.length ? Math.max(...arr) : 1)

  // ── 4. Value cliff detection ──
  // Sort by price and check: if price is high but specs are similar to much cheaper products, penalize
  const sortedByPrice = Array.from({ length: len }, (_, i) => ({
    idx: i,
    price: products[i].fiyat,
    specScore: (gpuScoreRaw[i] * 1.2) + (cpuScoreRaw[i] * 0.45) + ramRaw[i] + storageRaw[i],
  })).sort((a, b) => a.price - b.price)

  const cliffPenalties = new Array(len).fill(0)
  for (let i = 1; i < sortedByPrice.length; i++) {
    const cur = sortedByPrice[i]
    const prev = sortedByPrice[i - 1]
    const priceDelta = cur.price - prev.price
    const specDelta = cur.specScore - prev.specScore
    // If price jumps >30% but specs improve <5%, it's a value cliff
    if (prev.price > 0 && priceDelta / prev.price > 0.30 && specDelta / Math.max(prev.specScore, 1) < 0.05) {
      cliffPenalties[cur.idx] = -8
    }
  }

  // ── 5. Compute final score ──
  const entries = Array.from({ length: len }, (_, i) => {
    const p = products[i]
    const gpu = gpuScoreRaw[i]
    const gpuGen = gpuGenRaw[i]
    const cpu = cpuScoreRaw[i]
    const cpuGen = cpuGenRaw[i]

    const valueRaw = rawValues[i]
    const valueScore = (valueRaw / maxRawValue) * 100

    let bi = 0
    for (let b = 1; b < brackets.length; b++) {
      if (p.fiyat < brackets[b]) { bi = b - 1; break }
    }
    const bracketRel = bracketMaxes[bi] > 0 ? (valueRaw / bracketMaxes[bi]) * 20 : 0

    const cpuGenBonus = cpuGen * 1.2
    const gpuGenBonus = gpuGen * 1.5
    const perfScore = ((gpu / maxGpu) * 68) + ((cpu / maxCpu) * 32) + gpuGenBonus + cpuGenBonus

    const psuWarn = detectPsuInsufficiency(p.psu, p.ekranKarti)
    const psuHeadroom = detectPsuHeadroom(p.psu, p.ekranKarti, p.islemci)

    const stockScore = p.stoktaVarMi ? 12 : -2

    const balance = gpu > 0 && cpu > 0
      ? (Math.min(gpu, cpu) / Math.max(gpu, cpu)) * 8
      : 0

    const bottleneck = detectBottleneck(gpu, cpu)

    const name = p.sistemAdi || ""
    const nameMentionsGpu = p.ekranKarti ? name.toLowerCase().includes(p.ekranKarti.toLowerCase().slice(0, 15)) : false
    const nameTransparency = nameMentionsGpu ? 4 : (name.length > 20 ? 1 : 0)

    const dgpuBoost = gpu >= 30 ? 3 : 0

    const isAmdCpu = /AMD/i.test(p.islemci || "")
    const isAmdGpu = /\bRX\b/i.test(p.ekranKarti || "")
    const isIntelCpu = /Intel/i.test(p.islemci || "")
    const isArcGpu = /\bARC\b/i.test(p.ekranKarti || "")
    const synergyBoost = (isAmdCpu && isAmdGpu) || (isIntelCpu && isArcGpu) ? 3 : 0

    const knownCpu = cpu >= 30 ? 1 : 0
    const knownGpu = gpu >= 30 ? 1 : 0
    const knownRam = /GB/i.test(p.ram || "") ? 1 : 0
    const knownPsu = /\d{3,4}\s*W/i.test(p.psu || "") ? 1 : 0
    const specConfidence = (knownCpu + knownGpu + knownRam + knownPsu) * 1.5

    const cliffPenalty = cliffPenalties[i]

    const score = (valueScore * 0.35) + bracketRel + (perfScore * 0.35) + stockScore
      + balance + bottleneck + psuWarn + psuHeadroom + nameTransparency + dgpuBoost
      + synergyBoost + specConfidence + cliffPenalty

    return { product: p, score }
  })

  entries.sort((a, b) => {
    const diff = b.score - a.score
    if (Math.abs(diff) < 0.001) return a.product.fiyat - b.product.fiyat
    return diff
  })

  return entries.map(e => e.product)
}
