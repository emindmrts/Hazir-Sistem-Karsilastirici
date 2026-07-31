import type { Product } from "@/hooks/use-products"

// ─── GPU Scores (0–100 scale, OYUN PERFORMANSI bazlı) ──────────
const GPU_SCORE: [RegExp, number][] = [
  [/RTX\s*5090/i, 240], [/RTX\s*5080/i, 195], [/RTX\s*5070\s*TI/i, 160],
  [/RTX\s*5070/i, 135], [/RTX\s*5060\s*TI/i, 100], [/RTX\s*5060/i, 78],
  [/RTX\s*5050/i, 55],
  [/RX\s*9070\s*XT/i, 140], [/RX\s*9070/i, 122],
  [/RX\s*9060\s*XT/i, 88], [/RX\s*9060/i, 70],
  [/RTX\s*4090\s*D/i, 180], [/RTX\s*4090/i, 185],
  [/RTX\s*4080\s*SUPER/i, 150], [/RTX\s*4080/i, 138],
  [/RTX\s*4070\s*TI\s*SUPER/i, 125], [/RTX\s*4070\s*TI/i, 112],
  [/RTX\s*4070\s*SUPER/i, 105], [/RTX\s*4070/i, 92],
  [/RTX\s*4060\s*TI/i, 70], [/RTX\s*4060/i, 50],
  [/RTX\s*3090\s*TI/i, 155], [/RTX\s*3090/i, 140],
  [/RTX\s*3080\s*TI/i, 135], [/RTX\s*3080/i, 122],
  [/RTX\s*3070\s*TI/i, 105], [/RTX\s*3070/i, 92],
  [/RTX\s*3060\s*TI/i, 60], [/RTX\s*3060/i, 40],
  [/RTX\s*3050\s*6GB/i, 21], [/RTX\s*3050/i, 25],
  [/RX\s*7900\s*XTX/i, 170], [/RX\s*7900\s*XT/i, 132],
  [/RX\s*7900\s*GRE/i, 108],
  [/RX\s*7800\s*XT/i, 98], [/RX\s*7700\s*XT/i, 80],
  [/RX\s*7600\s*XT/i, 50], [/RX\s*7600\b/i, 42],
  [/RX\s*6950\s*XT/i, 105], [/RX\s*6900\s*XT/i, 140],
  [/RX\s*6800\s*XT/i, 85], [/RX\s*6800\b/i, 75],
  [/RX\s*6750\s*XT/i, 68], [/RX\s*6700\s*XT/i, 65],
  [/RX\s*6650\s*XT/i, 52], [/RX\s*6600\s*XT/i, 40],
  [/RX\s*6600\b/i, 32], [/RX\s*6500\s*XT/i, 20],
  [/RX\s*6400\b/i, 15],
  [/ARC\s*B580/i, 50], [/ARC\s*B570/i, 42],
  [/ARC\s*A770/i, 35], [/ARC\s*A750/i, 30],
  [/ARC\s*A580/i, 22], [/ARC\s*A380/i, 12],
  [/GTX\s*1660\s*SUPER/i, 22], [/GTX\s*1660\s*TI/i, 21],
  [/GTX\s*1660\b/i, 20],
  [/GTX\s*1650\s*SUPER/i, 18], [/GTX\s*1650\b/i, 14],
  [/GTX\s*1630\b/i, 9],
]

// ─── CPU Scores (0–100 scale, OYUN PERFORMANSI bazlı) ─────────
const CPU_SCORE: [RegExp, number][] = [
  [/9950X3D/i, 110], [/9900X3D/i, 104], [/9800X3D/i, 110],
  [/9950X\b/i, 102], [/9900X\b/i, 98],
  [/9700X\b/i, 78], [/9600X\b/i, 60],
  [/7950X3D/i, 102], [/7950X\b/i, 98],
  [/7900X3D/i, 94], [/7900X\b/i, 75],
  [/7800X3D/i, 96],
  [/7700X\b/i, 65], [/7700\b/i, 60],
  [/7600X\b/i, 58], [/7600\b/i, 56], [/7500F/i, 50],
  [/285K\b/i, 98], [/275K\b/i, 86],
  [/265KF/i, 80], [/265K\b/i, 80],
  [/250K\b/i, 65], [/250\b/i, 65],
  [/245K\b/i, 60], [/245\b/i, 60],
  [/225\b/i, 48],
  [/14900KS/i, 110], [/14900K\b/i, 106], [/14900KF/i, 106], [/14900\b/i, 102],
  [/14700K\b/i, 86], [/14700KF/i, 86], [/14700\b/i, 82],
  [/14600K\b/i, 72], [/14600KF/i, 72], [/14600\b/i, 68],
  [/14500\b/i, 58],
  [/14400F\b/i, 50], [/14400\b/i, 48],
  [/14300\b/i, 44], [/14100F/i, 28], [/14100\b/i, 26],
  [/13900KS/i, 108], [/13900K\b/i, 104], [/13900KF/i, 104], [/13900\b/i, 100],
  [/13700K\b/i, 80], [/13700KF/i, 80], [/13700\b/i, 76],
  [/13600K\b/i, 68], [/13600KF/i, 68], [/13600\b/i, 64],
  [/13500\b/i, 60],
  [/13400F\b/i, 46], [/13400\b/i, 44],
  [/13100\b/i, 26],
  [/12900KS/i, 88], [/12900K\b/i, 84], [/12900KF/i, 84], [/12900\b/i, 80],
  [/12700K\b/i, 68], [/12700KF/i, 68], [/12700\b/i, 64],
  [/12600K\b/i, 58], [/12600KF/i, 58], [/12600\b/i, 54],
  [/12400F\b/i, 36], [/12400\b/i, 34],
  [/12100\b/i, 22],
  [/5950X\b/i, 86], [/5900X\b/i, 76],
  [/5800X3D/i, 78], [/5800X\b/i, 65],
  [/5700X3D/i, 64], [/5700X\b/i, 58], [/5700G\b/i, 54],
  [/5600X\b/i, 36], [/5600G\b/i, 28], [/5600\b/i, 32],
  [/5500\b/i, 24], [/4500\b/i, 16],
]

function matchScore(str: string, table: [RegExp, number][]): number {
  const upper = str.toUpperCase()
  for (const [re, score] of table) {
    if (re.test(upper)) return score
  }
  return 0
}

function getGpuScore(gpuStr: string): number {
  const base = matchScore(gpuStr, GPU_SCORE)
  // Ti / SUPER / XT modifiye bonusu
  let bonus = 0
  const u = gpuStr.toUpperCase()
  if (/\bTI\b/.test(u)) bonus += 3
  if (/SUPER/.test(u)) bonus += 2
  if (/\bXTX\b/.test(u)) bonus += 5
  if (/\bXT\b/.test(u)) bonus += 3
  return base + bonus
}

function getCpuScore(cpuStr: string): number {
  const base = matchScore(cpuStr, CPU_SCORE)
  // X3D bonusu
  let bonus = 0
  const u = cpuStr.toUpperCase()
  if (/X3D/.test(u)) bonus += 4
  return base + bonus
}

// ─── Pipeline model: performans = GPU || CPU (bottleneck-aware) ─
function estimateGamingPerf(product: Product): number {
  const gpuStr = product.ekranKarti || ""
  const cpuStr = product.islemci || ""

  const gpuScore = getGpuScore(gpuStr)
  const cpuScore = getCpuScore(cpuStr)

  if (gpuScore <= 0 && cpuScore <= 0) return 1

  // Harmonic pipeline: aynı anda hem GPU-bound hem CPU-bound olamazsın
  // Gerçek performans ~ 1 / (1/gpu + 1/cpu)
  const effectiveGpu = Math.max(gpuScore, 1)
  const effectiveCpu = Math.max(cpuScore, 1)
  let pipelinePerf = 1 / (1 / effectiveGpu + 1 / effectiveCpu)

  // RAM bonus: 32GB+ DDR5 → hafif çarpan
  const ramStr = product.ram || ""
  if (ramStr) {
    const cap = ramStr.match(/\b(\d{1,3})\s*GB\b/)
    const gb = cap ? parseInt(cap[1], 10) : 16
    const ddr5 = /DDR5|DDR\s*5/i.test(ramStr)
    const dual = /2\s*x\s*\d|ÇİFT\s*KANAL|DUAL/i.test(ramStr)
    let ramFactor = 1.0
    if (gb >= 32 && ddr5) ramFactor = 1.05
    else if (gb >= 16 && ddr5) ramFactor = 1.03
    else if (gb >= 32) ramFactor = 1.03
    if (dual) ramFactor += 0.02
    pipelinePerf *= ramFactor
  }

  // SSD bonus: NVMe → hafif çarpan
  const ssdStr = product.ssd || product.depolama || ""
  if (ssdStr) {
    if (!/SATA\b/i.test(ssdStr)) pipelinePerf *= 1.02
    if (/GEN\s*5|PCIE\s*5/i.test(ssdStr)) pipelinePerf *= 1.02
  }

  return pipelinePerf
}

// ─── F/P Puanı: Fiyat diliminde yüzdelik dilim ────────────────
export function calculateFPScore(product: Product, allProducts: Product[]): number {
  if (!product.fiyat || product.fiyat <= 0) return 50

  const perf = estimateGamingPerf(product)
  const value = perf / product.fiyat

  // Fiyat dilimindeki diğer sistemlerle karşılaştır
  const price = product.fiyat
  const bracketMin = price * 0.6
  const bracketMax = price * 1.6

  const bracketValues: number[] = []
  for (const p of allProducts) {
    if (!p.stoktaVarMi || p.fiyat <= 0) continue
    if (p.fiyat < bracketMin || p.fiyat > bracketMax) continue
    const pPerf = estimateGamingPerf(p)
    bracketValues.push(pPerf / p.fiyat)
  }

  // Yeterli veri yoksa tüm ürünlere bak
  const pool = bracketValues.length >= 5 ? bracketValues : []
  if (pool.length < 5) {
    for (const p of allProducts) {
      if (!p.stoktaVarMi || p.fiyat <= 0) continue
      const pPerf = estimateGamingPerf(p)
      pool.push(pPerf / p.fiyat)
    }
  }

  if (pool.length < 5) return 70

  pool.sort((a, b) => a - b)

  // Yüzdelik dilim skoru: bu sistemin değerinden daha düşük değere sahip sistemlerin oranı
  let lowerCount = 0
  for (const v of pool) {
    if (v < value) lowerCount++
  }
  let percentile = (lowerCount / pool.length) * 100

  // Uç değerleri törpüle
  percentile = Math.max(5, Math.min(99, Math.round(percentile)))

  return percentile
}
