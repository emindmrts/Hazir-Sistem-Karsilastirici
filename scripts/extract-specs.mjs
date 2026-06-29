import { promises as fs } from "fs";

async function extractSpecs() {
  const data = JSON.parse(await fs.readFile("mock.json", "utf-8"));

  const cpuMap = new Map();
  const gpuMap = new Map();

  data.forEach((item) => {
    if (item.specs?.CPU) {
      const cpu = item.specs.CPU.trim();
      const key = cpu.toLowerCase();
      
      if (!cpuMap.has(key)) {
        let value = cpu;
        
        if (cpu.includes("Intel") || cpu.includes("INTEL") || cpu.includes("i3") || cpu.includes("i5") || cpu.includes("i7") || cpu.includes("i9")) {
          if (cpu.match(/i[3579]\s*\d+/i)) {
            const match = cpu.match(/i([3579])\s*(\d+)/i);
            value = `i${match[1]} ${match[2]}`;
          }
        } else if (cpu.includes("AMD") || cpu.includes("Ryzen") || cpu.includes("RYZEN")) {
          if (cpu.match(/R[357]\s*\d+/i)) {
            const match = cpu.match(/R([357])\s*(\d+)/i);
            value = `R${match[1]} ${match[2]}`;
          }
        }
        
        cpuMap.set(key, { value, label: cpu });
      }
    }

    if (item.specs?.GPU) {
      const gpu = item.specs.GPU.trim();
      const key = gpu.toLowerCase();
      
      if (!gpuMap.has(key)) {
        let value = gpu;
        
        if (gpu.match(/RTX\s*\d+/i)) {
          const match = gpu.match(/RTX\s*(\d+)/i);
          value = `RTX ${match[1]}`;
        } else if (gpu.match(/GTX\s*\d+/i)) {
          const match = gpu.match(/GTX\s*(\d+)/i);
          value = `GTX ${match[1]}`;
        } else if (gpu.match(/RX\s*\d+/i)) {
          const match = gpu.match(/RX\s*(\d+)/i);
          value = `RX ${match[1]}`;
        } else if (gpu.match(/ARC\s*[A-Z]?\d+/i)) {
          const match = gpu.match(/ARC\s*([A-Z]?\d+)/i);
          value = `ARC ${match[1]}`;
        }
        
        gpuMap.set(key, { value, label: gpu });
      }
    }
  });

  const cpuList = Array.from(cpuMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
  
  const gpuList = Array.from(gpuMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  await fs.writeFile("data/cpu-list.json", JSON.stringify(cpuList, null, 2));
  await fs.writeFile("data/gpu-list.json", JSON.stringify(gpuList, null, 2));

  console.log(`Extracted ${cpuList.length} CPUs and ${gpuList.length} GPUs`);
}

extractSpecs().catch(console.error);
