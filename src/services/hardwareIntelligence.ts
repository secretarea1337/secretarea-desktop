import type {
  BenchmarkMetricResult,
  DeepHardwareInventory,
  FutureTargetYear,
  GameItem,
  HardwareDbCategory,
  HardwareDbEntry,
  HardwareMonitorSnapshot,
  HealthAssessmentReport,
  HealthComponentScore,
  WorkloadProfileId,
} from '../types';
import { BUNDLED_HARDWARE_DATABASE } from '../data/hardwareDatabase';
import { evaluateCanRunGame, type CanRunEvaluation } from './canRunIt';
import { selectPrimaryGpu } from './hardwareMonitor';
import type { SystemHardwareSpecs } from './systemSpecs';

function resolvePrimaryGpus(
  snapshot: HardwareMonitorSnapshot,
  inventory: DeepHardwareInventory
) {
  const discreteInv = inventory.gpus.find((g) => !g.isIntegrated) || null;
  const firstInv = discreteInv || inventory.gpus[0] || null;
  const bestSnap = selectPrimaryGpu(snapshot.gpus);
  const snapIsIntegrated = bestSnap
    ? /\b(?:uhd|hd\s*graphics|iris|vega\s*\d+|radeon\(tm\)\s*graphics|radeon\s*graphics)\b/i.test(
        bestSnap.model || ''
      )
    : false;
  const chosenModel =
    discreteInv && (!bestSnap || snapIsIntegrated)
      ? discreteInv.model
      : bestSnap?.model || firstInv?.model || null;
  const matchingSnapByDiscrete =
    discreteInv
      ? snapshot.gpus.find(
          (g) => g.model && discreteInv.model && g.model.toLowerCase() === discreteInv.model.toLowerCase()
        ) || bestSnap
      : bestSnap;
  const vramTotalMB = matchingSnapByDiscrete?.vramTotalMB || firstInv?.vramMB || null;
  return {
    primarySnapshotGpu: matchingSnapByDiscrete,
    primaryInventoryGpu: firstInv,
    primaryGpuModel: chosenModel,
    vramTotalMB,
    isDiscreteGpu:
      Boolean(discreteInv) ||
      Boolean(chosenModel && /(rtx|gtx|rx\s*\d{3,4}|radeon\s*pro|arc\s*[ab]\d{3}|quadro)/i.test(chosenModel)),
  };
}

const WORKLOAD_STORAGE_KEY = 'secretarea.hw.workloadProfile';
const PSU_STORAGE_KEY = 'secretarea.hw.userPsuWatts';

export function loadWorkloadProfile(): WorkloadProfileId {
  if (typeof window === 'undefined') return 'gaming';
  try {
    const val = window.localStorage.getItem(WORKLOAD_STORAGE_KEY) as WorkloadProfileId | null;
    const valid = new Set<WorkloadProfileId>([
      'gaming',
      'office',
      'programming',
      '3d_rendering',
      'video_editing',
      'graphic_design',
      'ai_ml',
      'professional',
      'mixed',
    ]);
    return val && valid.has(val) ? val : 'gaming';
  } catch {
    return 'gaming';
  }
}

export function saveWorkloadProfile(profile: WorkloadProfileId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WORKLOAD_STORAGE_KEY, profile);
  } catch {
    // ignore storage errors
  }
}

export function loadUserPsuWatts(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PSU_STORAGE_KEY);
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) && num >= 150 && num <= 2500 ? Math.round(num) : null;
  } catch {
    return null;
  }
}

export function saveUserPsuWatts(watts: number | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (watts === null || !Number.isFinite(watts) || watts < 150) {
      window.localStorage.removeItem(PSU_STORAGE_KEY);
    } else {
      window.localStorage.setItem(PSU_STORAGE_KEY, String(Math.round(watts)));
    }
  } catch {
    // ignore storage errors
  }
}

export function mergeHardwareDatabases(customEntries: HardwareDbEntry[]): HardwareDbEntry[] {
  if (!Array.isArray(customEntries) || customEntries.length === 0) {
    return BUNDLED_HARDWARE_DATABASE;
  }
  const byId = new Map<string, HardwareDbEntry>();
  for (const item of BUNDLED_HARDWARE_DATABASE) {
    byId.set(item.id, item);
  }
  for (const custom of customEntries) {
    byId.set(custom.id, custom);
  }
  return Array.from(byId.values());
}

export function matchHardwareDbEntry(
  query: string | null | undefined,
  category: HardwareDbCategory,
  dbEntries: HardwareDbEntry[]
): HardwareDbEntry | null {
  if (!query || !query.trim()) return null;
  const text = query.trim();
  const candidates = dbEntries.filter((e) => e.category === category);
  for (const entry of candidates) {
    for (const pat of entry.matchPatterns) {
      try {
        const re = new RegExp(pat, 'i');
        if (re.test(text)) {
          return entry;
        }
      } catch {
        if (text.toLowerCase().includes(pat.toLowerCase())) {
          return entry;
        }
      }
    }
  }
  return null;
}

export function computeHealthAssessment(params: {
  snapshot: HardwareMonitorSnapshot;
  inventory: DeepHardwareInventory;
  workload: WorkloadProfileId;
  dbEntries: HardwareDbEntry[];
  userPsuWatts: number | null;
}): HealthAssessmentReport {
  const { snapshot, inventory, workload, dbEntries, userPsuWatts } = params;

  const cpuName = inventory.cpu.model || snapshot.cpu.model;
  const gpuSel = resolvePrimaryGpus(snapshot, inventory);
  const primaryGpuObj = gpuSel.primarySnapshotGpu;
  const gpuName = gpuSel.primaryGpuModel;
  const isDiscreteGpu = gpuSel.isDiscreteGpu;

  const cpuDb = matchHardwareDbEntry(cpuName, 'cpu', dbEntries);
  const gpuDb = matchHardwareDbEntry(gpuName, 'gpu', dbEntries);
  const ramTypeStr = snapshot.ram.memoryType || inventory.memory.modules.find((m) => m.memoryType)?.memoryType || null;
  const ramDb = matchHardwareDbEntry(ramTypeStr, 'ram', dbEntries);
  const primaryDiskType = inventory.storage[0]?.mediaType || snapshot.storage[0]?.driveType || null;
  const storageDb = matchHardwareDbEntry(primaryDiskType, 'storage', dbEntries);

  const totalRamBytes = inventory.memory.totalBytes || snapshot.ram.totalBytes || 0;
  const totalRamGb = totalRamBytes > 0 ? Math.round(totalRamBytes / (1024 ** 3)) : null;
  const vramMb = gpuSel.vramTotalMB;
  const vramGb = vramMb && vramMb > 0 ? Number((vramMb / 1024).toFixed(1)) : null;

  // --- Physical Health Component Scores (Strictly measured or marked unavailable) ---
  const componentScores: HealthComponentScore[] = [];

  // 1. Storage SMART Health
  const smartDrives = inventory.storage.filter((d) => d.smartAvailable);
  if (smartDrives.length > 0) {
    const worstWear = Math.max(...smartDrives.map((d) => d.wearPercent ?? 0));
    const hasCrit = smartDrives.some((d) => d.smartHealthStatus === 'critical');
    const hasWarn = smartDrives.some((d) => d.smartHealthStatus === 'warning');
    const avgLife = Math.round(
      smartDrives.reduce((acc, d) => acc + (d.remainingLifePercent ?? 95), 0) / smartDrives.length
    );
    const score = hasCrit ? Math.min(45, avgLife) : hasWarn ? Math.min(72, avgLife) : avgLife;
    componentScores.push({
      id: 'storage',
      label: 'Storage (SMART)',
      score,
      status: hasCrit ? 'critical' : hasWarn ? 'warning' : 'healthy',
      summary: `${smartDrives.length}/${inventory.storage.length} drive(s) with SMART telemetry; max flash wear ${worstWear}%.`,
      provenance: 'measured',
    });
  } else {
    componentScores.push({
      id: 'storage',
      label: 'Storage (SMART)',
      score: null,
      status: 'unavailable',
      summary:
        inventory.storage.length > 0
          ? 'Drive detected, but SMART wear/error counters were not exposed by controller (never assumed healthy).'
          : 'No drive SMART telemetry accessible.',
      provenance: 'sensor_unavailable',
    });
  }

  // 2. Thermals
  const cpuTemp = snapshot.cpu.temperatureCelsius;
  const gpuTemp = primaryGpuObj?.temperatureCelsius ?? null;
  const maxDriveTemp = inventory.storage.reduce((m, d) => Math.max(m, d.temperatureC || 0), 0) || null;
  const measuredTemps = [cpuTemp, gpuTemp, maxDriveTemp].filter((t): t is number => typeof t === 'number' && t > 0);
  if (measuredTemps.length > 0) {
    const peakT = Math.max(...measuredTemps);
    const score = peakT >= 92 ? 35 : peakT >= 85 ? 60 : peakT >= 75 ? 80 : 96;
    componentScores.push({
      id: 'thermals',
      label: 'Thermals',
      score,
      status: peakT >= 92 ? 'critical' : peakT >= 83 ? 'warning' : peakT >= 75 ? 'fair' : 'healthy',
      summary: `Peak measured sensor temperature ${Math.round(peakT)}°C.`,
      provenance: 'measured',
    });
  } else {
    componentScores.push({
      id: 'thermals',
      label: 'Thermals',
      score: null,
      status: 'unavailable',
      summary: 'Temperature sensors unavailable in current environment.',
      provenance: 'sensor_unavailable',
    });
  }

  // 3. Fans & Cooling
  if (inventory.fans.items.length > 0) {
    const abnormal = inventory.fans.items.some((f) => f.status === 'abnormal_rpm');
    const allZero = inventory.fans.items.every((f) => f.status === 'stopped_confirmed');
    const score = abnormal ? 55 : allZero && (cpuTemp || 0) > 65 ? 45 : 95;
    componentScores.push({
      id: 'cooling',
      label: 'Fans & Cooling',
      score,
      status: abnormal ? 'warning' : allZero && (cpuTemp || 0) > 65 ? 'critical' : 'healthy',
      summary: `${inventory.fans.runningCount} running / ${inventory.fans.totalDetectedCount} detected fan sensor(s).`,
      provenance: 'measured',
    });
  } else {
    componentScores.push({
      id: 'cooling',
      label: 'Fans & Cooling',
      score: null,
      status: 'unavailable',
      summary: 'No fan RPM sensors exposed (requires LibreHardwareMonitor WMI on Windows or hwmon on Linux).',
      provenance: 'sensor_unavailable',
    });
  }

  // 4. Memory Pressure
  const ramPct = snapshot.ram.usagePercent;
  if (typeof ramPct === 'number') {
    const score = ramPct >= 94 ? 58 : ramPct >= 85 ? 78 : 96;
    componentScores.push({
      id: 'ram',
      label: 'Memory Pressure',
      score,
      status: ramPct >= 94 ? 'warning' : ramPct >= 85 ? 'fair' : 'healthy',
      summary: `${Math.round(ramPct)}% RAM currently allocated${totalRamGb ? ` of ${totalRamGb} GB` : ''}.`,
      provenance: 'measured',
    });
  } else {
    componentScores.push({
      id: 'ram',
      label: 'Memory Pressure',
      score: null,
      status: 'unavailable',
      summary: 'Live memory pressure requires Desktop mode.',
      provenance: 'sensor_unavailable',
    });
  }

  // 5. System Stability (PnP + Event Log)
  if (inventory.sourceMode === 'desktop_ipc') {
    const pnpCount = inventory.diagnosticEvents.pnpErrors.length;
    const wheaOrDiskCrit = inventory.diagnosticEvents.eventLogWarnings.filter(
      (e) => e.category === 'whea' || e.category === 'disk' || e.level === 'Critical'
    ).length;
    const score = Math.max(25, 100 - pnpCount * 12 - wheaOrDiskCrit * 15);
    componentScores.push({
      id: 'stability',
      label: 'Hardware Stability & Drivers',
      score,
      status: score < 55 ? 'critical' : score < 80 ? 'warning' : 'healthy',
      summary:
        pnpCount === 0 && wheaOrDiskCrit === 0
          ? 'No Device Manager error codes or critical WHEA/disk logs in last 14 days.'
          : `${pnpCount} Device Manager issue(s), ${wheaOrDiskCrit} critical/WHEA/disk event(s).`,
      provenance: 'detected',
    });
  } else {
    componentScores.push({
      id: 'stability',
      label: 'Hardware Stability & Drivers',
      score: null,
      status: 'unavailable',
      summary: 'Device Manager and Event Viewer diagnostics require Desktop mode.',
      provenance: 'sensor_unavailable',
    });
  }

  // 6. Battery (if laptop)
  if (inventory.power.battery?.present) {
    const bh = inventory.power.battery.healthPercent;
    if (typeof bh === 'number') {
      componentScores.push({
        id: 'battery',
        label: 'Battery Health',
        score: bh,
        status: bh < 50 ? 'critical' : bh < 75 ? 'warning' : 'healthy',
        summary: `${bh}% capacity remaining vs design${inventory.power.battery.cycleCount !== null ? ` (${inventory.power.battery.cycleCount} cycles)` : ''}.`,
        provenance: 'measured',
      });
    } else {
      componentScores.push({
        id: 'battery',
        label: 'Battery Health',
        score: null,
        status: 'unavailable',
        summary: 'Battery present, full-charge capacity counters unavailable.',
        provenance: 'sensor_unavailable',
      });
    }
  }

  const measuredList = componentScores.filter((c) => typeof c.score === 'number');
  const overallPhysicalHealthScore =
    measuredList.length > 0
      ? Math.round(measuredList.reduce((acc, c) => acc + (c.score || 0), 0) / measuredList.length)
      : null;

  // --- Performance Capability Score (separate from Physical Health!) ---
  const cpuTier = cpuDb?.tierScore ?? (inventory.cpu.logicalThreads ? Math.min(820, 260 + inventory.cpu.logicalThreads * 26) : null);
  const gpuTier = gpuDb?.tierScore ?? (isDiscreteGpu ? 520 : gpuName ? 220 : null);
  const ramCapScore = totalRamGb ? Math.min(960, totalRamGb >= 64 ? 950 : totalRamGb >= 32 ? 860 : totalRamGb >= 16 ? 680 : totalRamGb >= 8 ? 420 : 220) : null;
  const storScore = storageDb?.tierScore ?? (inventory.storage.length > 0 ? 550 : null);

  let perfParts: number[] = [];
  if (workload === 'gaming' || workload === '3d_rendering' || workload === 'ai_ml') {
    if (gpuTier) perfParts.push(gpuTier, gpuTier);
    if (cpuTier) perfParts.push(cpuTier);
    if (ramCapScore) perfParts.push(ramCapScore);
  } else if (workload === 'programming' || workload === 'video_editing') {
    if (cpuTier) perfParts.push(cpuTier, cpuTier);
    if (ramCapScore) perfParts.push(ramCapScore, ramCapScore);
    if (gpuTier) perfParts.push(gpuTier);
    if (storScore) perfParts.push(storScore);
  } else {
    if (cpuTier) perfParts.push(cpuTier);
    if (ramCapScore) perfParts.push(ramCapScore);
    if (storScore) perfParts.push(storScore);
    if (gpuTier) perfParts.push(gpuTier);
  }

  const performanceCapabilityScore =
    perfParts.length > 0 ? Math.round(perfParts.reduce((a, b) => a + b, 0) / perfParts.length / 10) : null;

  // --- Age & Useful Life ---
  const years = [cpuDb?.releaseYear, gpuDb?.releaseYear, ramDb?.releaseYear].filter((y): y is number => typeof y === 'number');
  const oldestYear = years.length > 0 ? Math.min(...years) : null;
  const currentYear = 2026;
  const ageYears = oldestYear ? Math.max(0, currentYear - oldestYear) : null;
  const hardwareAgeLabel =
    ageYears === null
      ? 'Unknown Generation Age'
      : ageYears <= 2
      ? `Modern (${oldestYear}–${currentYear}, ~${ageYears} yrs old)`
      : ageYears <= 5
      ? `Mid-Cycle (${oldestYear}, ~${ageYears} yrs old)`
      : `Aging Generation (${oldestYear}, ~${ageYears} yrs old)`;

  const perfVal = performanceCapabilityScore ?? 50;
  const estimatedUsefulLifeRange =
    perfVal >= 80
      ? 'Strong runway through 2030+ for mainstream & demanding apps'
      : perfVal >= 60
      ? 'Practical through ~2028–2030 with selective upgrades/settings'
      : perfVal >= 40
      ? 'Practical through ~2026–2028 for light/everyday tasks'
      : 'Near practical upgrade horizon for modern gaming & heavy workloads';

  // --- Performance & Bottleneck Summary (never invent fake %) ---
  let primaryLimitingFactor = 'Balanced Configuration';
  let bottleneckExplanation = 'CPU, GPU, memory capacity, and storage appear balanced for your selected workload.';
  const onlyHddBoot = inventory.storage.length > 0 && inventory.storage.every((d) => d.mediaType === 'HDD');

  if (onlyHddBoot) {
    primaryLimitingFactor = 'Mechanical HDD Storage Speed';
    bottleneckExplanation = 'All detected physical drives are mechanical HDDs, which severely slows OS responsiveness, loading screens, and asset streaming.';
  } else if (totalRamGb !== null && totalRamGb <= 8) {
    primaryLimitingFactor = 'System RAM Capacity (<= 8 GB)';
    bottleneckExplanation = '8 GB or less system memory restricts modern multitasking, IDEs, browsers, and AAA textures, forcing frequent pagefile swapping.';
  } else if (!isDiscreteGpu && (workload === 'gaming' || workload === '3d_rendering' || workload === 'ai_ml')) {
    primaryLimitingFactor = 'Integrated GPU Compute & Shared Memory';
    bottleneckExplanation = `System relies on integrated graphics (${gpuName || 'iGPU'}) sharing system RAM, limiting 3D frame rates, ray tracing, and GPU compute.`;
  } else if (cpuTier && gpuTier && gpuTier - cpuTier > 220) {
    primaryLimitingFactor = 'CPU Single/Multi-Thread Pace vs GPU Tier';
    bottleneckExplanation = 'Your graphics processor sits significantly higher in tier than your CPU family, which can limit high-FPS esports or simulation-heavy games.';
  } else if (cpuTier && gpuTier && cpuTier - gpuTier > 220) {
    primaryLimitingFactor = 'GPU Rasterization / VRAM Headroom';
    bottleneckExplanation = 'Your CPU has substantial compute headroom relative to the GPU; 3D/gaming resolution and quality presets are primarily GPU-bound.';
  }

  // --- Gaming Suitability (720p / 1080p / 1440p / 4K) ---
  const gpuScore = gpuTier ?? 250;
  const isVramTight = vramGb !== null && vramGb <= 4;
  const isVramModest = vramGb !== null && vramGb <= 8;

  const gamingSuitability: HealthAssessmentReport['gamingSuitability'] = {
    resolutions: [
      {
        resolution: '720p',
        verdict: gpuScore >= 320 ? 'Strong' : gpuScore >= 200 ? 'Playable' : 'Not Ideal',
        recommendedPreset: gpuScore >= 450 ? 'High / Ultra' : 'Low–Medium + Upscaling',
        notes: gpuScore >= 320 ? 'Comfortable resolution for esports & modern engines.' : 'Viable with FSR/XeSS Performance on modern iGPUs.',
      },
      {
        resolution: '1080p',
        verdict: gpuScore >= 620 ? 'Strong' : gpuScore >= 420 ? 'Playable' : gpuScore >= 280 ? 'Entry / Upscaled' : 'Not Ideal',
        recommendedPreset: gpuScore >= 720 ? 'High–Ultra' : gpuScore >= 460 ? 'Medium–High + DLSS/FSR' : 'Low + Upscaling',
        notes: isVramTight ? '4 GB or less VRAM forces Low/Medium textures in recent AAA releases.' : 'Standard target for mainstream gaming.',
      },
      {
        resolution: '1440p',
        verdict: gpuScore >= 800 && !isVramModest ? 'Strong' : gpuScore >= 620 ? 'Playable' : gpuScore >= 450 ? 'Entry / Upscaled' : 'Not Ideal',
        recommendedPreset: gpuScore >= 820 ? 'High–Ultra' : 'Medium + DLSS/FSR Quality',
        notes: isVramModest ? '8 GB VRAM can limit Ultra textures or Ray Tracing at 1440p.' : 'Well suited for 1440p high-refresh gaming.',
      },
      {
        resolution: '4K',
        verdict: gpuScore >= 900 && (vramGb === null || vramGb >= 12) ? 'Strong' : gpuScore >= 760 ? 'Playable' : gpuScore >= 600 ? 'Entry / Upscaled' : 'Not Ideal',
        recommendedPreset: gpuScore >= 900 ? 'High + Upscaling' : 'Medium + Performance Upscaling',
        notes: 'Native 4K modern AAA games generally require 12–16 GB+ VRAM and upper-tier RTX 40/50 or RX 7000/9000 GPUs.',
      },
    ],
    featureMatrix: [
      {
        name: 'DirectX 12 Ultimate',
        status: gpuDb?.supportedTechnologies.some((x) => x.includes('Ultimate')) ? 'Supported' : snapshot.capabilities?.display?.directXVersion || 'Check GPU Generation',
        provenance: gpuDb ? 'manufacturer_spec' : 'estimated',
      },
      {
        name: 'Hardware Ray Tracing',
        status: gpuDb?.supportedTechnologies.some((x) => x.toLowerCase().includes('ray tracing')) ? 'Supported' : 'Not Supported / Software Only',
        provenance: gpuDb ? 'manufacturer_spec' : 'estimated',
      },
      {
        name: 'AI / Spatial Upscaling',
        status: gpuDb?.supportedTechnologies.find((x) => /dlss|fsr|xess/i.test(x)) || 'FSR (Shader-based)',
        provenance: gpuDb ? 'manufacturer_spec' : 'estimated',
      },
      {
        name: 'DirectStorage Readiness',
        status: inventory.storage.some((d) => d.mediaType === 'NVMe SSD') ? 'NVMe SSD Detected (Ready)' : 'SATA / HDD Detected (Limited)',
        provenance: 'detected',
      },
    ],
  };

  // --- Pro Software Compatibility ---
  const ramVal = totalRamGb ?? 0;
  const hasNvCuda = Boolean(primaryGpuObj?.manufacturer === 'NVIDIA' || /nvidia|geforce|rtx|gtx/i.test(gpuName || ''));
  const proCompatibility: HealthAssessmentReport['proCompatibility'] = [
    {
      workload: 'Office, Browsing & Productivity',
      verdict: ramVal >= 8 ? 'Excellent' : 'Basic',
      reason: ramVal >= 8 ? 'Ample RAM and modern multi-core execution for documents, video calls & heavy tabs.' : '8 GB or less tightens multi-tab browser usage.',
      limitingFactor: ramVal < 8 ? 'RAM <= 8 GB' : null,
    },
    {
      workload: 'Programming, Compilers & Containers/VMs',
      verdict: ramVal >= 32 && (cpuTier ?? 0) >= 650 ? 'Excellent' : ramVal >= 16 ? 'Good' : 'Limited',
      reason: `Virtualization firmware: ${inventory.cpu.virtualizationFirmwareEnabled === true ? 'Enabled' : inventory.cpu.virtualizationFirmwareEnabled === false ? 'Disabled in BIOS' : 'Unconfirmed'}.`,
      limitingFactor: ramVal < 16 ? 'Recommend 16–32 GB RAM for Docker/VMs' : null,
    },
    {
      workload: '1080p / 4K Video Editing',
      verdict: ramVal >= 32 && gpuScore >= 680 ? 'Excellent' : ramVal >= 16 && gpuScore >= 430 ? 'Good' : 'Basic',
      reason: gpuDb?.supportedTechnologies.some((x) => x.includes('AV1')) ? 'Hardware AV1/HEVC media engine accelerates timeline scrubbing.' : 'Lacks modern AV1 encode hardware.',
      limitingFactor: ramVal < 16 ? '16–32 GB RAM recommended for 4K timelines' : null,
    },
    {
      workload: '3D Modeling, CAD & GPU Rendering',
      verdict: isDiscreteGpu && gpuScore >= 720 && ramVal >= 16 ? 'Excellent' : isDiscreteGpu && gpuScore >= 450 ? 'Good' : 'Limited',
      reason: hasNvCuda ? 'NVIDIA CUDA/OptiX acceleration available for Blender/Unreal/CAD.' : isDiscreteGpu ? 'Discrete GPU supports Vulkan/OpenCL viewports.' : 'Integrated GPU lacks dedicated VRAM for complex 3D scenes.',
      limitingFactor: !isDiscreteGpu ? 'Dedicated GPU with 8+ GB VRAM' : null,
    },
    {
      workload: 'Local AI / ML Inference',
      verdict: hasNvCuda && (vramGb ?? 0) >= 12 ? 'Excellent' : hasNvCuda && (vramGb ?? 0) >= 8 ? 'Good' : 'Limited',
      reason: hasNvCuda ? `NVIDIA GPU (${vramGb ?? '?'} GB VRAM) supports CUDA/Tensor local models.` : 'Non-CUDA or shared-memory graphics rely primarily on CPU/system RAM or NPU.',
      limitingFactor: (vramGb ?? 0) < 8 ? '8–16 GB+ discrete VRAM needed for mid/large LLMs' : null,
    },
  ];

  // --- Smart Upgrade Advisor (Strictly compatibility-checked!) ---
  const upgradeRecommendations: HealthAssessmentReport['upgradeRecommendations'] = [];
  const isLaptop = inventory.system.formFactor === 'laptop' || inventory.system.formFactor === 'tablet_convertible';
  const allMemorySoldered =
    inventory.memory.modules.length > 0 && inventory.memory.modules.every((m) => m.isSolderedHint);
  const freeRamSlots =
    inventory.memory.slotsTotal !== null && inventory.memory.slotsUsed !== null
      ? Math.max(0, inventory.memory.slotsTotal - inventory.memory.slotsUsed)
      : null;

  if (totalRamGb !== null && totalRamGb < 32 && !allMemorySoldered) {
    const canAddToOpenSlot = freeRamSlots !== null && freeRamSlots > 0;
    const maxAllowed = inventory.motherboard.maxRamGB;
    if (!maxAllowed || maxAllowed >= 32) {
      upgradeRecommendations.push({
        id: 'upg-ram',
        priority: totalRamGb < 16 ? 'High' : 'Medium',
        component: 'System RAM',
        currentItem: `${totalRamGb} GB ${ramTypeStr || 'RAM'} (${inventory.memory.slotsUsed ?? '?'}/${inventory.memory.slotsTotal ?? '?'} slots used)`,
        recommendedUpgrade: canAddToOpenSlot
          ? `Add matching ${ramTypeStr || ''} ${inventory.memory.modules[0]?.formFactor || ''} module(s) to reach 32 GB`
          : `Replace existing kit with a 2×16 GB (32 GB) ${ramTypeStr || ''} dual-channel kit`,
        whyRecommended: 'Improves gaming 1% lows, eliminates background swap stutters, and keeps memory comfortable through 2030.',
        compatibilityVerified: Boolean(ramTypeStr && inventory.memory.slotsTotal),
        compatibilityNotes: `Verified ${ramTypeStr || 'board'} form factor (${inventory.memory.modules[0]?.formFactor || 'DIMM/SO-DIMM'})${maxAllowed ? ` within ${maxAllowed} GB board ceiling` : ''}.`,
        expectedBenefit: 'Faster multitasking, fewer frame drops, and stronger 2027–2030 software headroom.',
        prerequisites: ['Match voltage and speed/timings; install in dual-channel paired slots (A2/B2).'],
      });
    }
  } else if (totalRamGb !== null && totalRamGb < 16 && allMemorySoldered) {
    upgradeRecommendations.push({
      id: 'upg-ram-soldered-warn',
      priority: 'Medium',
      component: 'System RAM (Non-Upgradeable)',
      currentItem: `${totalRamGb} GB Soldered ${ramTypeStr || 'LPDDR'}`,
      recommendedUpgrade: 'No RAM upgrade possible (memory is soldered to motherboard)',
      whyRecommended: 'LPDDR / soldered modules cannot be expanded; plan full device replacement when workload exceeds current RAM.',
      compatibilityVerified: true,
      compatibilityNotes: 'Detected soldered memory modules — safely suppressed invalid SO-DIMM upgrade recommendation.',
      expectedBenefit: 'Avoids purchasing incompatible memory.',
      prerequisites: ['Close unused browser tabs/background apps to minimize swap pressure.'],
    });
  }

  if (onlyHddBoot || !inventory.storage.some((d) => d.mediaType === 'NVMe SSD')) {
    upgradeRecommendations.push({
      id: 'upg-nvme',
      priority: onlyHddBoot ? 'High' : 'Medium',
      component: 'Primary Storage',
      currentItem: inventory.storage[0]?.friendlyName || primaryDiskType || 'Non-NVMe Storage',
      recommendedUpgrade: '1–2 TB NVMe M.2 PCIe 4.0 SSD (or 2.5" SATA SSD if motherboard lacks M.2 NVMe slot)',
      whyRecommended: 'Dramatically cuts OS boot, compiler I/O, and game loading times; enables DirectStorage.',
      compatibilityVerified: inventory.ports.confirmedPhysical.some((p) => p.kind === 'storage') || !isLaptop,
      compatibilityNotes: 'Verify an open M.2 2280 NVMe slot (or replace existing M.2/2.5" SATA drive) in motherboard/laptop manual.',
      expectedBenefit: '3×–10× faster sequential throughput and instant random access vs HDD/SATA.',
      prerequisites: ['Back up data or clone OS partition cleanly before swapping boot drive.'],
    });
  }

  if (!isLaptop && (!isDiscreteGpu || (gpuTier !== null && gpuTier < 620))) {
    const minPsuNeeded = 550;
    const psuNote =
      userPsuWatts === null
        ? 'Enter your desktop PSU wattage below to verify power headroom before purchasing a GPU.'
        : userPsuWatts >= minPsuNeeded
        ? `User-entered ${userPsuWatts} W PSU meets typical 550–650 W mid-range GPU requirement.`
        : `Warning: Your ${userPsuWatts} W PSU is below the typical ${minPsuNeeded}–650 W recommendation for modern mid-range dGPUs — upgrade PSU alongside GPU.`;

    upgradeRecommendations.push({
      id: 'upg-gpu',
      priority: 'High',
      component: 'Discrete Graphics Card (Desktop PCIe)',
      currentItem: gpuName || 'Integrated / Entry GPU',
      recommendedUpgrade: 'Modern 12–16 GB VRAM GPU (e.g., RTX 4060 Ti 16GB / RX 7700 XT / RTX 5060 Ti / Arc B580)',
      whyRecommended: 'Unlocks 1080p/1440p High gaming, DX12 Ultimate, hardware AV1, and 2030 engine features.',
      compatibilityVerified: userPsuWatts !== null && userPsuWatts >= minPsuNeeded,
      compatibilityNotes: `${psuNote} Also physically verify case GPU length clearance and PCIe 8-pin/12V-2x6 power cables.`,
      expectedBenefit: 'Major jump in FPS, ray tracing, AI upscaling, and GPU rendering speed.',
      prerequisites: [
        'Verify physical chassis clearance (mm) & PCIe x16 slot availability.',
        'Enable UEFI + Resizable BAR / Above 4G Decoding in BIOS.',
      ],
    });
  } else if (isLaptop && gpuTier !== null && gpuTier < 500) {
    upgradeRecommendations.push({
      id: 'upg-laptop-gpu-note',
      priority: 'Optional',
      component: 'Laptop Graphics (Soldered)',
      currentItem: gpuName || 'Laptop GPU',
      recommendedUpgrade: 'Internal laptop GPU cannot be upgraded (BGA soldered)',
      whyRecommended: 'Only external Thunderbolt/USB4 eGPU (if Thunderbolt/USB4 port confirmed) or full laptop replacement can increase 3D power.',
      compatibilityVerified: true,
      compatibilityNotes: 'Detected laptop chassis — internal MXM GPUs are absent on modern consumer notebooks.',
      expectedBenefit: 'Prevents buying incompatible desktop GPUs.',
      prerequisites: ['Use DLSS/FSR/XeSS upscaling and optimize thermal cooling pad airflow.'],
    });
  }

  // --- Maintenance & Preventive Care Advisories ---
  const maintenanceAdvisories: HealthAssessmentReport['maintenanceAdvisories'] = [];
  if (smartDrives.some((d) => d.smartHealthStatus === 'critical' || (d.wearPercent ?? 0) >= 85)) {
    maintenanceAdvisories.push({
      id: 'maint-smart-crit',
      priority: 'Critical',
      title: 'Drive Health / Flash Wear Warning Detected',
      whyItMatters: 'One or more drives show critical SMART reliability errors or >85% wear consumed.',
      steps: [
        'Immediately back up irreplaceable personal files and project data to external or cloud storage.',
        'Inspect Event Viewer Disk/StorNVMe logs and plan drive replacement.',
      ],
      requiresPhysicalInspection: false,
    });
  }
  if ((cpuTemp !== null && cpuTemp >= 85) || (gpuTemp !== null && gpuTemp >= 83)) {
    maintenanceAdvisories.push({
      id: 'maint-high-temp',
      priority: 'High',
      title: 'Elevated Operating Temperatures Detected',
      whyItMatters: 'Sustained high temperatures trigger clock throttling and accelerate component aging.',
      steps: [
        'Verify all case, CPU, and GPU fans spin freely and air intake filters are unobstructed.',
        'Physically inspect heatsink fins for dust buildup and evaluate thermal paste condition (software cannot detect dust or dried paste directly).',
      ],
      requiresPhysicalInspection: true,
    });
  }
  if (inventory.diagnosticEvents.pnpErrors.length > 0) {
    maintenanceAdvisories.push({
      id: 'maint-pnp',
      priority: 'Medium',
      title: `${inventory.diagnosticEvents.pnpErrors.length} Device Manager Error(s) Found`,
      whyItMatters: 'Failing or misconfigured PnP devices can cause USB drops, audio glitches, or instability.',
      steps: [
        'Review affected device error codes in the Drivers & Stability panel.',
        'Install official OEM chipset/GPU/controller drivers (SecretArea never auto-flashes BIOS or drivers).',
      ],
      requiresPhysicalInspection: false,
    });
  }
  if (inventory.power.battery?.present && (inventory.power.battery.healthPercent ?? 100) < 70) {
    maintenanceAdvisories.push({
      id: 'maint-battery',
      priority: 'Medium',
      title: 'Laptop Battery Capacity Degraded Below 70%',
      whyItMatters: 'High battery wear reduces unplugged runtime and can trigger sudden power drops under peak load.',
      steps: [
        'Check for physical battery swelling (case/trackpad bulging) and consider OEM battery replacement.',
      ],
      requiresPhysicalInspection: true,
    });
  }
  if (maintenanceAdvisories.length === 0) {
    maintenanceAdvisories.push({
      id: 'maint-routine',
      priority: 'Low',
      title: 'Routine Preventive Cooling & Backup Check',
      whyItMatters: 'Periodic dust cleaning and verified backups prevent unexpected thermal throttling and data loss.',
      steps: [
        'Physically inspect dust filters and fans every 6–12 months (requires visual check; not software-measurable).',
        'Keep BIOS/UEFI and chipset drivers up to date manually via your OEM support page.',
      ],
      requiresPhysicalInspection: true,
    });
  }

  return {
    overallPhysicalHealthScore,
    performanceCapabilityScore,
    measuredComponentsCount: measuredList.length,
    totalComponentsCount: componentScores.length,
    hardwareAgeLabel,
    oldestDetectedComponentYear: oldestYear,
    estimatedUsefulLifeRange,
    componentScores,
    bottleneckSummary: {
      primaryLimitingFactor,
      explanation: bottleneckExplanation,
      provenance: 'estimated',
    },
    gamingSuitability,
    proCompatibility,
    upgradeRecommendations,
    maintenanceAdvisories,
  };
}

export interface FutureProjectionResult {
  targetYear: FutureTargetYear;
  overallVerdict: 'Future-Ready' | 'Viable with Compromises' | 'Upgrade Recommended' | 'Insufficient Data';
  readinessScore: number | null;
  verifiedFacts: string[];
  forwardEstimates: string[];
  workloadForecasts: Array<{
    name: string;
    outlook: 'Strong' | 'Adequate' | 'Strained' | 'Insufficient' | 'Unknown';
    reason: string;
  }>;
}

export function computeFutureProjection(params: {
  targetYear: FutureTargetYear;
  snapshot: HardwareMonitorSnapshot;
  inventory: DeepHardwareInventory;
  dbEntries: HardwareDbEntry[];
}): FutureProjectionResult {
  const { targetYear, snapshot, inventory, dbEntries } = params;
  const gpuSel = resolvePrimaryGpus(snapshot, inventory);
  const cpuModel = inventory.cpu.model || snapshot.cpu.model;
  const cpuDb = matchHardwareDbEntry(cpuModel, 'cpu', dbEntries);
  const gpuDb = matchHardwareDbEntry(gpuSel.primaryGpuModel, 'gpu', dbEntries);
  const ramType = snapshot.ram.memoryType || inventory.memory.modules.find((m) => m.memoryType)?.memoryType || null;
  const ramDb = matchHardwareDbEntry(ramType, 'ram', dbEntries);
  const hasNvme = inventory.storage.some((d) => d.mediaType === 'NVMe SSD');
  const rawRamBytes = inventory.memory.totalBytes || snapshot.ram.totalBytes || 0;
  const totalRamGb = rawRamBytes > 0 ? Math.round(rawRamBytes / (1024 ** 3)) : null;
  const vramGb = gpuSel.vramTotalMB && gpuSel.vramTotalMB > 0
    ? Math.round((gpuSel.vramTotalMB / 1024) * 10) / 10
    : null;

  const tpmState = inventory.system.tpm;
  const tpmLabel = tpmState.present === true
    ? `Present${tpmState.specVersion ? ` (${tpmState.specVersion})` : ''}`
    : tpmState.status === 'requires_admin'
    ? 'Requires Administrator privileges to verify'
    : tpmState.status === 'not_supported'
    ? 'Not Supported / Unavailable on OS'
    : tpmState.status === 'not_detected'
    ? 'Not Detected'
    : 'Unknown / Unverified';

  const yearPenalty = Math.max(0, (targetYear - 2026) * 5);
  const scoredDimensions: number[] = [];
  if (cpuDb) scoredDimensions.push(cpuDb.suitability2030Score);
  if (gpuDb) scoredDimensions.push(gpuDb.suitability2030Score);
  if (ramDb) {
    scoredDimensions.push(ramDb.suitability2030Score);
  } else if (totalRamGb !== null) {
    scoredDimensions.push(totalRamGb >= 32 ? 85 : totalRamGb >= 16 ? 65 : 35);
  }
  if (inventory.storage.length > 0) {
    scoredDimensions.push(hasNvme ? 92 : 45);
  }

  const readinessScore =
    scoredDimensions.length > 0
      ? Math.max(
          10,
          Math.min(
            99,
            Math.round(scoredDimensions.reduce((a, b) => a + b, 0) / scoredDimensions.length) -
              Math.max(0, yearPenalty - 12)
          )
        )
      : null;

  const verifiedFacts: string[] = [
    `Detected CPU: ${cpuModel || 'Unknown'}${cpuDb ? ` (${cpuDb.generation}, released ~${cpuDb.releaseYear})` : ''}.`,
    `Primary GPU: ${gpuSel.primaryGpuModel || 'Unknown'}${vramGb !== null ? ` (${vramGb} GB VRAM)` : ''}.`,
    `System RAM: ${totalRamGb !== null ? `${totalRamGb} GB` : 'Unknown'}${ramType ? ` ${ramType}` : ''}.`,
    `TPM 2.0: ${tpmLabel} · Boot Mode: ${inventory.system.bootMode}.`,
  ];

  const forwardEstimates: string[] = [
    `Forward estimate for ${targetYear}: Mainstream AAA games are expected to rely heavily on DirectX 12 Ultimate (Mesh Shaders, mandatory/hybrid Ray Tracing) and NVMe streaming.`,
    totalRamGb === null
      ? `System RAM capacity could not be measured reliably in this environment; verify 16–32 GB+ for ${targetYear} AAA games and heavy workloads.`
      : totalRamGb >= 32
      ? `32 GB+ system RAM is projected to remain comfortable for gaming and multitasking in ${targetYear}.`
      : `${totalRamGb} GB RAM may require closing background apps or upgrading to 32 GB for ${targetYear} AAA games and heavy IDEs/editors.`,
    vramGb === null
      ? `Dedicated VRAM capacity was not exposed; verify GPU model VRAM headroom (12 GB+ recommended for high textures toward 2030).`
      : vramGb < 12
      ? `With ${vramGb} GB VRAM, ${targetYear} AAA releases at 1440p+ will likely require Medium textures and DLSS/FSR/XeSS upscaling.`
      : '12 GB+ VRAM provides stronger texture longevity toward 2030.',
  ];

  const gpuScore2030 = gpuDb?.suitability2030Score ?? null;
  const cpuScore2030 = cpuDb?.suitability2030Score ?? null;

  const workloadForecasts: FutureProjectionResult['workloadForecasts'] = [
    {
      name: 'AAA Gaming (1080p–1440p)',
      outlook:
        gpuScore2030 === null || totalRamGb === null
          ? 'Unknown'
          : gpuScore2030 >= 80 && totalRamGb >= 16
          ? 'Strong'
          : gpuScore2030 >= 58
          ? 'Adequate'
          : gpuScore2030 >= 38
          ? 'Strained'
          : 'Insufficient',
      reason:
        gpuScore2030 === null
          ? 'GPU model could not be matched in hardware database; open Desktop mode or update DB for an accurate forecast.'
          : gpuScore2030 >= 80
          ? 'DX12 Ultimate + AI upscaling keep frame rates viable.'
          : 'Likely limited to 720p/1080p Low–Medium or older titles.',
    },
    {
      name: '4K Gaming & Path Tracing',
      outlook:
        gpuScore2030 === null
          ? 'Unknown'
          : gpuScore2030 >= 90 && (vramGb ?? 0) >= 12
          ? 'Strong'
          : gpuScore2030 >= 75
          ? 'Adequate'
          : 'Insufficient',
      reason: 'High-resolution RT requires upper-tier shaders and >=12–16 GB VRAM.',
    },
    {
      name: 'Programming, Docker & Cloud IDEs',
      outlook:
        cpuScore2030 === null || totalRamGb === null
          ? 'Unknown'
          : cpuScore2030 >= 65 && totalRamGb >= 32
          ? 'Strong'
          : cpuScore2030 >= 45 && totalRamGb >= 16
          ? 'Adequate'
          : 'Strained',
      reason: 'Containerized dev stacks steadily increase RAM & multi-core demand.',
    },
    {
      name: '4K Video Editing & 3D Rendering',
      outlook:
        cpuScore2030 === null || gpuScore2030 === null || totalRamGb === null
          ? 'Unknown'
          : cpuScore2030 >= 70 && gpuScore2030 >= 70 && totalRamGb >= 32
          ? 'Strong'
          : totalRamGb >= 16
          ? 'Adequate'
          : 'Insufficient',
      reason: 'Hardware AV1/HEVC acceleration and 32+ GB RAM strongly determine scrubbing smoothness.',
    },
    {
      name: 'Everyday Office, Web & Streaming',
      outlook:
        readinessScore === null
          ? 'Unknown'
          : readinessScore >= 50 && hasNvme
          ? 'Strong'
          : readinessScore >= 30
          ? 'Adequate'
          : 'Strained',
      reason: 'Browsers and OS security features remain responsive on SSD + 16 GB RAM.',
    },
  ];

  return {
    targetYear,
    overallVerdict:
      readinessScore === null
        ? 'Insufficient Data'
        : readinessScore >= 72
        ? 'Future-Ready'
        : readinessScore >= 48
        ? 'Viable with Compromises'
        : 'Upgrade Recommended',
    readinessScore,
    verifiedFacts,
    forwardEstimates,
    workloadForecasts,
  };
}

export function evaluateCatalogGamesOnCurrentPc(params: {
  games: GameItem[];
  snapshot: HardwareMonitorSnapshot;
  inventory: DeepHardwareInventory;
  searchQuery: string;
}): Array<{ game: GameItem; evaluation: CanRunEvaluation }> {
  const { games, snapshot, inventory, searchQuery } = params;
  const totalSpaceGb =
    typeof snapshot.storageTotals.totalBytes === 'number' && snapshot.storageTotals.totalBytes > 0
      ? Math.round(snapshot.storageTotals.totalBytes / (1024 ** 3))
      : null;
  const freeSpaceGb =
    typeof snapshot.storageTotals.freeBytes === 'number' && snapshot.storageTotals.freeBytes >= 0
      ? Math.round(snapshot.storageTotals.freeBytes / (1024 ** 3))
      : null;

  const gpuSel = resolvePrimaryGpus(snapshot, inventory);
  const rawRamBytes = inventory.memory.totalBytes || snapshot.ram.totalBytes || 0;
  const detectedRamGb = rawRamBytes > 0 ? Math.max(1, Math.round(rawRamBytes / (1024 ** 3))) : null;
  const cpuModel = inventory.cpu.model || snapshot.cpu.model;
  const cpuCores = inventory.cpu.logicalThreads ?? snapshot.cpu.logicalThreads ?? null;
  const cpuSpeedGhz = inventory.cpu.maxBoostClockGhz ?? inventory.cpu.baseClockGhz ?? snapshot.cpu.clockSpeedGhz ?? null;

  const specs: SystemHardwareSpecs = {
    source: inventory.sourceMode === 'desktop_ipc' ? 'electron' : 'browser',
    osName: inventory.system.osName || snapshot.platform,
    cpuName: cpuModel || 'Unknown CPU',
    cpuCores,
    cpuSpeedGhz,
    gpuName: gpuSel.primaryGpuModel || 'Unknown GPU',
    gpuVramGB:
      gpuSel.vramTotalMB && gpuSel.vramTotalMB > 0
        ? Number((gpuSel.vramTotalMB / 1024).toFixed(1))
        : null,
    allGpus:
      inventory.gpus.length > 0
        ? inventory.gpus.map((g) => g.model).filter(Boolean)
        : snapshot.gpus.map((g) => g.model || '').filter(Boolean),
    ramGB: detectedRamGb,
    ramIsApprox: inventory.sourceMode !== 'desktop_ipc',
    spaceDrive: snapshot.storage[0]?.mount || null,
    freeSpaceGB: freeSpaceGb,
    totalSpaceGB: totalSpaceGb,
    detectedAt: new Date().toISOString(),
  };

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? games.filter((g) => g.name.toLowerCase().includes(q) || g.genresRaw.toLowerCase().includes(q))
    : games.slice(0, 12);

  return filtered.slice(0, 12).map((game) => ({
    game,
    evaluation: evaluateCanRunGame(game, specs),
  }));
}

async function runSlicedAsyncCpuBenchmark(
  durationMs: number,
  signal?: AbortSignal
): Promise<{ ops: number; elapsedMs: number; cancelled: boolean }> {
  const start = performance.now();
  const endAt = start + durationMs;
  let ops = 0;
  let x = 1.0001;

  while (performance.now() < endAt) {
    if (signal?.aborted) {
      return { ops, elapsedMs: Math.round(performance.now() - start), cancelled: true };
    }
    const sliceEnd = Math.min(endAt, performance.now() + 12);
    while (performance.now() < sliceEnd) {
      for (let i = 0; i < 4000; i++) {
        x = Math.sqrt(x * 1.000003 + 0.123456) * 0.999997;
        if (x > 1e6 || x < 1) x = 1.2345;
      }
      ops += 4000;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  return {
    ops,
    elapsedMs: Math.max(1, Math.round(performance.now() - start)),
    cancelled: Boolean(signal?.aborted),
  };
}

export async function runSafeBrowserMicroBenchmark(
  kind: 'cpu_single' | 'webgl_frame' | 'network_latency',
  options?: { signal?: AbortSignal }
): Promise<BenchmarkMetricResult> {
  const signal = options?.signal;
  const start = performance.now();

  if (signal?.aborted) {
    return {
      id: kind,
      label: kind,
      value: null,
      unit: kind === 'cpu_single' ? 'M-ops/s' : kind === 'webgl_frame' ? 'FPS' : 'ms',
      durationMs: 0,
      peakTempC: null,
      abortedForSafety: false,
      cancelled: true,
      note: 'Benchmark cancelled by user.',
      completedAt: Date.now(),
    };
  }

  if (kind === 'cpu_single') {
    let workerResult: { ops: number; elapsedMs: number; cancelled: boolean } | null = null;
    if (typeof Worker !== 'undefined') {
      try {
        workerResult = await new Promise<{ ops: number; elapsedMs: number; cancelled: boolean }>((resolve, reject) => {
          const worker = new Worker(new URL('../workers/cpuBench.worker.ts', import.meta.url), {
            type: 'module',
          });
          let settled = false;
          const cleanup = () => {
            if (signal) signal.removeEventListener('abort', onAbort);
            worker.terminate();
          };
          const onAbort = () => {
            if (settled) return;
            settled = true;
            try {
              worker.postMessage({ type: 'cancel' });
            } catch {
              // ignore
            }
            cleanup();
            resolve({ ops: 0, elapsedMs: Math.round(performance.now() - start), cancelled: true });
          };
          if (signal) signal.addEventListener('abort', onAbort, { once: true });
          worker.onmessage = (ev: MessageEvent<{ type?: string; ops?: number; elapsedMs?: number }>) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve({
              ops: Number(ev.data?.ops || 0),
              elapsedMs: Math.max(1, Number(ev.data?.elapsedMs || performance.now() - start)),
              cancelled: ev.data?.type === 'cancelled',
            });
          };
          worker.onerror = (err) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(err);
          };
          worker.postMessage({ type: 'start', durationMs: 800 });
        });
      } catch {
        workerResult = null;
      }
    }

    const res = workerResult ?? (await runSlicedAsyncCpuBenchmark(800, signal));
    if (res.cancelled) {
      return {
        id: 'cpu_single',
        label: 'Browser JS Single-Thread Compute',
        value: null,
        unit: 'M-ops/s',
        durationMs: res.elapsedMs,
        peakTempC: null,
        abortedForSafety: false,
        cancelled: true,
        note: 'Benchmark cancelled by user.',
        completedAt: Date.now(),
      };
    }

    const sec = Math.max(0.1, res.elapsedMs / 1000);
    return {
      id: 'cpu_single',
      label: 'Browser JS Single-Thread Compute',
      value: Number(((res.ops / sec) / 1e6).toFixed(2)),
      unit: 'M-ops/s',
      durationMs: Math.round(res.elapsedMs),
      peakTempC: null,
      abortedForSafety: false,
      cancelled: false,
      note: workerResult
        ? 'Non-blocking Web Worker math throughput benchmark.'
        : 'Non-blocking async sliced math throughput loop.',
      completedAt: Date.now(),
    };
  }

  if (kind === 'webgl_frame') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      return {
        id: 'webgl_frame',
        label: 'WebGL2 Shader Frame Test',
        value: null,
        unit: 'FPS',
        durationMs: Math.round(performance.now() - start),
        peakTempC: null,
        abortedForSafety: false,
        cancelled: false,
        note: 'WebGL context unavailable in this environment.',
        completedAt: Date.now(),
      };
    }
    let frames = 0;
    const frameTarget = 60;
    let rafId = 0;
    const wasCancelled = await new Promise<boolean>((resolve) => {
      const onAbort = () => {
        if (rafId) cancelAnimationFrame(rafId);
        resolve(true);
      };
      if (signal) {
        if (signal.aborted) {
          resolve(true);
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
      }
      const tick = () => {
        if (signal?.aborted) {
          resolve(true);
          return;
        }
        gl.clearColor((frames % 60) / 60, 0.25, 0.55, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.finish();
        frames++;
        if (frames < frameTarget) {
          rafId = requestAnimationFrame(tick);
        } else {
          if (signal) signal.removeEventListener('abort', onAbort);
          resolve(false);
        }
      };
      rafId = requestAnimationFrame(tick);
    });
    if (wasCancelled) {
      return {
        id: 'webgl_frame',
        label: 'WebGL2 Display Pacing',
        value: null,
        unit: 'FPS',
        durationMs: Math.round(performance.now() - start),
        peakTempC: null,
        abortedForSafety: false,
        cancelled: true,
        note: 'Benchmark cancelled by user.',
        completedAt: Date.now(),
      };
    }
    const sec = Math.max(0.05, (performance.now() - start) / 1000);
    return {
      id: 'webgl_frame',
      label: 'WebGL2 Display Pacing',
      value: Math.round(frames / sec),
      unit: 'FPS',
      durationMs: Math.round(performance.now() - start),
      peakTempC: null,
      abortedForSafety: false,
      cancelled: false,
      note: 'Measured 60 requestAnimationFrame WebGL clear+finish passes (display VSync capped).',
      completedAt: Date.now(),
    };
  }

  // network_latency
  const probes: number[] = [];
  for (let i = 0; i < 3; i++) {
    if (signal?.aborted) {
      return {
        id: 'network_latency',
        label: 'Origin HTTP Round-Trip Latency',
        value: null,
        unit: 'ms',
        durationMs: Math.round(performance.now() - start),
        peakTempC: null,
        abortedForSafety: false,
        cancelled: true,
        note: 'Benchmark cancelled by user.',
        completedAt: Date.now(),
      };
    }
    try {
      const t0 = performance.now();
      await fetch(window.location.origin, { method: 'HEAD', cache: 'no-store', signal });
      probes.push(performance.now() - t0);
    } catch {
      if (signal?.aborted) {
        return {
          id: 'network_latency',
          label: 'Origin HTTP Round-Trip Latency',
          value: null,
          unit: 'ms',
          durationMs: Math.round(performance.now() - start),
          peakTempC: null,
          abortedForSafety: false,
          cancelled: true,
          note: 'Benchmark cancelled by user.',
          completedAt: Date.now(),
        };
      }
    }
  }
  return {
    id: 'network_latency',
    label: 'Origin HTTP Round-Trip Latency',
    value: probes.length > 0 ? Number((probes.reduce((a, b) => a + b, 0) / probes.length).toFixed(1)) : null,
    unit: 'ms',
    durationMs: Math.round(performance.now() - start),
    peakTempC: null,
    abortedForSafety: false,
    cancelled: false,
    note: probes.length > 0 ? 'Measured lightweight HTTP HEAD round-trip time.' : 'Network probe unreachable.',
    completedAt: Date.now(),
  };
}

function escapeHtml(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function scrubSensitiveMessage(rawText: string, hostname?: string | null): string {
  let text = String(rawText || '');
  text = text.replace(/([A-Za-z]:\\Users\\)[^\\\s/"']+/gi, '$1[Redacted]');
  text = text.replace(/(\/(?:Users|home)\/)[^/\s"']+/g, '$1[Redacted]');
  if (hostname && hostname.trim().length > 1) {
    const escaped = hostname.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(escaped, 'gi'), '[Host]');
  }
  return text;
}

const PRIVACY_REDACTED = '[Redacted by Privacy Shield]';

export function buildHardwareHealthReportPayload(params: {
  snapshot: HardwareMonitorSnapshot;
  inventory: DeepHardwareInventory;
  assessment: HealthAssessmentReport;
  workload: WorkloadProfileId;
  privacyShield: boolean;
}) {
  const { snapshot, inventory, assessment, workload, privacyShield } = params;
  const maskedHostname = privacyShield ? '[Privacy Protected]' : snapshot.hostname || 'Unknown';
  const redactedStorage = privacyShield
    ? inventory.storage.map((d) => ({
        ...d,
        serialMasked: PRIVACY_REDACTED,
      }))
    : inventory.storage;
  const redactedMemory = privacyShield
    ? {
        ...inventory.memory,
        modules: inventory.memory.modules.map((m) => ({
          ...m,
          serialMasked: PRIVACY_REDACTED,
        })),
      }
    : inventory.memory;
  const redactedDisplays = privacyShield
    ? inventory.displays.map((d) => ({
        ...d,
        serialMasked: PRIVACY_REDACTED,
      }))
    : inventory.displays;
  const redactedDiagnosticEvents = privacyShield
    ? {
        ...inventory.diagnosticEvents,
        pnpErrors: inventory.diagnosticEvents.pnpErrors.map((e) => ({
          ...e,
          deviceId: PRIVACY_REDACTED,
        })),
        eventLogWarnings: inventory.diagnosticEvents.eventLogWarnings.map((ev) => ({
          ...ev,
          message: PRIVACY_REDACTED,
        })),
        eventLogErrorNote: inventory.diagnosticEvents.eventLogErrorNote
          ? scrubSensitiveMessage(inventory.diagnosticEvents.eventLogErrorNote, snapshot.hostname)
          : null,
      }
    : inventory.diagnosticEvents;
  const redactedNetwork = privacyShield
    ? {
        ...inventory.network,
        adapters: inventory.network.adapters.map((a) => ({
          ...a,
          macMasked: PRIVACY_REDACTED,
          ssid: PRIVACY_REDACTED,
        })),
      }
    : inventory.network;

  return {
    generatedAt: new Date().toISOString(),
    app: 'SecretArea Hardware Intelligence',
    privacyShieldEnabled: privacyShield,
    selectedWorkload: workload,
    hostname: maskedHostname,
    system: {
      ...inventory.system,
      serialMasked: privacyShield ? PRIVACY_REDACTED : inventory.system.serialMasked,
      uuidMasked: privacyShield ? PRIVACY_REDACTED : inventory.system.uuidMasked,
    },
    motherboard: {
      ...inventory.motherboard,
      serialMasked: privacyShield ? PRIVACY_REDACTED : inventory.motherboard.serialMasked,
    },
    cpu: inventory.cpu,
    gpus: snapshot.gpus,
    memory: redactedMemory,
    storage: redactedStorage,
    fans: inventory.fans,
    ports: inventory.ports,
    displays: redactedDisplays,
    network: redactedNetwork,
    healthAssessment: assessment,
    diagnosticEvents: redactedDiagnosticEvents,
  };
}

export function buildPrintableReportHtml(params: {
  snapshot: HardwareMonitorSnapshot;
  inventory: DeepHardwareInventory;
  assessment: HealthAssessmentReport;
  workload: WorkloadProfileId;
  privacyShield: boolean;
}): string {
  const payload = buildHardwareHealthReportPayload(params);
  const { assessment, inventory, snapshot } = params;

  const tpmSummaryText = inventory.system.tpm.present
    ? `Present (${escapeHtml(inventory.system.tpm.specVersion || 'v2')})`
    : inventory.system.tpm.status === 'requires_admin'
    ? 'Requires Administrator'
    : inventory.system.tpm.status === 'not_supported'
    ? 'Not Supported'
    : inventory.system.tpm.status === 'unknown'
    ? 'Unknown'
    : 'Not detected';

  const compRows = assessment.componentScores
    .map(
      (c) => `<tr>
        <td>${escapeHtml(c.label)}</td>
        <td><strong>${c.score !== null ? `${c.score}/100` : 'Unavailable'}</strong></td>
        <td>${escapeHtml(c.status.toUpperCase())}</td>
        <td>${escapeHtml(c.summary)}</td>
      </tr>`
    )
    .join('');

  const diskRows = payload.storage
    .map(
      (d) => `<tr>
        <td>${escapeHtml(d.friendlyName)}</td>
        <td>${escapeHtml(d.interfaceDetail || d.mediaType)}</td>
        <td>${escapeHtml(d.smartHealthStatus.toUpperCase())}</td>
        <td>${d.wearPercent !== null ? `${d.wearPercent}%` : 'N/A'}</td>
        <td>${d.temperatureC !== null ? `${d.temperatureC}°C` : 'N/A'}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>SecretArea Hardware Health Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 28px; font-size: 12.5px; line-height: 1.5; }
  h1 { font-size: 20px; margin: 0 0 4px; color: #0369a1; }
  h2 { font-size: 14px; margin: 20px 0 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; color: #0f172a; }
  .meta { color: #475569; font-size: 11px; margin-bottom: 16px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0; }
  .kpi { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #f8fafc; }
  .kpi-label { font-size: 10px; text-transform: uppercase; color: #64748b; }
  .kpi-val { font-size: 16px; font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11.5px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
  th { background: #f1f5f9; font-weight: 600; }
  .note { background: #fffbeb; border: 1px solid #fde68a; padding: 8px 10px; border-radius: 6px; font-size: 11px; color: #78350f; margin-top: 10px; }
</style>
</head>
<body>
  <h1>SecretArea PC Hardware Health &amp; Diagnostics Report</h1>
  <div class="meta">
    Generated: ${escapeHtml(payload.generatedAt)} &middot; Workload Profile: ${escapeHtml(params.workload)} &middot; Privacy Shield: ${params.privacyShield ? 'ON (Serials/MACs/SSIDs/Logs Redacted)' : 'OFF'} &middot; Host: ${escapeHtml(payload.hostname)}
  </div>

  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Physical Health</div><div class="kpi-val">${assessment.overallPhysicalHealthScore !== null ? `${assessment.overallPhysicalHealthScore}/100` : 'Partial'}</div></div>
    <div class="kpi"><div class="kpi-label">Performance Capability</div><div class="kpi-val">${assessment.performanceCapabilityScore !== null ? `${assessment.performanceCapabilityScore}/100` : 'Unknown'}</div></div>
    <div class="kpi"><div class="kpi-label">Form Factor &amp; OS</div><div class="kpi-val">${escapeHtml(inventory.system.formFactor.toUpperCase())}</div></div>
    <div class="kpi"><div class="kpi-label">Hardware Age</div><div class="kpi-val">${escapeHtml(assessment.oldestDetectedComponentYear || 'Unknown')}</div></div>
  </div>

  <h2>System &amp; Core Hardware</h2>
  <table>
    <tr><th>CPU</th><td>${escapeHtml(inventory.cpu.model || snapshot.cpu.model || 'Unknown')} (${escapeHtml(inventory.cpu.physicalCores ?? '?')}C / ${escapeHtml(inventory.cpu.logicalThreads ?? '?')}T)</td></tr>
    <tr><th>GPU(s)</th><td>${escapeHtml(snapshot.gpus.map((g) => g.model).filter(Boolean).join(', ') || 'Unknown')}</td></tr>
    <tr><th>Motherboard &amp; BIOS</th><td>${escapeHtml([inventory.motherboard.manufacturer, inventory.motherboard.model].filter(Boolean).join(' ') || 'Unavailable')} &middot; BIOS ${escapeHtml(inventory.motherboard.biosVersion || 'N/A')} (${escapeHtml(inventory.motherboard.biosReleaseDate || 'N/A')})</td></tr>
    <tr><th>Memory</th><td>${inventory.memory.totalBytes ? `${Math.round(inventory.memory.totalBytes / (1024 ** 3))} GB` : 'Unknown'} (${escapeHtml(inventory.memory.channelMode || 'Unknown channel')})</td></tr>
    <tr><th>Boot / Security</th><td>${escapeHtml(inventory.system.bootMode)} &middot; Secure Boot: ${inventory.system.secureBoot === null ? 'Unknown' : inventory.system.secureBoot ? 'Enabled' : 'Disabled'} &middot; TPM: ${tpmSummaryText}</td></tr>
  </table>

  <h2>Component Health Breakdown</h2>
  <table>
    <thead><tr><th>Component</th><th>Score</th><th>Status</th><th>Evidence</th></tr></thead>
    <tbody>${compRows}</tbody>
  </table>

  <h2>Storage &amp; SMART Status</h2>
  <table>
    <thead><tr><th>Drive</th><th>Interface</th><th>SMART Status</th><th>Wear</th><th>Temp</th></tr></thead>
    <tbody>${diskRows || '<tr><td colspan="5">No storage SMART records exposed.</td></tr>'}</tbody>
  </table>

  <h2>Bottleneck &amp; Useful Life Guidance</h2>
  <p><strong>Primary Limiting Factor:</strong> ${escapeHtml(assessment.bottleneckSummary.primaryLimitingFactor)} — ${escapeHtml(assessment.bottleneckSummary.explanation)}</p>
  <p><strong>Estimated Useful Life:</strong> ${escapeHtml(assessment.estimatedUsefulLifeRange)}</p>

  <div class="note">
    Note: Software sensors cannot directly detect dust accumulation or dried thermal paste; elevated temperatures require physical inspection. Unexposed sensors are marked Unavailable and never estimated as healthy.
  </div>
</body>
</html>`;
}
