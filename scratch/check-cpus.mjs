import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('mock.json', 'utf8'));

function parseCpuModel(cpuStr) {
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
        const part = parts[i].trim();
        
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
    const fallback = parts[parts.length - 1]?.toUpperCase() || "";
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

const modelMap = new Map();

raw.forEach(p => {
    const cpu = p.specs?.CPU;
    if (cpu) {
        const parsed = parseCpuModel(cpu);
        if (parsed) {
            if (!modelMap.has(parsed)) {
                modelMap.set(parsed, []);
            }
            modelMap.get(parsed).push(cpu);
        }
    }
});

console.log("PARSED MODELS AND CORRESPONDING RAW STRINGS:");
for (let [model, raws] of modelMap.entries()) {
    console.log(`- Model: "${model}" (count: ${raws.length}), Raw sample: "${raws[0]}"`);
}
