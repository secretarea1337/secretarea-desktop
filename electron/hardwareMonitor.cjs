const os = require('os');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execFile } = require('child_process');
const si = require('systeminformation');
const { queryNvidiaExtendedInfo, buildNvidiaProfile } = require('./hardware/nvidiaAdapter.cjs');
const { buildAmdProfile } = require('./hardware/amdAdapter.cjs');
const { buildIntelProfile } = require('./hardware/intelAdapter.cjs');
const {
  createDisplayLaptopAdapter,
  classifyCpuFamily,
  classifyMemoryChannels,
} = require('./hardware/displayLaptopAdapter.cjs');
const { readManagedLhmSensors } = require('./hardware/lhmLibBridge.cjs');

function runExecFile(cmd, args, timeoutMs = 2500) {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        resolve(typeof stdout === 'string' ? stdout.trim() : '');
      }
    );
  });
}

function toFiniteNumber(val) {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const cleaned = val.trim();
    if (!cleaned || /^(n\/a|\[n\/a\]|not supported|unknown|null|-)$/i.test(cleaned)) {
      return null;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function sanitizeLabel(val) {
  if (typeof val !== 'string') return null;
  const cleaned = val.trim();
  if (!cleaned || /^(unknown|n\/a|not available|to be filled by o\.e\.m\.|none)$/i.test(cleaned)) {
    return null;
  }
  return cleaned;
}

function normalizeManufacturer(rawVendor, rawModel) {
  const combined = `${rawVendor || ''} ${rawModel || ''}`.toLowerCase();
  if (/\b(nvidia|geforce|quadro|rtx|gtx|tesla)\b/i.test(combined)) {
    return 'NVIDIA';
  }
  if (/\b(intel|uhd|iris|arc)\b/i.test(combined)) {
    return 'Intel';
  }
  if (/\b(amd|radeon|ati)\b/i.test(combined) || /advanced micro devices/i.test(combined)) {
    return 'AMD';
  }
  return sanitizeLabel(rawVendor);
}

function normalizeDriveType(rawType, rawInterface, rawModel) {
  const combined = `${rawType || ''} ${rawInterface || ''} ${rawModel || ''}`.toUpperCase();
  if (combined.includes('NVME')) return 'NVMe';
  if (combined.includes('SSD') || combined.includes('SOLID STATE')) return 'SSD';
  if (
    combined.includes('HDD') ||
    /\bHD\b/.test(combined) ||
    combined.includes('HARD DISK') ||
    combined.includes('ROTATIONAL')
  ) {
    return 'HDD';
  }
  return null;
}

function mapSmbiosMemoryType(code) {
  const num = Number(code);
  switch (num) {
    case 20:
      return 'DDR';
    case 21:
      return 'DDR2';
    case 24:
      return 'DDR3';
    case 26:
      return 'DDR4';
    case 27:
      return 'LPDDR';
    case 28:
      return 'LPDDR2';
    case 29:
      return 'LPDDR3';
    case 30:
      return 'LPDDR4';
    case 34:
      return 'DDR5';
    case 35:
      return 'LPDDR5';
    default:
      return null;
  }
}

function isLoopbackIface(name) {
  if (!name) return true;
  const lower = String(name).toLowerCase();
  return lower === 'lo' || lower.includes('loopback');
}

function parseNvidiaSmiCsv(out) {
  if (!out || typeof out !== 'string') return [];
  return out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      return {
        index: toFiniteNumber(parts[0]),
        name: sanitizeLabel(parts[1]),
        utilizationPercent: toFiniteNumber(parts[2]),
        temperatureCelsius: toFiniteNumber(parts[3]),
        vramUsedMB: toFiniteNumber(parts[4]),
        vramTotalMB: toFiniteNumber(parts[5]),
        clockSpeedMhz: toFiniteNumber(parts[6]),
        fanSpeedPercent: toFiniteNumber(parts[7]),
        powerWatts: toFiniteNumber(parts[8]),
      };
    });
}

function isExcludedThermalZoneLabel(zoneName) {
  if (!zoneName || typeof zoneName !== 'string') return true;
  const lower = zoneName.trim().toLowerCase();
  if (!lower) return true;
  return /(wifi|iwlwifi|wlan|nvme|ssd|hdd|nouveau|amdgpu|gpu|gfx|gfz|gfuz|ambient|skin|chassis|bat|batz|battery|chg|chgz|locz|extz|dimm|vrm|pch|chipset|board|mobo|system)/i.test(
    lower
  );
}

function isCpuThermalZoneLabel(zoneName) {
  if (!zoneName || typeof zoneName !== 'string') return false;
  const lower = zoneName.trim().toLowerCase();
  if (!lower || isExcludedThermalZoneLabel(lower)) return false;
  if (/(acpitz|\btz\d+)/i.test(lower)) {
    return false;
  }
  // Accept zones explicitly identifying the CPU die/package/socket/core (including \_TZ.CPUZ / \_TZ.TCPU)
  return /(^|[\\/_ .-])(cpu|cpuz|cpu_z|tcpu|x86_pkg_temp|x86pkg|pkg|package|coretemp|k10temp|zenpower|proc|processor|soc_thermal|cpu_thermal|cpu-thermal)([\\/_ .-\d]|$)/i.test(
    lower
  );
}

function isWindowsAcpiThermalZoneFallbackLabel(zoneName) {
  if (!zoneName || typeof zoneName !== 'string') return false;
  const lower = zoneName.trim().toLowerCase();
  if (!lower || isExcludedThermalZoneLabel(lower)) return false;
  return /(_tz\.|thermalzone|thrm|thm\d+|\btz\d+)/i.test(lower);
}

function extractThermalItemCelsius(item) {
  if (!item) return { celsius: null, rawTenthsKelvin: null };

  const hiPrec = toFiniteNumber(item.HighPrecisionTemperature);
  if (hiPrec !== null && hiPrec > 2000 && hiPrec < 4200) {
    return {
      celsius: Number((hiPrec / 10 - 273.15).toFixed(1)),
      rawTenthsKelvin: Math.round(hiPrec),
    };
  }

  const curTemp = toFiniteNumber(item.CurrentTemperature);
  if (curTemp !== null && curTemp > 2000 && curTemp < 4200) {
    return {
      celsius: Number((curTemp / 10 - 273.15).toFixed(1)),
      rawTenthsKelvin: Math.round(curTemp),
    };
  }

  const tempVal = toFiniteNumber(item.Temperature);
  if (tempVal !== null) {
    if (tempVal > 2000 && tempVal < 4200) {
      return {
        celsius: Number((tempVal / 10 - 273.15).toFixed(1)),
        rawTenthsKelvin: Math.round(tempVal),
      };
    }
    if (tempVal > 200 && tempVal < 420) {
      return {
        celsius: Number((tempVal - 273.15).toFixed(1)),
        rawTenthsKelvin: Math.round(tempVal * 10),
      };
    }
    if (tempVal > 0 && tempVal <= 120) {
      return { celsius: Number(tempVal.toFixed(1)), rawTenthsKelvin: null };
    }
  }

  const cVal = toFiniteNumber(item.celsius);
  if (cVal !== null && cVal > 0 && cVal <= 120) {
    return { celsius: Number(cVal.toFixed(1)), rawTenthsKelvin: null };
  }

  return { celsius: null, rawTenthsKelvin: null };
}

function pickCpuThermalZoneTemp(thermalZones) {
  if (!thermalZones) return null;
  const list = Array.isArray(thermalZones) ? thermalZones : [thermalZones];
  const explicitCpuTemps = [];
  const acpiFallbackTemps = [];

  for (const item of list) {
    if (!item) continue;
    const label = String(item.InstanceName || item.Name || item.type || '');
    const { celsius, rawTenthsKelvin } = extractThermalItemCelsius(item);
    if (celsius === null || celsius <= 0 || celsius > 120) continue;

    if (isCpuThermalZoneLabel(label)) {
      explicitCpuTemps.push(celsius);
    } else if (isWindowsAcpiThermalZoneFallbackLabel(label)) {
      // Skip common static BIOS ACPI stub values (0°C=2732, 25°C=2982, 26.85°C=3000, 27.85°C=3010)
      const isStubConstant =
        rawTenthsKelvin === 2732 ||
        rawTenthsKelvin === 2982 ||
        rawTenthsKelvin === 3000 ||
        rawTenthsKelvin === 3010;
      if (!isStubConstant && celsius > 28) {
        acpiFallbackTemps.push(celsius);
      }
    }
  }

  if (explicitCpuTemps.length > 0) {
    return Math.max(...explicitCpuTemps);
  }
  if (acpiFallbackTemps.length > 0) {
    return Math.max(...acpiFallbackTemps);
  }
  return null;
}

function normalizeLuidString(rawLuid) {
  if (!rawLuid || typeof rawLuid !== 'string') return null;
  const m = rawLuid.match(/luid_0x([0-9a-f]+)_0x([0-9a-f]+)/i);
  if (!m) return null;
  const high = m[1].toLowerCase().padStart(8, '0');
  const low = m[2].toLowerCase().padStart(8, '0');
  return `luid_0x${high}_0x${low}`;
}

function parseWindowsGpuPerfByLuid(gpuEngList, gpuMemList) {
  const byLuid = new Map();

  const ensureEntry = (luid) => {
    if (!byLuid.has(luid)) {
      byLuid.set(luid, { luid, engSums: new Map(), util3d: null, dedicatedMB: null, sharedMB: null });
    }
    return byLuid.get(luid);
  };

  const engArr = Array.isArray(gpuEngList) ? gpuEngList : gpuEngList ? [gpuEngList] : [];
  for (const item of engArr) {
    const name = String(item?.Name || '');
    const luid = normalizeLuidString(name);
    if (!luid) continue;
    const val = toFiniteNumber(item?.UtilizationPercentage);
    if (val === null || val < 0) continue;
    const engMatch = name.match(/engtype_([a-z0-9_]+)/i);
    const engType = engMatch ? engMatch[1].toLowerCase() : '3d';
    const entry = ensureEntry(luid);
    entry.engSums.set(engType, (entry.engSums.get(engType) || 0) + val);
  }

  const memArr = Array.isArray(gpuMemList) ? gpuMemList : gpuMemList ? [gpuMemList] : [];
  for (const item of memArr) {
    const name = String(item?.Name || '');
    const luid = normalizeLuidString(name);
    if (!luid) continue;
    const entry = ensureEntry(luid);

    const dedBytes = toFiniteNumber(item?.DedicatedUsage);
    if (dedBytes !== null && dedBytes >= 0) {
      const dedMb = Math.round(dedBytes / (1024 * 1024));
      entry.dedicatedMB = entry.dedicatedMB !== null ? Math.max(entry.dedicatedMB, dedMb) : dedMb;
    }

    const shrBytes = toFiniteNumber(item?.SharedUsage);
    if (shrBytes !== null && shrBytes >= 0) {
      const shrMb = Math.round(shrBytes / (1024 * 1024));
      entry.sharedMB = entry.sharedMB !== null ? Math.max(entry.sharedMB, shrMb) : shrMb;
    }
  }

  return Array.from(byLuid.values()).map((entry) => {
    let util = null;
    if (entry.engSums.size > 0) {
      const maxEng = Math.max(...entry.engSums.values());
      util = Math.min(100, Number(maxEng.toFixed(1)));
    } else if (entry.dedicatedMB !== null || entry.sharedMB !== null) {
      // Active WDDM adapter present in GPUAdapterMemory with zero active engine load
      util = 0;
    }
    return {
      luid: entry.luid,
      util3d: util,
      dedicatedMB: entry.dedicatedMB,
      sharedMB: entry.sharedMB,
    };
  });
}

function extractWindowsSensorReadings(sensorList, powerMeterList) {
  const sensors = Array.isArray(sensorList) ? sensorList : sensorList ? [sensorList] : [];
  const meters = Array.isArray(powerMeterList) ? powerMeterList : powerMeterList ? [powerMeterList] : [];

  let cpuTempC = null;
  let cpuPowerWatts = null;
  let cpuVoltageVolts = null;
  const gpuSensorsByVendor = { Intel: null, AMD: null, NVIDIA: null };
  const fans = [];
  const extraTemps = [];

  const pkgTempCandidates = [];
  const coreTempCandidates = [];
  const cpuPowerCandidates = [];

  for (const s of sensors) {
    if (!s) continue;
    const sType = String(s.SensorType || '').toLowerCase();
    const sName = String(s.Name || '').trim();
    const sNameLower = sName.toLowerCase();
    const ident = String(s.Identifier || '').toLowerCase();
    const val = toFiniteNumber(s.Value);
    if (val === null) continue;

    if (sType === 'fan' && val >= 0) {
      fans.push({
        id: ident || `fan-${fans.length}`,
        name: sName || `Fan ${fans.length + 1}`,
        rpm: Math.round(val),
        percent: null,
        source: ident.includes('lhm') ? 'LibreHardwareMonitor' : 'Hardware Sensor WMI',
      });
    }

    if (ident.includes('cpu') || ident.startsWith('/amdcpu') || ident.startsWith('/intelcpu')) {
      if (sType === 'temperature' && val > 0 && val <= 120) {
        if (/(package|tctl|tdie|core max|cpu package)/i.test(sNameLower)) {
          pkgTempCandidates.push(Number(val.toFixed(1)));
        } else if (/(core|cpu)/i.test(sNameLower)) {
          coreTempCandidates.push(Number(val.toFixed(1)));
        }
      } else if (sType === 'power' && val >= 0 && val <= 1000) {
        if (/(package|cpu package|ppt)/i.test(sNameLower)) {
          cpuPowerCandidates.unshift(Number(val.toFixed(1)));
        } else if (/(cores|cpu|ia)/i.test(sNameLower)) {
          cpuPowerCandidates.push(Number(val.toFixed(1)));
        }
      } else if (sType === 'voltage' && val > 0.2 && val < 3.0 && /(core|vcore|cpu)/i.test(sNameLower)) {
        if (cpuVoltageVolts === null) {
          cpuVoltageVolts = Number(val.toFixed(3));
        }
      }
    } else if (ident.includes('gpu')) {
      const vendor = ident.includes('nvidia')
        ? 'NVIDIA'
        : ident.includes('amd') || ident.includes('radeon')
        ? 'AMD'
        : ident.includes('intel')
        ? 'Intel'
        : null;
      if (!vendor) continue;
      if (!gpuSensorsByVendor[vendor]) {
        gpuSensorsByVendor[vendor] = {
          utilizationPercent: null,
          temperatureCelsius: null,
          hotspotTempCelsius: null,
          clockSpeedMhz: null,
          memoryClockMhz: null,
          powerWatts: null,
          fanSpeedRpm: null,
        };
      }
      const g = gpuSensorsByVendor[vendor];
      if (sType === 'temperature' && val > 0 && val <= 125) {
        if (/(hot spot|hotspot|junction)/i.test(sNameLower)) {
          g.hotspotTempCelsius = Number(val.toFixed(1));
          extraTemps.push({
            id: ident || `gpu-hot-${extraTemps.length}`,
            name: `${vendor} ${sName}`,
            category: 'gpu_hotspot',
            celsius: Number(val.toFixed(1)),
            source: 'Hardware Sensor WMI',
          });
        } else if (/(memory|vram)/i.test(sNameLower)) {
          extraTemps.push({
            id: ident || `gpu-vram-${extraTemps.length}`,
            name: `${vendor} ${sName}`,
            category: 'vram',
            celsius: Number(val.toFixed(1)),
            source: 'Hardware Sensor WMI',
          });
        } else if (/(gpu core|edge|temperature)/i.test(sNameLower)) {
          if (g.temperatureCelsius === null || sNameLower.includes('core') || sNameLower.includes('edge')) {
            g.temperatureCelsius = Number(val.toFixed(1));
          }
        }
      } else if (sType === 'load' && val >= 0 && val <= 100 && /(gpu core|d3d 3d|3d)/i.test(sNameLower)) {
        g.utilizationPercent = Math.max(g.utilizationPercent ?? 0, Number(val.toFixed(1)));
      } else if (sType === 'clock' && val > 0) {
        if (/(gpu memory|memory)/i.test(sNameLower)) {
          g.memoryClockMhz = Math.round(val);
        } else if (/(gpu core|graphics)/i.test(sNameLower)) {
          g.clockSpeedMhz = Math.round(val);
        }
      } else if (sType === 'power' && val >= 0 && val <= 1500 && /(gpu|package|power|total)/i.test(sNameLower)) {
        g.powerWatts = Number(val.toFixed(1));
      } else if (sType === 'fan' && val >= 0) {
        g.fanSpeedRpm = Math.round(val);
      }
    } else if (sType === 'temperature' && val > 0 && val <= 125) {
      let category = 'other';
      if (/(chipset|pch)/i.test(sNameLower)) category = 'chipset';
      else if (/(vrm|mos|vr )/i.test(sNameLower)) category = 'vrm';
      else if (/(nvme|ssd|hdd|drive|composite)/i.test(sNameLower) || ident.includes('nvme') || ident.includes('hdd')) category = 'storage';
      else if (/(motherboard|system|mainboard|tmpin|t_sys)/i.test(sNameLower) || ident.includes('lpc')) category = 'motherboard';
      extraTemps.push({
        id: ident || `temp-${extraTemps.length}`,
        name: sName || 'Board Sensor',
        category,
        celsius: Number(val.toFixed(1)),
        source: 'Hardware Sensor WMI',
      });
    }
  }

  if (pkgTempCandidates.length > 0) {
    cpuTempC = Math.max(...pkgTempCandidates);
  } else if (coreTempCandidates.length > 0) {
    cpuTempC = Number((coreTempCandidates.reduce((a, b) => a + b, 0) / coreTempCandidates.length).toFixed(1));
  }

  if (cpuPowerCandidates.length > 0) {
    cpuPowerWatts = cpuPowerCandidates[0];
  } else {
    for (const pm of meters) {
      const name = String(pm?.Name || '').toLowerCase();
      const mw = toFiniteNumber(pm?.Power);
      if (mw === null || mw < 0) continue;
      if (/(cpu|pkg|package|rapl|ia\b|processor)/i.test(name)) {
        cpuPowerWatts = Number((mw / 1000).toFixed(1));
        break;
      }
    }
  }

  return { cpuTempC, cpuPowerWatts, cpuVoltageVolts, gpuSensorsByVendor, fans, extraTemps };
}

function scoreGpuForOrdering(gpu) {
  const model = String(gpu?.model || '').toLowerCase();
  const mfg = String(gpu?.manufacturer || '').toLowerCase();
  let score = 0;

  if (
    model.includes('microsoft basic') ||
    model.includes('virtual') ||
    model.includes('parsec') ||
    model.includes('vnc') ||
    model.includes('citrix') ||
    model.includes('mirage')
  ) {
    score -= 100;
  } else if (
    mfg.includes('nvidia') ||
    model.includes('geforce') ||
    model.includes('rtx') ||
    model.includes('gtx') ||
    model.includes('quadro')
  ) {
    score += 100;
  } else if (
    /\brx\s*\d{3,4}/i.test(model) ||
    model.includes('radeon pro') ||
    (mfg.includes('intel') && /\barc(?:\((?:r|tm)\)|[®™])?\s*(?:pro\s*)?[ab]\d{2,3}/i.test(model))
  ) {
    score += 90;
  } else if (mfg.includes('amd') || model.includes('radeon')) {
    const isIgpu =
      model.includes('radeon(tm) graphics') ||
      model.includes('radeon graphics') ||
      /\b[678]\d0m\b/.test(model);
    score += isIgpu ? 30 : 55;
  } else if (
    mfg.includes('intel') ||
    model.includes('uhd') ||
    model.includes('iris') ||
    /\barc\b/i.test(model)
  ) {
    score += 25;
  } else {
    score += 10;
  }

  if (typeof gpu?.temperatureCelsius === 'number' && Number.isFinite(gpu.temperatureCelsius)) {
    score += 15;
  }
  if (typeof gpu?.vramTotalMB === 'number' && gpu.vramTotalMB >= 2048) {
    score += 12;
  }
  if (typeof gpu?.utilizationPercent === 'number' && Number.isFinite(gpu.utilizationPercent)) {
    score += 6;
  }
  if (typeof gpu?.powerWatts === 'number' && Number.isFinite(gpu.powerWatts)) {
    score += 4;
  }

  return score;
}

function parseLinuxDiskstats(content) {
  const map = new Map();
  if (!content || typeof content !== 'string') return map;
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 14) continue;
    const devName = parts[2];
    const sectorsRead = Number(parts[5]);
    const sectorsWritten = Number(parts[9]);
    if (!devName || !Number.isFinite(sectorsRead) || !Number.isFinite(sectorsWritten)) continue;
    // Linux kernel /proc/diskstats always reports sectors in 512-byte units
    map.set(devName, {
      bytesRead: sectorsRead * 512,
      bytesWritten: sectorsWritten * 512,
    });
  }
  return map;
}

function computeCpuLoadFromOsCpus(prevCpusSnapshot) {
  const cpus = os.cpus() || [];
  if (cpus.length === 0) {
    return { nextSnapshot: null, currentLoad: null, coreLoads: [], avgClockGhz: null };
  }

  const nextSnapshot = cpus.map((cpu) => {
    const times = cpu.times || {};
    const sys = process.platform === 'win32' ? Math.max(0, (times.sys || 0) - (times.irq || 0)) : times.sys || 0;
    const active = (times.user || 0) + sys + (times.nice || 0) + (times.irq || 0);
    const total = active + (times.idle || 0);
    return { active, total, speed: cpu.speed || 0 };
  });

  const validSpeedsMhz = nextSnapshot.map((c) => c.speed).filter((s) => Number.isFinite(s) && s > 0);
  const avgClockGhz =
    validSpeedsMhz.length > 0
      ? Number((validSpeedsMhz.reduce((a, b) => a + b, 0) / validSpeedsMhz.length / 1000).toFixed(2))
      : null;

  if (!prevCpusSnapshot || prevCpusSnapshot.length !== nextSnapshot.length) {
    return { nextSnapshot, currentLoad: null, coreLoads: [], avgClockGhz };
  }

  let totalActiveDelta = 0;
  let totalTickDelta = 0;
  const coreLoads = [];

  for (let i = 0; i < nextSnapshot.length; i++) {
    const activeDelta = Math.max(0, nextSnapshot[i].active - prevCpusSnapshot[i].active);
    const tickDelta = Math.max(0, nextSnapshot[i].total - prevCpusSnapshot[i].total);
    totalActiveDelta += activeDelta;
    totalTickDelta += tickDelta;
    if (tickDelta > 0) {
      coreLoads.push(Number(Math.min(100, Math.max(0, (activeDelta / tickDelta) * 100)).toFixed(1)));
    }
  }

  const currentLoad =
    totalTickDelta > 0
      ? Number(Math.min(100, Math.max(0, (totalActiveDelta / totalTickDelta) * 100)).toFixed(1))
      : null;

  return { nextSnapshot, currentLoad, coreLoads, avgClockGhz };
}

async function readLinuxCpuStatsAsync() {
  try {
    const raw = await fsp.readFile('/proc/stat', 'utf8');
    const lines = raw.split('\n');
    const cores = [];
    let aggregate = null;

    for (const line of lines) {
      if (!line.startsWith('cpu')) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) continue;
      const label = parts[0];
      const user = Number(parts[1]) || 0;
      const nice = Number(parts[2]) || 0;
      const sys = Number(parts[3]) || 0;
      const idle = Number(parts[4]) || 0;
      const iowait = Number(parts[5]) || 0;
      const irq = Number(parts[6]) || 0;
      const softirq = Number(parts[7]) || 0;
      const steal = Number(parts[8]) || 0;
      const active = user + nice + sys + irq + softirq + steal;
      const total = active + idle + iowait;
      if (label === 'cpu') {
        aggregate = { active, total };
      } else if (/^cpu\d+$/.test(label)) {
        cores.push({ active, total });
      }
    }
    return { aggregate, cores };
  } catch {
    return null;
  }
}

async function readLinuxCpuClockGhzAsync() {
  // Prefer sysfs live scaling_cur_freq if present, then /proc/cpuinfo cpu MHz
  try {
    const cpufreqRoot = '/sys/devices/system/cpu/cpufreq';
    if (fs.existsSync(cpufreqRoot)) {
      const policies = await fsp.readdir(cpufreqRoot);
      const freqsKhz = [];
      for (const p of policies) {
        if (!p.startsWith('policy')) continue;
        try {
          const val = await fsp.readFile(path.join(cpufreqRoot, p, 'scaling_cur_freq'), 'utf8');
          const num = toFiniteNumber(val);
          if (num !== null && num > 0) freqsKhz.push(num);
        } catch {
          // ignore unreadable policy
        }
      }
      if (freqsKhz.length > 0) {
        const avgGhz = freqsKhz.reduce((a, b) => a + b, 0) / freqsKhz.length / 1e6;
        return Number(avgGhz.toFixed(2));
      }
    }
  } catch {
    // fallback below
  }

  try {
    const cpuinfo = await fsp.readFile('/proc/cpuinfo', 'utf8');
    const mhzList = [];
    for (const line of cpuinfo.split('\n')) {
      if (line.toLowerCase().startsWith('cpu mhz')) {
        const val = toFiniteNumber(line.split(':')[1]);
        if (val !== null && val > 0) mhzList.push(val);
      }
    }
    if (mhzList.length > 0) {
      const avgGhz = mhzList.reduce((a, b) => a + b, 0) / mhzList.length / 1000;
      return Number(avgGhz.toFixed(2));
    }
  } catch {
    // ignore
  }
  return null;
}

async function readLinuxCpuTemperatureCelsiusAsync() {
  const cpuHwmonDrivers = new Set([
    'coretemp',
    'k10temp',
    'zenpower',
    'zenergy',
    'fam15h_power',
    'cpu_thermal',
    'soc_thermal',
  ]);

  try {
    const hwmonRoot = '/sys/class/hwmon';
    if (fs.existsSync(hwmonRoot)) {
      const dirs = await fsp.readdir(hwmonRoot);
      const packageTemps = [];
      const coreTemps = [];

      for (const dir of dirs) {
        const base = path.join(hwmonRoot, dir);
        let drvName = '';
        try {
          drvName = (await fsp.readFile(path.join(base, 'name'), 'utf8')).trim().toLowerCase();
        } catch {
          continue;
        }
        if (!cpuHwmonDrivers.has(drvName)) continue;

        let files = [];
        try {
          files = await fsp.readdir(base);
        } catch {
          continue;
        }

        const inputs = files.filter((f) => /^temp\d+_input$/.test(f));
        for (const inp of inputs) {
          const prefix = inp.replace(/_input$/, '');
          let label = '';
          try {
            label = (await fsp.readFile(path.join(base, `${prefix}_label`), 'utf8')).trim().toLowerCase();
          } catch {
            label = '';
          }
          try {
            const rawMilli = toFiniteNumber(await fsp.readFile(path.join(base, inp), 'utf8'));
            if (rawMilli === null) continue;
            const c = Number((rawMilli / 1000).toFixed(1));
            if (c <= 0 || c > 120) continue;
            if (
              label.includes('package') ||
              label === 'tdie' ||
              label === 'tctl' ||
              label === 'tccd1'
            ) {
              packageTemps.push(c);
            } else {
              coreTemps.push(c);
            }
          } catch {
            // ignore unreadable sensor
          }
        }
      }

      if (packageTemps.length > 0) {
        return Math.max(...packageTemps);
      }
      if (coreTemps.length > 0) {
        const avg = coreTemps.reduce((a, b) => a + b, 0) / coreTemps.length;
        return Number(avg.toFixed(1));
      }
    }
  } catch {
    // fallback to explicit CPU thermal zones only
  }

  try {
    const thermalRoot = '/sys/class/thermal';
    if (fs.existsSync(thermalRoot)) {
      const entries = await fsp.readdir(thermalRoot);
      const zones = [];
      for (const entry of entries) {
        if (!entry.startsWith('thermal_zone')) continue;
        try {
          const zType = (await fsp.readFile(path.join(thermalRoot, entry, 'type'), 'utf8')).trim();
          const zTemp = toFiniteNumber(await fsp.readFile(path.join(thermalRoot, entry, 'temp'), 'utf8'));
          if (zTemp !== null) {
            zones.push({ type: zType, celsius: zTemp / 1000 });
          }
        } catch {
          // ignore
        }
      }
      return pickCpuThermalZoneTemp(zones);
    }
  } catch {
    // ignore
  }

  return null;
}

async function readLinuxRaplEnergyUjAsync() {
  try {
    const p = '/sys/class/powercap/intel-rapl/intel-rapl:0/energy_uj';
    const raw = await fsp.readFile(p, 'utf8');
    const uj = toFiniteNumber(raw);
    return uj !== null && uj >= 0 ? { uj, at: Date.now() } : null;
  } catch {
    return null;
  }
}

async function readLinuxDrmGpuDynamicAsync() {
  const byVendor = { AMD: [], Intel: [] };
  try {
    const drmRoot = '/sys/class/drm';
    if (!fs.existsSync(drmRoot)) return byVendor;
    const cards = (await fsp.readdir(drmRoot)).filter((c) => /^card\d+$/.test(c));

    for (const card of cards) {
      const devPath = path.join(drmRoot, card, 'device');
      let vendorHex = '';
      try {
        vendorHex = (await fsp.readFile(path.join(devPath, 'vendor'), 'utf8')).trim().toLowerCase();
      } catch {
        continue;
      }

      const mfg = vendorHex === '0x1002' ? 'AMD' : vendorHex === '0x8086' ? 'Intel' : null;
      if (!mfg) continue;

      const readNum = async (p) => {
        try {
          return toFiniteNumber(await fsp.readFile(p, 'utf8'));
        } catch {
          return null;
        }
      };

      const util = await readNum(path.join(devPath, 'gpu_busy_percent'));
      const vramUsedBytes = await readNum(path.join(devPath, 'mem_info_vram_used'));
      const vramTotalBytes = await readNum(path.join(devPath, 'mem_info_vram_total'));

      let tempC = null;
      let fanRpm = null;
      let powerW = null;
      try {
        const hwmonDir = path.join(devPath, 'hwmon');
        if (fs.existsSync(hwmonDir)) {
          const hwEntries = await fsp.readdir(hwmonDir);
          if (hwEntries[0]) {
            const hPath = path.join(hwmonDir, hwEntries[0]);
            const tMilli = await readNum(path.join(hPath, 'temp1_input'));
            if (tMilli !== null && tMilli > 0) tempC = Number((tMilli / 1000).toFixed(1));
            const rpm = await readNum(path.join(hPath, 'fan1_input'));
            if (rpm !== null && rpm >= 0) fanRpm = Math.round(rpm);
            const pUw =
              (await readNum(path.join(hPath, 'power1_average'))) ??
              (await readNum(path.join(hPath, 'power1_input')));
            if (pUw !== null && pUw >= 0) powerW = Number((pUw / 1e6).toFixed(1));
          }
        }
      } catch {
        // ignore
      }

      byVendor[mfg].push({
        utilizationPercent: util !== null && util >= 0 && util <= 100 ? util : null,
        vramUsedMB: vramUsedBytes !== null ? Math.round(vramUsedBytes / (1024 * 1024)) : null,
        vramTotalMB: vramTotalBytes !== null ? Math.round(vramTotalBytes / (1024 * 1024)) : null,
        temperatureCelsius: tempC,
        fanSpeedRpm: fanRpm,
        powerWatts: powerW,
      });
    }
  } catch {
    // ignore
  }
  return byVendor;
}

async function readLinuxNetStatsAsync(ifaceNames) {
  const results = [];
  const wanted = new Set(ifaceNames.filter((n) => n && !isLoopbackIface(n)));
  if (wanted.size === 0) return results;

  // Prefer single fast read of /proc/net/dev (works on all Linux kernels & containers)
  try {
    const rawDev = await fsp.readFile('/proc/net/dev', 'utf8');
    const lines = rawDev.split('\n');
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const iface = line.slice(0, colonIdx).trim();
      if (!wanted.has(iface)) continue;
      const cols = line.slice(colonIdx + 1).trim().split(/\s+/);
      if (cols.length < 9) continue;
      const rx = toFiniteNumber(cols[0]);
      const tx = toFiniteNumber(cols[8]);
      if (rx === null || tx === null) continue;
      let operstate = null;
      if (!iface.includes('/') && iface !== '.' && iface !== '..') {
        try {
          operstate = (await fsp.readFile(path.join('/sys/class/net', iface, 'operstate'), 'utf8')).trim() || null;
        } catch {
          operstate = null;
        }
      }
      results.push({ iface, operstate, rxBytes: rx, txBytes: tx });
    }
    if (results.length > 0) return results;
  } catch {
    // fallback to /sys/class/net per-interface read below
  }

  for (const iface of wanted) {
    if (iface.includes('/') || iface === '.' || iface === '..') continue;
    const base = path.join('/sys/class/net', iface);
    try {
      const [operRaw, rxRaw, txRaw] = await Promise.all([
        fsp.readFile(path.join(base, 'operstate'), 'utf8').catch(() => ''),
        fsp.readFile(path.join(base, 'statistics/rx_bytes'), 'utf8'),
        fsp.readFile(path.join(base, 'statistics/tx_bytes'), 'utf8'),
      ]);
      const rx = toFiniteNumber(rxRaw);
      const tx = toFiniteNumber(txRaw);
      if (rx !== null && tx !== null) {
        results.push({
          iface,
          operstate: operRaw.trim() || null,
          rxBytes: rx,
          txBytes: tx,
        });
      }
    } catch {
      // interface might not exist anymore
    }
  }
  return results;
}

function createHardwareMonitor({ getMainWindow, onSnapshot, getLhmLibraryInfo } = {}) {
  let isMonitoring = false;
  let pausedByHide = false;
  let pauseOnMinimize = true;
  let intervalMs = 1500;
  let lastSampleDurationMs = null;
  let pollTimer = null;
  let isSampling = false;
  let pendingImmediateSample = false;
  let sessionToken = 0;

  let staticProfile = null;
  let staticProfilePromise = null;
  let nvidiaSmiPath = undefined;
  let cachedNvidiaExt = null;
  let lastNvidiaExtAt = 0;
  const displayLaptopAdapter = createDisplayLaptopAdapter();
  let cachedDisplayLaptop = null;
  let lastDisplayLaptopAt = 0;
  let cachedManagedLhm = null;
  let lastManagedLhmAt = 0;
  let managedLhmInFlight = false;

  let cachedFsSize = null;
  let lastFsFetchAt = 0;

  let cachedFsStats = null;
  let lastFsStatsAt = 0;

  let cachedDiskLayout = null;
  let lastDiskLayoutAt = 0;

  let cachedNetIfaces = null;
  let lastNetIfacesAt = 0;

  let prevCpuSnapshot = null;
  let prevLinuxCpuProc = null;
  let prevRaplSample = null;
  let prevDiskstats = null;
  let prevDiskstatsAt = 0;
  let prevNetBytes = new Map();
  let hasWarmedFsStats = false;

  let lastSnapshot = null;

  async function detectNvidiaSmiPath() {
    if (nvidiaSmiPath !== undefined) return nvidiaSmiPath;
    const candidates =
      process.platform === 'win32'
        ? Array.from(
            new Set(
              [
                process.env.SystemRoot
                  ? path.win32.join(process.env.SystemRoot, 'System32', 'nvidia-smi.exe')
                  : null,
                process.env.ProgramFiles
                  ? path.win32.join(process.env.ProgramFiles, 'NVIDIA Corporation', 'NVSMI', 'nvidia-smi.exe')
                  : null,
                process.env.ProgramW6432
                  ? path.win32.join(process.env.ProgramW6432, 'NVIDIA Corporation', 'NVSMI', 'nvidia-smi.exe')
                  : null,
                'C:\\Windows\\System32\\nvidia-smi.exe',
                'C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe',
                'nvidia-smi.exe',
              ].filter(Boolean)
            )
          )
        : ['nvidia-smi'];

    for (const candidate of candidates) {
      if (candidate.includes('\\') && !fs.existsSync(candidate)) {
        continue;
      }
      const out = await runExecFile(
        candidate,
        ['--query-gpu=name', '--format=csv,noheader'],
        1800
      );
      if (out !== null && out.length > 0) {
        nvidiaSmiPath = candidate;
        return nvidiaSmiPath;
      }
    }
    nvidiaSmiPath = null;
    return null;
  }

  async function queryNvidiaSmi() {
    const bin = await detectNvidiaSmiPath();
    if (!bin) return [];
    const out = await runExecFile(
      bin,
      [
        '--query-gpu=index,name,utilization.gpu,temperature.gpu,memory.used,memory.total,clocks.current.graphics,fan.speed,power.draw',
        '--format=csv,noheader,nounits',
      ],
      1800
    );
    return parseNvidiaSmiCsv(out);
  }

  async function queryWindowsStaticHardware() {
    if (process.platform !== 'win32') return null;
    const script = [
      '$ErrorActionPreference = "SilentlyContinue";',
      '$mem = @(Get-CimInstance Win32_PhysicalMemory | Select-Object SMBIOSMemoryType,MemoryType,ConfiguredClockSpeed,Speed);',
      '$disks = @(Get-PhysicalDisk | Select-Object DeviceId,FriendlyName,MediaType,BusType,Size);',
      '$parts = @(Get-Partition | Where-Object { $_.DriveLetter } | Select-Object DiskNumber,DriveLetter);',
      '$dxAdapters = @(Get-ChildItem -Path "HKLM:\\SOFTWARE\\Microsoft\\DirectX" | ForEach-Object {',
      '  $p = Get-ItemProperty -Path $_.PSPath;',
      '  if ($p.Description -and $null -ne $p.AdapterLuid) {',
      '    $bytes = $null;',
      '    if ($p.AdapterLuid -is [byte[]] -and $p.AdapterLuid.Length -ge 8) { $bytes = $p.AdapterLuid }',
      '    elseif ($p.AdapterLuid -is [int64] -or $p.AdapterLuid -is [uint64] -or $p.AdapterLuid -is [int32] -or $p.AdapterLuid -is [uint32]) { $bytes = [BitConverter]::GetBytes([int64]$p.AdapterLuid) }',
      '    if ($bytes -and $bytes.Length -ge 8) {',
      '      $low = [BitConverter]::ToUInt32($bytes, 0);',
      '      $high = [BitConverter]::ToUInt32($bytes, 4);',
      '      [PSCustomObject]@{ Description = [string]$p.Description; Luid = ("luid_0x{0:x8}_0x{1:x8}" -f $high, $low); DedicatedMB = if ($null -ne $p.DedicatedVideoMemory) { [math]::Round([uint64]$p.DedicatedVideoMemory / 1MB) } else { $null } }',
      '    }',
      '  }',
      '});',
      '$ns = @(Get-CimInstance -Namespace root -ClassName __NAMESPACE | ForEach-Object { $_.Name });',
      '@{ mem = $mem; disks = $disks; parts = $parts; dxAdapters = $dxAdapters; hasLhm = ($ns -contains "LibreHardwareMonitor"); hasOhm = ($ns -contains "OpenHardwareMonitor") } | ConvertTo-Json -Depth 4 -Compress',
    ].join(' ');

    const raw = await runExecFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      7000
    );
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function queryWindowsDynamicPerf(winFeatures) {
    if (process.platform !== 'win32') return null;
    // Single combined lightweight PowerShell CIM query per poll cycle
    const scriptParts = [
      '$ErrorActionPreference = "SilentlyContinue";',
      '$cpuFreq = Get-CimInstance Win32_PerfFormattedData_Counters_ProcessorInformation -Filter "Name=\'_Total\'" | Select-Object -First 1 ProcessorFrequency;',
      '$physDisk = @(Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk | Select-Object Name,DiskReadBytesPersec,DiskWriteBytesPersec);',
      'if ($physDisk.Count -eq 0) { $physDisk = @(Get-CimInstance Win32_PerfFormattedData_PerfDisk_LogicalDisk | Select-Object Name,DiskReadBytesPersec,DiskWriteBytesPersec); }',
      '$netStats = @(Get-NetAdapterStatistics | Select-Object Name,InterfaceDescription,ReceivedBytes,SentBytes);',
      '$gpuEng = @(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine | Where-Object { $_.UtilizationPercentage -gt 0 -and $_.Name -match "engtype_(3D|Compute|VideoDecode|VideoEncode|Copy)" } | Select-Object Name,UtilizationPercentage);',
      '$gpuMem = @(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory | Select-Object Name,DedicatedUsage,SharedUsage);',
      '$thermalAcpi = @(Get-CimInstance -Namespace root/wmi MSAcpi_ThermalZoneTemperature | Select-Object InstanceName,CurrentTemperature);',
      '$thermalPerf = @(Get-CimInstance Win32_PerfFormattedData_Counters_ThermalZoneInformation | Select-Object Name,Temperature,HighPrecisionTemperature);',
      '$powerMeters = @(Get-CimInstance Win32_PerfFormattedData_PowerMeterCounter_PowerMeter | Select-Object Name,Power);',
    ];

    if (winFeatures?.hasLhm) {
      scriptParts.push(
        '$hwSensors = @(Get-CimInstance -Namespace root\\LibreHardwareMonitor -ClassName Sensor | Where-Object { $_.SensorType -in @("Temperature","Power","Clock","Load","Fan") } | Select-Object Name,SensorType,Value,Identifier);'
      );
    } else if (winFeatures?.hasOhm) {
      scriptParts.push(
        '$hwSensors = @(Get-CimInstance -Namespace root\\OpenHardwareMonitor -ClassName Sensor | Where-Object { $_.SensorType -in @("Temperature","Power","Clock","Load","Fan") } | Select-Object Name,SensorType,Value,Identifier);'
      );
    } else {
      scriptParts.push('$hwSensors = @();');
    }

    scriptParts.push(
      '@{ cpuFreq = $cpuFreq; physDisk = $physDisk; netStats = $netStats; gpuEng = $gpuEng; gpuMem = $gpuMem; thermalAcpi = $thermalAcpi; thermalPerf = $thermalPerf; powerMeters = $powerMeters; hwSensors = $hwSensors } | ConvertTo-Json -Depth 4 -Compress'
    );

    const raw = await runExecFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', scriptParts.join(' ')],
      5500
    );
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function loadStaticProfile() {
    if (staticProfile) return staticProfile;
    if (staticProfilePromise) return staticProfilePromise;

    staticProfilePromise = (async () => {
      const [cpuInfo, memLayout, diskLayout, winStatic, netIfaces, graphics] = await Promise.all([
        si.cpu().catch(() => null),
        si.memLayout().catch(() => []),
        si.diskLayout().catch(() => []),
        queryWindowsStaticHardware().catch(() => null),
        si.networkInterfaces().catch(() => []),
        si.graphics().catch(() => null),
        detectNvidiaSmiPath().catch(() => null),
      ]);

      let memoryType = null;
      let memorySpeedMhz = null;
      let populatedSlots = null;
      let channelMode = null;

      if (Array.isArray(memLayout) && memLayout.length > 0) {
        const types = memLayout
          .map((m) => sanitizeLabel(m?.type))
          .filter(Boolean);
        if (types.length > 0) memoryType = types[0];
        const speeds = memLayout
          .map((m) => toFiniteNumber(m?.clockSpeed))
          .filter((s) => s !== null && s > 0);
        if (speeds.length > 0) memorySpeedMhz = Math.max(...speeds);
        const ch = classifyMemoryChannels(memLayout);
        populatedSlots = ch.populatedSlots;
        channelMode = ch.channelMode;
      }

      if (winStatic) {
        const winMems = Array.isArray(winStatic.mem)
          ? winStatic.mem
          : winStatic.mem
          ? [winStatic.mem]
          : [];
        if (!populatedSlots && winMems.length > 0) {
          populatedSlots = winMems.length;
          if (winMems.length === 1) channelMode = 'Single Channel';
          else if (winMems.length === 2) channelMode = 'Dual Channel';
          else if (winMems.length === 4) channelMode = 'Dual / Quad Channel';
          else channelMode = `Multi-Channel (${winMems.length} DIMMs)`;
        }
        for (const m of winMems) {
          if (!memoryType) {
            memoryType = mapSmbiosMemoryType(m?.SMBIOSMemoryType) || mapSmbiosMemoryType(m?.MemoryType);
          }
          if (!memorySpeedMhz) {
            const spd = toFiniteNumber(m?.ConfiguredClockSpeed) || toFiniteNumber(m?.Speed);
            if (spd && spd > 0) memorySpeedMhz = spd;
          }
        }
      }

      const winDriveLetterToDisk = new Map();
      const winDisksByNumber = new Map();
      if (winStatic) {
        const winDisks = Array.isArray(winStatic.disks)
          ? winStatic.disks
          : winStatic.disks
          ? [winStatic.disks]
          : [];
        for (const d of winDisks) {
          const num = String(d?.DeviceId ?? '');
          const bus = String(d?.BusType || '').toUpperCase();
          const media = String(d?.MediaType || '').toUpperCase();
          const driveType =
            bus.includes('NVME')
              ? 'NVMe'
              : media.includes('SSD')
              ? 'SSD'
              : media.includes('HDD')
              ? 'HDD'
              : null;
          winDisksByNumber.set(num, {
            diskNumber: num,
            model: sanitizeLabel(d?.FriendlyName),
            driveType,
            size: toFiniteNumber(d?.Size),
          });
        }

        const winParts = Array.isArray(winStatic.parts)
          ? winStatic.parts
          : winStatic.parts
          ? [winStatic.parts]
          : [];
        for (const p of winParts) {
          const letter = p?.DriveLetter ? `${String(p.DriveLetter).toUpperCase()}:` : null;
          const diskNum = String(p?.DiskNumber ?? '');
          if (letter && winDisksByNumber.has(diskNum)) {
            winDriveLetterToDisk.set(letter, winDisksByNumber.get(diskNum));
          }
        }
      }

      const winDxAdapters = [];
      if (winStatic?.dxAdapters) {
        const dxArr = Array.isArray(winStatic.dxAdapters)
          ? winStatic.dxAdapters
          : [winStatic.dxAdapters];
        for (const item of dxArr) {
          const desc = sanitizeLabel(item?.Description);
          const luid = normalizeLuidString(item?.Luid);
          if (desc && luid) {
            winDxAdapters.push({
              description: desc,
              luid,
              dedicatedMB: toFiniteNumber(item?.DedicatedMB),
            });
          }
        }
      }

      const osCpus = os.cpus() || [];
      const rawManufacturer = sanitizeLabel(cpuInfo?.manufacturer);
      const rawBrand = sanitizeLabel(cpuInfo?.brand);
      const rawOsModel = sanitizeLabel(osCpus[0]?.model);
      const cpuBrand = [rawManufacturer, rawBrand].filter(Boolean).join(' ').trim() || rawOsModel || null;
      const cpuClassification = classifyCpuFamily(cpuBrand, rawManufacturer);

      staticProfile = {
        hostname: sanitizeLabel(os.hostname()),
        platform: process.platform,
        cpu: {
          model: cpuBrand,
          manufacturer: rawManufacturer || cpuClassification.vendor,
          series: cpuClassification.series,
          generation: cpuClassification.generation,
          physicalCores: toFiniteNumber(cpuInfo?.physicalCores) || null,
          logicalThreads: toFiniteNumber(cpuInfo?.cores) || osCpus.length || null,
          baseSpeedGhz:
            toFiniteNumber(cpuInfo?.speed) && cpuInfo.speed > 0
              ? Number(cpuInfo.speed.toFixed(2))
              : osCpus[0]?.speed && osCpus[0].speed > 0
              ? Number((osCpus[0].speed / 1000).toFixed(2))
              : null,
        },
        ram: {
          memoryType,
          speedMhz: memorySpeedMhz,
          populatedSlots,
          channelMode,
        },
        winDriveLetterToDisk,
        winDisksByNumber,
        winDxAdapters,
        winFeatures: {
          hasLhm: Boolean(winStatic?.hasLhm),
          hasOhm: Boolean(winStatic?.hasOhm),
        },
        initialNetIfaces: Array.isArray(netIfaces) ? netIfaces : [],
        initialGraphics: Array.isArray(graphics?.controllers) ? graphics.controllers : [],
      };
      cachedNetIfaces = staticProfile.initialNetIfaces;
      lastNetIfacesAt = Date.now();
      cachedDiskLayout = Array.isArray(diskLayout) ? diskLayout : [];
      lastDiskLayoutAt = Date.now();
      return staticProfile;
    })().finally(() => {
      staticProfilePromise = null;
    });

    return staticProfilePromise;
  }

  async function resolveLinuxCpuMetrics() {
    const [procStat, clockGhz, tempC, raplNow] = await Promise.all([
      readLinuxCpuStatsAsync(),
      readLinuxCpuClockGhzAsync(),
      readLinuxCpuTemperatureCelsiusAsync(),
      readLinuxRaplEnergyUjAsync(),
    ]);

    let usagePercent = null;
    let coreLoads = [];
    if (procStat?.aggregate) {
      if (prevLinuxCpuProc?.aggregate) {
        const dActive = Math.max(0, procStat.aggregate.active - prevLinuxCpuProc.aggregate.active);
        const dTotal = Math.max(0, procStat.aggregate.total - prevLinuxCpuProc.aggregate.total);
        if (dTotal > 0) {
          usagePercent = Number(Math.min(100, Math.max(0, (dActive / dTotal) * 100)).toFixed(1));
        }
        if (
          prevLinuxCpuProc.cores &&
          prevLinuxCpuProc.cores.length === procStat.cores.length
        ) {
          for (let i = 0; i < procStat.cores.length; i++) {
            const cActive = Math.max(0, procStat.cores[i].active - prevLinuxCpuProc.cores[i].active);
            const cTotal = Math.max(0, procStat.cores[i].total - prevLinuxCpuProc.cores[i].total);
            coreLoads.push(
              cTotal > 0 ? Number(Math.min(100, Math.max(0, (cActive / cTotal) * 100)).toFixed(1)) : 0
            );
          }
        }
      }
      prevLinuxCpuProc = procStat;
    } else {
      const osLoad = computeCpuLoadFromOsCpus(prevCpuSnapshot);
      prevCpuSnapshot = osLoad.nextSnapshot;
      usagePercent = osLoad.currentLoad;
      coreLoads = osLoad.coreLoads;
    }

    let powerWatts = null;
    if (raplNow && prevRaplSample) {
      const dtSec = (raplNow.at - prevRaplSample.at) / 1000;
      const dUj = raplNow.uj - prevRaplSample.uj;
      if (dtSec > 0.1 && dUj >= 0) {
        powerWatts = Number((dUj / 1e6 / dtSec).toFixed(1));
      }
    }
    if (raplNow) prevRaplSample = raplNow;

    return {
      usagePercent,
      coreLoads,
      clockSpeedGhz: clockGhz,
      temperatureCelsius: tempC,
      powerWatts,
    };
  }

  async function collectSnapshot() {
    const sampleStartNs = process.hrtime.bigint();
    const profile = await loadStaticProfile();
    const now = Date.now();
    const isLinux = process.platform === 'linux';
    const isWindows = process.platform === 'win32';
    const isDarwin = process.platform === 'darwin';

    // Warm baseline deltas once cleanly on first call
    if (!prevCpuSnapshot && !prevLinuxCpuProc) {
      if (isLinux) {
        const [procStatInit, diskstatsInit] = await Promise.all([
          readLinuxCpuStatsAsync(),
          fsp.readFile('/proc/diskstats', 'utf8').catch(() => null),
        ]);
        prevLinuxCpuProc = procStatInit;
        if (diskstatsInit) {
          prevDiskstats = parseLinuxDiskstats(diskstatsInit);
          prevDiskstatsAt = Date.now();
        }
        prevRaplSample = await readLinuxRaplEnergyUjAsync();
        const initIfaceNames = (profile.initialNetIfaces || [])
          .map((n) => n?.iface)
          .filter((name) => name && !isLoopbackIface(name));
        if (initIfaceNames.length > 0) {
          const netInit = await readLinuxNetStatsAsync(initIfaceNames);
          const netAt = Date.now();
          for (const st of netInit) {
            prevNetBytes.set(st.iface, { rxBytes: st.rxBytes, txBytes: st.txBytes, at: netAt });
          }
        }
      } else {
        prevCpuSnapshot = computeCpuLoadFromOsCpus(null).nextSnapshot;
        if (isWindows) {
          const netRaw = await runExecFile(
            'powershell.exe',
            [
              '-NoProfile',
              '-NonInteractive',
              '-ExecutionPolicy',
              'Bypass',
              '-Command',
              '@(Get-NetAdapterStatistics | Select-Object Name,ReceivedBytes,SentBytes) | ConvertTo-Json -Compress',
            ],
            3000
          ).catch(() => null);
          if (netRaw) {
            try {
              const parsedNet = JSON.parse(netRaw);
              const arr = Array.isArray(parsedNet) ? parsedNet : [parsedNet];
              const netAt = Date.now();
              for (const st of arr) {
                const name = sanitizeLabel(st?.Name);
                const rx = toFiniteNumber(st?.ReceivedBytes);
                const tx = toFiniteNumber(st?.SentBytes);
                if (name && !isLoopbackIface(name) && rx !== null && tx !== null) {
                  prevNetBytes.set(name, { rxBytes: rx, txBytes: tx, at: netAt });
                }
              }
            } catch {
              // ignore warmup parse failure
            }
          }
        }
      }
      if (!hasWarmedFsStats) {
        hasWarmedFsStats = true;
        await Promise.all([
          isLinux || isDarwin ? si.fsStats().catch(() => null) : Promise.resolve(null),
          isDarwin ? si.networkStats('*').catch(() => []) : Promise.resolve([]),
        ]);
      }
      await new Promise((r) => setTimeout(r, 220));
    }

    const adaptiveScale = Math.max(1, intervalMs / 1500);
    const shouldRefreshFs = !cachedFsSize || now - lastFsFetchAt >= Math.round(3000 * adaptiveScale);
    const diskLayoutInterval = Math.round((isWindows ? 30000 : 12000) * Math.min(2.5, adaptiveScale));
    const shouldRefreshDiskLayout = !cachedDiskLayout || now - lastDiskLayoutAt >= diskLayoutInterval;
    const shouldRefreshNetIfaces =
      !cachedNetIfaces || now - lastNetIfacesAt >= Math.round(15000 * Math.min(2, adaptiveScale));
    const fsStatsIntervalMs = Math.max(1400, intervalMs);
    const shouldRefreshFsStats =
      (isLinux || isDarwin) && (!cachedFsStats || now - lastFsStatsAt >= fsStatsIntervalMs);

    const [
      linuxCpuRes,
      cpuSpeedRes,
      darwinTempRes,
      memRes,
      nvidiaRes,
      drmGpuRes,
      fsStatsRes,
      linuxDiskstatsRaw,
      netIfacesRes,
      darwinNetStatsRes,
      fsSizeRes,
      diskLayoutRes,
      winPerfRes,
    ] = await Promise.all([
      isLinux ? resolveLinuxCpuMetrics() : Promise.resolve(null),
      !isLinux ? si.cpuCurrentSpeed().catch(() => null) : Promise.resolve(null),
      isDarwin ? si.cpuTemperature().catch(() => null) : Promise.resolve(null),
      isWindows ? Promise.resolve(null) : si.mem().catch(() => null),
      nvidiaSmiPath ? queryNvidiaSmi().catch(() => []) : Promise.resolve([]),
      isLinux ? readLinuxDrmGpuDynamicAsync() : Promise.resolve({ AMD: [], Intel: [] }),
      shouldRefreshFsStats ? si.fsStats().catch(() => cachedFsStats) : Promise.resolve(cachedFsStats),
      isLinux ? fsp.readFile('/proc/diskstats', 'utf8').catch(() => null) : Promise.resolve(null),
      shouldRefreshNetIfaces
        ? si.networkInterfaces().catch(() => cachedNetIfaces || [])
        : Promise.resolve(cachedNetIfaces || []),
      isDarwin ? si.networkStats('*').catch(() => []) : Promise.resolve([]),
      shouldRefreshFs ? si.fsSize().catch(() => cachedFsSize) : Promise.resolve(cachedFsSize),
      shouldRefreshDiskLayout
        ? si.diskLayout().catch(() => cachedDiskLayout)
        : Promise.resolve(cachedDiskLayout),
      isWindows ? queryWindowsDynamicPerf(profile.winFeatures).catch(() => null) : Promise.resolve(null),
    ]);

    const sampleTimestamp = Date.now();
    if (shouldRefreshFs && Array.isArray(fsSizeRes)) {
      cachedFsSize = fsSizeRes;
      lastFsFetchAt = sampleTimestamp;
    }
    if (shouldRefreshFsStats && fsStatsRes) {
      cachedFsStats = fsStatsRes;
      lastFsStatsAt = sampleTimestamp;
    }
    if (shouldRefreshDiskLayout && Array.isArray(diskLayoutRes)) {
      cachedDiskLayout = diskLayoutRes;
      lastDiskLayoutAt = sampleTimestamp;
    }
    if (shouldRefreshNetIfaces && Array.isArray(netIfacesRes)) {
      cachedNetIfaces = netIfacesRes;
      lastNetIfacesAt = sampleTimestamp;
    }

    let activeHwSensors = winPerfRes?.hwSensors;
    let usedDirectLhm = false;
    const hasWmiSensors = Array.isArray(activeHwSensors) && activeHwSensors.length > 0;
    const lhmLibInfo =
      isWindows && typeof getLhmLibraryInfo === 'function' ? getLhmLibraryInfo() : null;

    if (
      isWindows &&
      !hasWmiSensors &&
      lhmLibInfo?.installed &&
      lhmLibInfo?.healthy &&
      lhmLibInfo?.dllPath
    ) {
      const shouldPollDirectLhm =
        !cachedManagedLhm ||
        sampleTimestamp - lastManagedLhmAt >= Math.round(2000 * Math.min(2.5, adaptiveScale));
      if (shouldPollDirectLhm && !managedLhmInFlight) {
        managedLhmInFlight = true;
        try {
          const directRes = await readManagedLhmSensors({
            dllPath: lhmLibInfo.dllPath,
            timeoutMs: 5500,
          }).catch(() => null);
          if (directRes) {
            cachedManagedLhm = directRes;
            lastManagedLhmAt = Date.now();
          }
        } finally {
          managedLhmInFlight = false;
        }
      }
      if (cachedManagedLhm?.ok && Array.isArray(cachedManagedLhm.sensors) && cachedManagedLhm.sensors.length > 0) {
        activeHwSensors = cachedManagedLhm.sensors;
        usedDirectLhm = true;
      }
    }

    // --- 1. CPU Metrics ---
    let cpuUsage = null;
    let coreLoads = [];
    let cpuClockGhz = null;
    let cpuTempC = null;
    let cpuPowerWatts = null;
    let cpuVoltageVolts = null;
    const winSensorsBundle =
      isWindows && (winPerfRes || usedDirectLhm)
        ? extractWindowsSensorReadings(activeHwSensors, winPerfRes?.powerMeters)
        : { cpuTempC: null, cpuPowerWatts: null, cpuVoltageVolts: null, gpuSensorsByVendor: {}, fans: [], extraTemps: [] };

    if (isLinux && linuxCpuRes) {
      cpuUsage = linuxCpuRes.usagePercent;
      coreLoads = linuxCpuRes.coreLoads;
      cpuClockGhz = linuxCpuRes.clockSpeedGhz ?? profile.cpu.baseSpeedGhz;
      cpuTempC = linuxCpuRes.temperatureCelsius;
      cpuPowerWatts = linuxCpuRes.powerWatts;
    } else {
      const osLoad = computeCpuLoadFromOsCpus(prevCpuSnapshot);
      prevCpuSnapshot = osLoad.nextSnapshot;
      cpuUsage = osLoad.currentLoad;
      coreLoads = osLoad.coreLoads;

      const winPerfFreqMhz = toFiniteNumber(winPerfRes?.cpuFreq?.ProcessorFrequency);
      const siClock = toFiniteNumber(cpuSpeedRes?.avg);
      if (winPerfFreqMhz !== null && winPerfFreqMhz > 0) {
        cpuClockGhz = Number((winPerfFreqMhz / 1000).toFixed(2));
      } else if (siClock !== null && siClock > 0) {
        cpuClockGhz = Number(siClock.toFixed(2));
      } else if (osLoad.avgClockGhz !== null && osLoad.avgClockGhz > 0) {
        cpuClockGhz = osLoad.avgClockGhz;
      } else {
        cpuClockGhz = profile.cpu.baseSpeedGhz;
      }

      if (isWindows && winPerfRes) {
        cpuTempC =
          winSensorsBundle.cpuTempC ??
          pickCpuThermalZoneTemp(winPerfRes.thermalPerf) ??
          pickCpuThermalZoneTemp(winPerfRes.thermalAcpi);
        cpuPowerWatts = winSensorsBundle.cpuPowerWatts;
        cpuVoltageVolts = winSensorsBundle.cpuVoltageVolts;
      } else if (isDarwin) {
        const dTemp = toFiniteNumber(darwinTempRes?.main);
        cpuTempC = dTemp !== null && dTemp > 0 && dTemp <= 120 ? dTemp : null;
      }
    }

    // --- 2. GPU Metrics (Multi-GPU: NVIDIA SMI + Linux DRM + Per-LUID Windows Perf + LHM/OHM) ---
    const controllers = profile.initialGraphics;
    const nvidiaPool = [...nvidiaRes];
    const amdDrmPool = [...(drmGpuRes?.AMD || [])];
    const intelDrmPool = [...(drmGpuRes?.Intel || [])];
    const winGpuLuids = isWindows
      ? parseWindowsGpuPerfByLuid(winPerfRes?.gpuEng, winPerfRes?.gpuMem)
      : [];
    const winSensorsForGpu = winSensorsBundle.gpuSensorsByVendor || {};
    const dxAdapters = Array.isArray(profile.winDxAdapters) ? profile.winDxAdapters : [];

    // First pass: resolve NVIDIA matches and identify known NVIDIA LUIDs so non-NVIDIA LUIDs stay unambiguous
    const controllerPlans = controllers.map((ctrl, idx) => {
      const model = sanitizeLabel(ctrl?.model);
      const manufacturer = normalizeManufacturer(ctrl?.vendor, model);
      let nvMatch = null;
      if (manufacturer === 'NVIDIA' && nvidiaPool.length > 0) {
        const matchIdx = nvidiaPool.findIndex(
          (n) =>
            n.name &&
            model &&
            (model.toLowerCase().includes(n.name.toLowerCase()) ||
              n.name.toLowerCase().includes(model.toLowerCase()))
        );
        nvMatch = matchIdx >= 0 ? nvidiaPool.splice(matchIdx, 1)[0] : nvidiaPool.shift();
      }
      return { idx, ctrl, model, manufacturer, nvMatch };
    });

    const consumedLuids = new Set();
    const matchedLuidByCtrlIdx = new Map();

    if (isWindows && winGpuLuids.length > 0) {
      // Pass A: Match via HKLM:\SOFTWARE\Microsoft\DirectX AdapterLuid -> Description
      for (const plan of controllerPlans) {
        if (!plan.model) continue;
        const mLower = plan.model.toLowerCase();
        const dxMatch = dxAdapters.find(
          (d) =>
            d.description &&
            (d.description.toLowerCase() === mLower ||
              mLower.includes(d.description.toLowerCase()) ||
              d.description.toLowerCase().includes(mLower))
        );
        if (dxMatch) {
          const perfEntry = winGpuLuids.find((w) => w.luid === dxMatch.luid);
          if (perfEntry) {
            matchedLuidByCtrlIdx.set(plan.idx, perfEntry);
            consumedLuids.add(perfEntry.luid);
          } else if (plan.nvMatch) {
            consumedLuids.add(dxMatch.luid);
          }
        }
      }

      // Pass B: Unambiguous fallback for any remaining single non-NVIDIA GPU when 1 unused LUID remains
      const unmatchedNonNvPlans = controllerPlans.filter(
        (p) => !p.nvMatch && !matchedLuidByCtrlIdx.has(p.idx)
      );
      const remainingLuids = winGpuLuids.filter((w) => !consumedLuids.has(w.luid));
      if (unmatchedNonNvPlans.length === 1 && remainingLuids.length === 1) {
        matchedLuidByCtrlIdx.set(unmatchedNonNvPlans[0].idx, remainingLuids[0]);
        consumedLuids.add(remainingLuids[0].luid);
      }
    }

    const gpus = [];
    const seenGpuNames = new Set();

    controllerPlans.forEach(({ idx, ctrl, model, manufacturer, nvMatch }) => {
      if (model) seenGpuNames.add(model.toLowerCase());

      let drmMatch = null;
      if (isLinux) {
        if (manufacturer === 'AMD' && amdDrmPool.length > 0) {
          drmMatch = amdDrmPool.shift();
        } else if (manufacturer === 'Intel' && intelDrmPool.length > 0) {
          drmMatch = intelDrmPool.shift();
        }
      }

      const winGpuMatch = matchedLuidByCtrlIdx.get(idx) || null;
      const winExtraSensor = manufacturer ? winSensorsForGpu[manufacturer] || null : null;

      const staticVramTotal =
        toFiniteNumber(ctrl?.memoryTotal) ?? toFiniteNumber(ctrl?.vram);

      const util =
        nvMatch?.utilizationPercent ??
        drmMatch?.utilizationPercent ??
        winExtraSensor?.utilizationPercent ??
        winGpuMatch?.util3d ??
        null;

      const temp =
        nvMatch?.temperatureCelsius ??
        drmMatch?.temperatureCelsius ??
        winExtraSensor?.temperatureCelsius ??
        null;

      const vramTotalMB =
        nvMatch?.vramTotalMB ??
        drmMatch?.vramTotalMB ??
        (staticVramTotal !== null && staticVramTotal > 0 ? Math.round(staticVramTotal) : null);

      let winVramUsedMB = null;
      if (winGpuMatch) {
        if (winGpuMatch.dedicatedMB !== null && winGpuMatch.dedicatedMB > 0) {
          winVramUsedMB = winGpuMatch.dedicatedMB;
        } else if (
          winGpuMatch.sharedMB !== null &&
          winGpuMatch.sharedMB > 0 &&
          (!vramTotalMB || winGpuMatch.sharedMB <= vramTotalMB)
        ) {
          winVramUsedMB = winGpuMatch.sharedMB;
        } else {
          winVramUsedMB = winGpuMatch.dedicatedMB;
        }
      }

      const vramUsedMB =
        nvMatch?.vramUsedMB ??
        drmMatch?.vramUsedMB ??
        winVramUsedMB ??
        null;

      const clockSpeedMhz = nvMatch?.clockSpeedMhz ?? winExtraSensor?.clockSpeedMhz ?? null;
      const memoryClockMhz = winExtraSensor?.memoryClockMhz ?? null;
      const hotspotTempCelsius = winExtraSensor?.hotspotTempCelsius ?? null;
      const fanSpeedPercent = nvMatch?.fanSpeedPercent ?? null;
      const fanSpeedRpm = drmMatch?.fanSpeedRpm ?? winExtraSensor?.fanSpeedRpm ?? null;
      const powerWatts = nvMatch?.powerWatts ?? drmMatch?.powerWatts ?? winExtraSensor?.powerWatts ?? null;

      gpus.push({
        id: `gpu-${idx}-${(model || 'adapter').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        model: nvMatch?.name || model,
        manufacturer,
        utilizationPercent:
          util !== null ? Math.max(0, Math.min(100, Number(util.toFixed(1)))) : null,
        temperatureCelsius: temp !== null && temp > 0 && temp <= 125 ? temp : null,
        hotspotTempCelsius,
        vramUsedMB,
        vramTotalMB,
        clockSpeedMhz: clockSpeedMhz !== null && clockSpeedMhz > 0 ? clockSpeedMhz : null,
        memoryClockMhz: memoryClockMhz !== null && memoryClockMhz > 0 ? memoryClockMhz : null,
        fanSpeedPercent: fanSpeedPercent !== null && fanSpeedPercent >= 0 ? fanSpeedPercent : null,
        fanSpeedRpm,
        powerWatts: powerWatts !== null && powerWatts >= 0 ? powerWatts : null,
      });
    });

    for (const extraNv of nvidiaPool) {
      if (extraNv.name && seenGpuNames.has(extraNv.name.toLowerCase())) continue;
      gpus.push({
        id: `gpu-nv-${extraNv.index ?? gpus.length}`,
        model: extraNv.name || 'NVIDIA GPU',
        manufacturer: 'NVIDIA',
        utilizationPercent: extraNv.utilizationPercent,
        temperatureCelsius: extraNv.temperatureCelsius,
        vramUsedMB: extraNv.vramUsedMB,
        vramTotalMB: extraNv.vramTotalMB,
        clockSpeedMhz: extraNv.clockSpeedMhz,
        fanSpeedPercent: extraNv.fanSpeedPercent,
        fanSpeedRpm: null,
        powerWatts: extraNv.powerWatts,
      });
    }

    // Order GPUs so the primary discrete/telemetry-active GPU is always first (gpus[0])
    gpus.sort((a, b) => scoreGpuForOrdering(b) - scoreGpuForOrdering(a));

    // --- 3. RAM Metrics ---
    let totalRam = os.totalmem();
    let availableRam = os.freemem();
    if (!isWindows && memRes) {
      totalRam = toFiniteNumber(memRes.total) ?? totalRam;
      availableRam = toFiniteNumber(memRes.available) ?? toFiniteNumber(memRes.free) ?? availableRam;
    }
    const usedRam =
      totalRam !== null && availableRam !== null ? Math.max(0, totalRam - availableRam) : null;
    const ramUsagePercent =
      totalRam && usedRam !== null && totalRam > 0
        ? Number(((usedRam / totalRam) * 100).toFixed(1))
        : null;

    // --- 4. Storage Drives & Real Bytes/sec I/O ---
    const layoutList = Array.isArray(cachedDiskLayout) ? cachedDiskLayout : [];
    const fsList = Array.isArray(cachedFsSize) ? cachedFsSize : [];

    // Compute per-device Linux disk read/write speeds (bytes/sec) from /proc/diskstats deltas
    const linuxPerDevRates = new Map();
    if (isLinux && linuxDiskstatsRaw) {
      const currDiskstats = parseLinuxDiskstats(linuxDiskstatsRaw);
      if (prevDiskstats && prevDiskstatsAt > 0) {
        const dtSec = (sampleTimestamp - prevDiskstatsAt) / 1000;
        if (dtSec > 0.05) {
          for (const [dev, curr] of currDiskstats.entries()) {
            const prev = prevDiskstats.get(dev);
            if (!prev) continue;
            const dRead = curr.bytesRead - prev.bytesRead;
            const dWrite = curr.bytesWritten - prev.bytesWritten;
            if (dRead >= 0 && dWrite >= 0) {
              linuxPerDevRates.set(dev, {
                readBytesPerSec: Number((dRead / dtSec).toFixed(0)),
                writeBytesPerSec: Number((dWrite / dtSec).toFixed(0)),
              });
            }
          }
        }
      }
      prevDiskstats = currDiskstats;
      prevDiskstatsAt = sampleTimestamp;
    }

    // Windows per-physical-disk read/write rates (bytes/sec from Win32_PerfFormattedData_PerfDisk_PhysicalDisk)
    const winPhysDiskRates = new Map();
    let winTotalDiskRead = null;
    let winTotalDiskWrite = null;
    if (isWindows && winPerfRes?.physDisk) {
      const pdList = Array.isArray(winPerfRes.physDisk)
        ? winPerfRes.physDisk
        : [winPerfRes.physDisk];
      for (const pd of pdList) {
        const name = String(pd?.Name || '').trim();
        const rRate = toFiniteNumber(pd?.DiskReadBytesPersec);
        const wRate = toFiniteNumber(pd?.DiskWriteBytesPersec);
        if (name === '_Total') {
          winTotalDiskRead = rRate;
          winTotalDiskWrite = wRate;
        } else if (name) {
          winPhysDiskRates.set(name, { readBytesPerSec: rRate, writeBytesPerSec: wRate });
          const numPrefix = name.split(/\s+/)[0];
          if (/^\d+$/.test(numPrefix)) {
            winPhysDiskRates.set(`disknum:${numPrefix}`, {
              readBytesPerSec: rRate,
              writeBytesPerSec: wRate,
              rawName: name,
            });
          }
          const letterMatches = name.match(/[A-Z]:/gi) || [];
          for (const letter of letterMatches) {
            winPhysDiskRates.set(letter.toUpperCase(), {
              readBytesPerSec: rRate,
              writeBytesPerSec: wRate,
            });
          }
        }
      }
      if (winTotalDiskRead === null && winPhysDiskRates.size > 0) {
        let sumR = 0;
        let sumW = 0;
        let hasR = false;
        let hasW = false;
        for (const [k, v] of winPhysDiskRates.entries()) {
          if (!k.startsWith('disknum:') && !/^[A-Z]:$/i.test(k)) {
            if (v.readBytesPerSec !== null) {
              sumR += v.readBytesPerSec;
              hasR = true;
            }
            if (v.writeBytesPerSec !== null) {
              sumW += v.writeBytesPerSec;
              hasW = true;
            }
          }
        }
        if (hasR) winTotalDiskRead = sumR;
        if (hasW) winTotalDiskWrite = sumW;
      }
    }

    // si.fsStats() returns real bytes/sec (rx_sec, wx_sec) on Linux/macOS — NEVER use disksIO() (which returns IOPS!)
    const fsReadRate =
      toFiniteNumber(fsStatsRes?.rx_sec) !== null && fsStatsRes.rx_sec >= 0
        ? fsStatsRes.rx_sec
        : null;
    const fsWriteRate =
      toFiniteNumber(fsStatsRes?.wx_sec) !== null && fsStatsRes.wx_sec >= 0
        ? fsStatsRes.wx_sec
        : null;

    const cleanFsList = fsList.filter((vol) => {
      if (!vol || !vol.size || vol.size <= 0) return false;
      const mount = String(vol.mount || '');
      const fsType = String(vol.type || '').toLowerCase();
      if (isLinux) {
        if (
          fsType === 'squashfs' ||
          fsType === 'tmpfs' ||
          fsType === 'devtmpfs' ||
          (fsType === 'overlay' && mount !== '/') ||
          mount.startsWith('/snap') ||
          mount.startsWith('/boot/efi')
        ) {
          return false;
        }
      }
      return true;
    });

    const storage = cleanFsList.map((vol, idx) => {
      const mount = vol.mount ? String(vol.mount) : null;
      const fsName = vol.fs ? String(vol.fs) : mount || `Drive ${idx + 1}`;
      const upperDriveKey = mount && /^[A-Za-z]:/.test(mount) ? mount.slice(0, 2).toUpperCase() : null;
      const winDiskMeta = upperDriveKey ? profile.winDriveLetterToDisk.get(upperDriveKey) : null;

      let matchedLayout = null;
      if (layoutList.length === 1 && !fsName.startsWith('//')) {
        matchedLayout = layoutList[0];
      } else if (winDiskMeta?.model) {
        matchedLayout =
          layoutList.find(
            (d) =>
              d?.name &&
              String(d.name).toLowerCase().includes(winDiskMeta.model.toLowerCase())
          ) || null;
      } else if (fsName.startsWith('/dev/')) {
        const baseDev = fsName.replace(/p?\d+$/, '');
        matchedLayout =
          layoutList.find((d) => d?.device && baseDev === String(d.device)) || null;
      }

      const totalBytes = toFiniteNumber(vol.size);
      const usedBytes = toFiniteNumber(vol.used);
      const freeBytes =
        toFiniteNumber(vol.available) ??
        (totalBytes !== null && usedBytes !== null ? Math.max(0, totalBytes - usedBytes) : null);
      const usagePercent =
        totalBytes && usedBytes !== null && totalBytes > 0
          ? Number(((usedBytes / totalBytes) * 100).toFixed(1))
          : toFiniteNumber(vol.use);

      let driveRead = null;
      let driveWrite = null;

      if (isWindows) {
        const perDiskWinRates =
          (upperDriveKey && winPhysDiskRates.get(upperDriveKey)) ||
          (winDiskMeta?.diskNumber && winPhysDiskRates.get(`disknum:${winDiskMeta.diskNumber}`)) ||
          null;
        driveRead =
          perDiskWinRates?.readBytesPerSec ??
          (cleanFsList.length === 1 ? winTotalDiskRead : null);
        driveWrite =
          perDiskWinRates?.writeBytesPerSec ??
          (cleanFsList.length === 1 ? winTotalDiskWrite : null);
      } else if (isLinux) {
        const devShort = fsName.startsWith('/dev/') ? fsName.slice(5) : null;
        const devBase = devShort ? devShort.replace(/p?\d+$/, '') : null;
        const matchedDevRate =
          (devShort && linuxPerDevRates.get(devShort)) ||
          (devBase && linuxPerDevRates.get(devBase)) ||
          null;
        if (matchedDevRate) {
          driveRead = matchedDevRate.readBytesPerSec;
          driveWrite = matchedDevRate.writeBytesPerSec;
        } else if (cleanFsList.length === 1) {
          driveRead = fsReadRate;
          driveWrite = fsWriteRate;
        }
      } else if (cleanFsList.length === 1) {
        driveRead = fsReadRate;
        driveWrite = fsWriteRate;
      }

      const rawTemp = toFiniteNumber(matchedLayout?.temperature);

      return {
        id: `drive-${idx}-${fsName.replace(/[^a-zA-Z0-9]+/g, '-')}`,
        name: upperDriveKey ? `${upperDriveKey} (${mount})` : mount || fsName,
        model: winDiskMeta?.model || sanitizeLabel(matchedLayout?.name),
        mount,
        driveType:
          winDiskMeta?.driveType ||
          normalizeDriveType(
            matchedLayout?.type,
            matchedLayout?.interfaceType,
            winDiskMeta?.model || matchedLayout?.name
          ),
        totalBytes,
        usedBytes,
        freeBytes,
        usagePercent,
        readBytesPerSec: driveRead,
        writeBytesPerSec: driveWrite,
        temperatureCelsius: rawTemp !== null && rawTemp > 0 && rawTemp < 110 ? rawTemp : null,
      };
    });

    if (storage.length === 0 && layoutList.length > 0) {
      layoutList.forEach((d, idx) => {
        const rawTemp = toFiniteNumber(d?.temperature);
        const devShort = d?.device ? String(d.device).replace(/^\/dev\//, '') : null;
        const devRate = devShort ? linuxPerDevRates.get(devShort) : null;
        storage.push({
          id: `phys-disk-${idx}`,
          name: d?.device || `Disk ${idx + 1}`,
          model: sanitizeLabel(d?.name),
          mount: null,
          driveType: normalizeDriveType(d?.type, d?.interfaceType, d?.name),
          totalBytes: toFiniteNumber(d?.size),
          usedBytes: null,
          freeBytes: null,
          usagePercent: null,
          readBytesPerSec:
            devRate?.readBytesPerSec ?? (layoutList.length === 1 ? fsReadRate ?? winTotalDiskRead : null),
          writeBytesPerSec:
            devRate?.writeBytesPerSec ?? (layoutList.length === 1 ? fsWriteRate ?? winTotalDiskWrite : null),
          temperatureCelsius: rawTemp !== null && rawTemp > 0 && rawTemp < 110 ? rawTemp : null,
        });
      });
    }

    const totalStorageBytes = storage.reduce((acc, d) => acc + (d.totalBytes || 0), 0) || null;
    const usedStorageBytes = storage.some((d) => d.usedBytes !== null)
      ? storage.reduce((acc, d) => acc + (d.usedBytes || 0), 0)
      : null;
    const freeStorageBytes = storage.some((d) => d.freeBytes !== null)
      ? storage.reduce((acc, d) => acc + (d.freeBytes || 0), 0)
      : null;
    const storageUsagePercent =
      totalStorageBytes && usedStorageBytes !== null && totalStorageBytes > 0
        ? Number(((usedStorageBytes / totalStorageBytes) * 100).toFixed(1))
        : null;

    // --- 5. Network Metrics (Zero-spawn on Linux, single-query deltas on Windows) ---
    const netIfaceList = Array.isArray(netIfacesRes) ? netIfacesRes : [];
    const netIfaceMap = new Map();
    for (const nif of netIfaceList) {
      if (!nif?.iface || isLoopbackIface(nif.iface)) continue;
      netIfaceMap.set(nif.iface, nif);
    }

    let interfaces = [];
    if (isLinux) {
      const candidateNames = Array.from(netIfaceMap.keys());
      const linuxStats = await readLinuxNetStatsAsync(candidateNames);
      interfaces = linuxStats.map((st) => {
        const meta = netIfaceMap.get(st.iface);
        const prev = prevNetBytes.get(st.iface);
        let dl = null;
        let ul = null;
        if (prev && sampleTimestamp > prev.at) {
          const dtSec = (sampleTimestamp - prev.at) / 1000;
          if (dtSec > 0.05) {
            if (st.rxBytes >= prev.rxBytes) dl = (st.rxBytes - prev.rxBytes) / dtSec;
            if (st.txBytes >= prev.txBytes) ul = (st.txBytes - prev.txBytes) / dtSec;
          }
        }
        prevNetBytes.set(st.iface, {
          rxBytes: st.rxBytes,
          txBytes: st.txBytes,
          at: sampleTimestamp,
        });
        return {
          iface: st.iface,
          displayName: meta?.ifaceName || st.iface,
          type: sanitizeLabel(meta?.type),
          operstate: st.operstate || meta?.operstate || (st.rxBytes > 0 || st.txBytes > 0 ? 'up' : null),
          downloadBytesPerSec: dl !== null && dl >= 0 ? dl : null,
          uploadBytesPerSec: ul !== null && ul >= 0 ? ul : null,
          totalRxBytes: st.rxBytes,
          totalTxBytes: st.txBytes,
          speedMbps: toFiniteNumber(meta?.speed) && meta.speed > 0 ? meta.speed : null,
          isActive: Boolean(meta?.default) || st.operstate === 'up' || st.rxBytes > 0 || st.txBytes > 0,
        };
      });
    } else if (isWindows) {
      const winNetArr = Array.isArray(winPerfRes?.netStats)
        ? winPerfRes.netStats
        : winPerfRes?.netStats
        ? [winPerfRes.netStats]
        : [];
      for (const st of winNetArr) {
        const name = sanitizeLabel(st?.Name);
        if (!name || isLoopbackIface(name)) continue;
        const rxBytes = toFiniteNumber(st?.ReceivedBytes);
        const txBytes = toFiniteNumber(st?.SentBytes);
        if (rxBytes === null || txBytes === null) continue;

        const meta =
          netIfaceMap.get(name) ||
          netIfaceList.find(
            (n) =>
              n?.ifaceName &&
              st?.InterfaceDescription &&
              n.ifaceName.toLowerCase() === String(st.InterfaceDescription).toLowerCase()
          );

        const prev = prevNetBytes.get(name);
        let dl = null;
        let ul = null;
        if (prev && sampleTimestamp > prev.at) {
          const dtSec = (sampleTimestamp - prev.at) / 1000;
          if (dtSec > 0.05) {
            if (rxBytes >= prev.rxBytes) dl = (rxBytes - prev.rxBytes) / dtSec;
            if (txBytes >= prev.txBytes) ul = (txBytes - prev.txBytes) / dtSec;
          }
        }
        prevNetBytes.set(name, { rxBytes, txBytes, at: sampleTimestamp });

        const operstate = meta?.operstate || (rxBytes > 0 || txBytes > 0 ? 'up' : 'down');
        interfaces.push({
          iface: name,
          displayName: sanitizeLabel(st?.InterfaceDescription) || meta?.ifaceName || name,
          type: meta?.type ? String(meta.type) : null,
          operstate,
          downloadBytesPerSec: dl !== null && dl >= 0 ? dl : null,
          uploadBytesPerSec: ul !== null && ul >= 0 ? ul : null,
          totalRxBytes: rxBytes,
          totalTxBytes: txBytes,
          speedMbps: toFiniteNumber(meta?.speed) && meta.speed > 0 ? meta.speed : null,
          isActive: Boolean(meta?.default) || operstate === 'up',
        });
      }
    } else {
      const netStatsList = Array.isArray(darwinNetStatsRes) ? darwinNetStatsRes : [];
      interfaces = netStatsList
        .filter((st) => st?.iface && !isLoopbackIface(st.iface))
        .map((st) => {
          const meta = netIfaceMap.get(st.iface);
          const dl = toFiniteNumber(st.rx_sec);
          const ul = toFiniteNumber(st.tx_sec);
          return {
            iface: st.iface,
            displayName: meta?.ifaceName || st.iface,
            type: meta?.type ? String(meta.type) : null,
            operstate: st.operstate || meta?.operstate || null,
            downloadBytesPerSec: dl !== null && dl >= 0 ? dl : null,
            uploadBytesPerSec: ul !== null && ul >= 0 ? ul : null,
            totalRxBytes: toFiniteNumber(st.rx_bytes),
            totalTxBytes: toFiniteNumber(st.tx_bytes),
            speedMbps: toFiniteNumber(meta?.speed) && meta.speed > 0 ? meta.speed : null,
            isActive: Boolean(meta?.default) || st.operstate === 'up',
          };
        });
    }

    let activeInterface = null;
    if (interfaces.length > 0) {
      activeInterface =
        interfaces.find((item) => {
          const meta = netIfaceMap.get(item.iface);
          return Boolean(meta?.default);
        }) ||
        interfaces
          .filter((item) => item.operstate === 'up')
          .sort(
            (a, b) =>
              (b.downloadBytesPerSec || 0) +
              (b.uploadBytesPerSec || 0) -
              ((a.downloadBytesPerSec || 0) + (a.uploadBytesPerSec || 0))
          )[0] ||
        interfaces[0];
    }

    const totalDownloadBytesPerSec = interfaces.some((i) => i.downloadBytesPerSec !== null)
      ? interfaces.reduce((acc, i) => acc + (i.downloadBytesPerSec || 0), 0)
      : null;
    const totalUploadBytesPerSec = interfaces.some((i) => i.uploadBytesPerSec !== null)
      ? interfaces.reduce((acc, i) => acc + (i.uploadBytesPerSec || 0), 0)
      : null;

    // --- 6. Universal Tech Adapters, Display/Gaming Quality & Laptop Battery/Power (Throttled cache 12s) ---
    if (!cachedDisplayLaptop || sampleTimestamp - lastDisplayLaptopAt >= 12000) {
      cachedDisplayLaptop = await displayLaptopAdapter
        .collectDisplayAndLaptopInfo({ gpus })
        .catch(() => cachedDisplayLaptop);
      lastDisplayLaptopAt = sampleTimestamp;
    }

    if (nvidiaSmiPath && (!cachedNvidiaExt || sampleTimestamp - lastNvidiaExtAt >= 30000)) {
      cachedNvidiaExt = await queryNvidiaExtendedInfo(nvidiaSmiPath).catch(() => cachedNvidiaExt);
      lastNvidiaExtAt = sampleTimestamp;
    }

    const gpuTechnologies = gpus.map((gpu) => {
      const mfgLower = String(gpu.manufacturer || '').toLowerCase();
      const drvMap = cachedDisplayLaptop?.gpuDriversByModel;
      const winDrv = gpu.model && drvMap ? drvMap.get(String(gpu.model).toLowerCase()) || null : null;

      if (mfgLower.includes('nvidia')) {
        return buildNvidiaProfile({
          gpu: { ...gpu, driverVersion: winDrv },
          extendedInfo: cachedNvidiaExt,
          displayInfo: cachedDisplayLaptop,
        });
      }
      if (mfgLower.includes('amd') || mfgLower.includes('radeon')) {
        return buildAmdProfile({
          gpu,
          displayInfo: cachedDisplayLaptop,
          driverVersion: winDrv,
        });
      }
      if (mfgLower.includes('intel')) {
        return buildIntelProfile({
          gpu,
          driverVersion: winDrv,
        });
      }
      return {
        gpuId: gpu.id,
        model: gpu.model,
        vendor: gpu.manufacturer || 'Graphics',
        architecture: null,
        driverVersion: winDrv,
        resizableBarActive: null,
        isIntegrated: false,
        features: [],
      };
    });

    const snapshot = {
      timestamp: sampleTimestamp,
      platform: profile.platform,
      hostname: profile.hostname,
      uptimeSeconds: Math.floor(os.uptime()),
      isMonitoring,
      intervalMs,
      cpu: {
        model: profile.cpu.model,
        manufacturer: profile.cpu.manufacturer,
        series: profile.cpu.series,
        generation: profile.cpu.generation,
        usagePercent: cpuUsage,
        temperatureCelsius: cpuTempC,
        clockSpeedGhz: cpuClockGhz,
        physicalCores: profile.cpu.physicalCores,
        logicalThreads: profile.cpu.logicalThreads,
        powerWatts: cpuPowerWatts,
        voltageVolts: cpuVoltageVolts,
        coreLoads,
      },
      gpus,
      ram: {
        totalBytes: totalRam,
        usedBytes: usedRam,
        availableBytes: availableRam,
        usagePercent: ramUsagePercent,
        memoryType: profile.ram.memoryType,
        speedMhz: profile.ram.speedMhz,
        populatedSlots: profile.ram.populatedSlots,
        channelMode: profile.ram.channelMode,
      },
      storage,
      storageTotals: {
        totalBytes: totalStorageBytes,
        usedBytes: usedStorageBytes,
        freeBytes: freeStorageBytes,
        usagePercent: storageUsagePercent,
        readBytesPerSec: isWindows ? winTotalDiskRead : fsReadRate,
        writeBytesPerSec: isWindows ? winTotalDiskWrite : fsWriteRate,
      },
      network: {
        activeInterface,
        interfaces,
        totalDownloadBytesPerSec,
        totalUploadBytesPerSec,
      },
      liveSensors: {
        fans: winSensorsBundle.fans || [],
        extraTemps: winSensorsBundle.extraTemps || [],
        source: profile.winFeatures?.hasLhm
          ? 'LibreHardwareMonitor WMI'
          : usedDirectLhm
          ? 'LibreHardwareMonitorLib (Direct)'
          : profile.winFeatures?.hasOhm
          ? 'OpenHardwareMonitor WMI'
          : null,
      },
      capabilities: {
        gpuTechnologies,
        display: cachedDisplayLaptop
          ? {
              monitors: cachedDisplayLaptop.monitors,
              primaryMonitor: cachedDisplayLaptop.primaryMonitor,
              activeRenderingGpu: cachedDisplayLaptop.activeRenderingGpu,
              directXVersion: cachedDisplayLaptop.directXVersion,
              hagsStatus: cachedDisplayLaptop.hagsStatus,
              windowsGameMode: cachedDisplayLaptop.windowsGameMode,
              hdrSupported: cachedDisplayLaptop.hdrSupported,
              hdrActive: cachedDisplayLaptop.hdrActive,
              vrrSupported: cachedDisplayLaptop.vrrSupported,
              vrrActive: cachedDisplayLaptop.vrrActive,
            }
          : null,
        laptop: cachedDisplayLaptop?.laptop || null,
      },
    };

    lastSnapshot = snapshot;
    lastSampleDurationMs = Number((Number(process.hrtime.bigint() - sampleStartNs) / 1e6).toFixed(1));
    if (typeof onSnapshot === 'function') {
      try {
        onSnapshot(snapshot);
      } catch {
        // ignore callback error
      }
    }
    return snapshot;
  }

  function emitSnapshot(snapshot) {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('hardware:update', snapshot);
    }
  }

  async function sampleAndEmit(expectedToken = sessionToken) {
    if (!isMonitoring || isSampling || expectedToken !== sessionToken) return;
    isSampling = true;
    try {
      const snap = await collectSnapshot();
      if (isMonitoring && expectedToken === sessionToken) {
        emitSnapshot(snap);
      }
    } catch {
      // Ignore transient telemetry read errors safely
    } finally {
      isSampling = false;
      if (pendingImmediateSample && isMonitoring) {
        pendingImmediateSample = false;
        void sampleAndEmit(sessionToken);
      } else {
        pendingImmediateSample = false;
      }
    }
  }

  function clearPollTimer() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function clampInterval(nextMs) {
    const num = Number(nextMs);
    if (!Number.isFinite(num)) return intervalMs;
    return Math.min(10000, Math.max(1000, Math.round(num)));
  }

  async function start(nextIntervalMs) {
    if (nextIntervalMs !== undefined) {
      intervalMs = clampInterval(nextIntervalMs);
    }
    sessionToken += 1;
    const myToken = sessionToken;
    isMonitoring = true;
    pausedByHide = false;
    clearPollTimer();
    pollTimer = setInterval(() => {
      void sampleAndEmit(sessionToken);
    }, intervalMs);

    if (!isSampling) {
      isSampling = true;
      try {
        const snap = await collectSnapshot();
        if (isMonitoring && myToken === sessionToken) {
          emitSnapshot(snap);
          return snap;
        }
        return lastSnapshot ? { ...lastSnapshot, isMonitoring, intervalMs } : null;
      } finally {
        isSampling = false;
        if (pendingImmediateSample && isMonitoring) {
          pendingImmediateSample = false;
          void sampleAndEmit(sessionToken);
        }
      }
    }

    pendingImmediateSample = true;
    return lastSnapshot ? { ...lastSnapshot, isMonitoring: true, intervalMs } : null;
  }

  function stop() {
    sessionToken += 1;
    isMonitoring = false;
    pausedByHide = false;
    pendingImmediateSample = false;
    clearPollTimer();
    if (lastSnapshot) {
      lastSnapshot = { ...lastSnapshot, isMonitoring: false, intervalMs };
    }
    return { ok: true, isMonitoring: false };
  }

  function pauseForHidden() {
    if (!pauseOnMinimize || !isMonitoring) return;
    sessionToken += 1;
    isMonitoring = false;
    pausedByHide = true;
    pendingImmediateSample = false;
    clearPollTimer();
  }

  function resumeFromHidden() {
    if (!pausedByHide) return;
    void start(intervalMs);
  }

  function setIntervalMs(nextIntervalMs) {
    intervalMs = clampInterval(nextIntervalMs);
    if (isMonitoring) {
      clearPollTimer();
      pollTimer = setInterval(() => {
        void sampleAndEmit(sessionToken);
      }, intervalMs);
    }
    return { ok: true, intervalMs };
  }

  function setPerformanceConfig(cfg = {}) {
    if (!cfg || typeof cfg !== 'object') return getRuntimeStats();
    if (typeof cfg.pauseOnMinimize === 'boolean') {
      pauseOnMinimize = cfg.pauseOnMinimize;
    }
    if (cfg.intervalMs !== undefined) {
      setIntervalMs(cfg.intervalMs);
    }
    return getRuntimeStats();
  }

  function getRuntimeStats() {
    return {
      isMonitoring,
      pausedByHide,
      pauseOnMinimize,
      intervalMs,
      lastSampleDurationMs,
      cachedStaticProfile: Boolean(staticProfile),
    };
  }

  async function getSnapshot() {
    if (lastSnapshot && Date.now() - lastSnapshot.timestamp < 700) {
      return { ...lastSnapshot, isMonitoring, intervalMs };
    }
    if (isSampling && lastSnapshot) {
      return { ...lastSnapshot, isMonitoring, intervalMs };
    }
    isSampling = true;
    try {
      return await collectSnapshot();
    } finally {
      isSampling = false;
    }
  }

  function shutdown() {
    stop();
  }

  function registerIpc(ipcMain, isTrustedSender) {
    ipcMain.handle('hardware:get-snapshot', async (event) => {
      if (!isTrustedSender(event)) return null;
      return getSnapshot();
    });

    ipcMain.handle('hardware:start', async (event, requestedIntervalMs) => {
      if (!isTrustedSender(event)) return null;
      return start(requestedIntervalMs);
    });

    ipcMain.handle('hardware:stop', (event) => {
      if (!isTrustedSender(event)) return { ok: false, isMonitoring: false };
      return stop();
    });

    ipcMain.handle('hardware:set-interval', (event, requestedIntervalMs) => {
      if (!isTrustedSender(event)) return { ok: false, intervalMs };
      return setIntervalMs(requestedIntervalMs);
    });
  }

  return {
    registerIpc,
    getSnapshot,
    getLastSnapshot: () => lastSnapshot,
    start,
    stop,
    pauseForHidden,
    resumeFromHidden,
    isActive: () => isMonitoring,
    setIntervalMs,
    setPerformanceConfig,
    getRuntimeStats,
    shutdown,
  };
}

module.exports = {
  createHardwareMonitor,
  // Pure helpers exported for automated verification & unit testing
  toFiniteNumber,
  sanitizeLabel,
  normalizeManufacturer,
  normalizeDriveType,
  parseNvidiaSmiCsv,
  isCpuThermalZoneLabel,
  pickCpuThermalZoneTemp,
  parseWindowsGpuPerfByLuid,
  extractWindowsSensorReadings,
  scoreGpuForOrdering,
  parseLinuxDiskstats,
  computeCpuLoadFromOsCpus,
};
