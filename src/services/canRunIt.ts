import type { GameItem } from '../types';
import type { SystemHardwareSpecs } from './systemSpecs';

export type ComponentStatus = 'pass' | 'fail' | 'unknown';
export type OverallCanRunStatus = 'can-run' | 'cannot-run' | 'unknown';

export interface RequirementCheckRow {
  key: 'gpu' | 'cpu' | 'ram' | 'space';
  label: string;
  requiredText: string;
  userText: string;
  status: ComponentStatus;
  deltaPercent: number | null;
  statusText: string;
  reason?: string;
}

export interface CanRunEvaluation {
  status: OverallCanRunStatus;
  headline: string;
  shortBadge: string;
  summaryText: string;
  weakComponents: ('gpu' | 'cpu' | 'ram' | 'space')[];
  weakLabels: string[];
  rows: RequirementCheckRow[];
  hasRequirements: boolean;
}

// Approximate relative gaming/compute performance scores (higher = stronger)
const GPU_SCORE_TABLE: [RegExp, number][] = [
  // Legacy & Integrated
  [/radeon\s*hd\s*3\d{3}/i, 6],
  [/radeon\s*hd\s*4\d{3}/i, 10],
  [/radeon\s*hd\s*5\d{3}/i, 14],
  [/radeon\s*hd\s*6\d{3}/i, 18],
  [/radeon\s*hd\s*7[789]\d{2}/i, 28],
  [/9800\s*gt|8800\s*gt/i, 8],
  [/gt\s*710|gt\s*730/i, 11],
  [/gt\s*1030/i, 24],
  [/intel\s*(?:hd|uhd)\s*graphics\s*(?:5\d{2}|6\d{2})/i, 14],
  [/intel\s*(?:hd|uhd)\s*graphics\s*7\d{2}/i, 20],
  [/intel\s*(?:hd|uhd)\s*graphics/i, 15],
  [/iris\s*(?:plus|xe)/i, 30],
  [/vega\s*(?:6|7|8|10|11)/i, 26],
  [/radeon\s*(?:660m|760m)/i, 38],
  [/radeon\s*(?:680m|780m|880m|890m)/i, 54],

  // NVIDIA GeForce GTX
  [/gtx\s*460|gtx\s*560/i, 22],
  [/gtx\s*650/i, 24],
  [/gtx\s*660/i, 30],
  [/gtx\s*670|gtx\s*680/i, 40],
  [/gtx\s*750\s*ti/i, 32],
  [/gtx\s*750/i, 26],
  [/gtx\s*760/i, 38],
  [/gtx\s*770|gtx\s*780\s*ti/i, 52],
  [/gtx\s*950/i, 38],
  [/gtx\s*960/i, 46],
  [/gtx\s*970/i, 66],
  [/gtx\s*980\s*ti/i, 88],
  [/gtx\s*980/i, 76],
  [/gtx\s*1050\s*ti/i, 52],
  [/gtx\s*1050/i, 42],
  [/gtx\s*1060/i, 72],
  [/gtx\s*1070\s*ti/i, 108],
  [/gtx\s*1070/i, 96],
  [/gtx\s*1080\s*ti/i, 134],
  [/gtx\s*1080/i, 118],
  [/gtx\s*1630/i, 44],
  [/gtx\s*1650\s*super/i, 74],
  [/gtx\s*1650/i, 60],
  [/gtx\s*1660\s*(?:super|ti)/i, 98],
  [/gtx\s*1660/i, 88],

  // NVIDIA GeForce RTX 20 / 30 / 40 / 50
  [/rtx\s*2050/i, 82],
  [/rtx\s*2060\s*super/i, 136],
  [/rtx\s*2060/i, 118],
  [/rtx\s*2070\s*super/i, 160],
  [/rtx\s*2070/i, 142],
  [/rtx\s*2080\s*(?:super|ti)/i, 195],
  [/rtx\s*2080/i, 174],
  [/rtx\s*3050\s*ti/i, 98],
  [/rtx\s*3050/i, 105],
  [/rtx\s*3060\s*ti/i, 178],
  [/rtx\s*3060/i, 148],
  [/rtx\s*3070\s*ti/i, 210],
  [/rtx\s*3070/i, 195],
  [/rtx\s*3080\s*ti/i, 265],
  [/rtx\s*3080/i, 245],
  [/rtx\s*3090/i, 290],
  [/rtx\s*4050/i, 140],
  [/rtx\s*4060\s*ti/i, 205],
  [/rtx\s*4060/i, 176],
  [/rtx\s*4070\s*ti/i, 285],
  [/rtx\s*4070\s*super/i, 265],
  [/rtx\s*4070/i, 238],
  [/rtx\s*4080/i, 325],
  [/rtx\s*4090/i, 420],
  [/rtx\s*5060\s*ti/i, 235],
  [/rtx\s*5060/i, 205],
  [/rtx\s*5070\s*ti/i, 330],
  [/rtx\s*5070/i, 280],
  [/rtx\s*5080/i, 375],
  [/rtx\s*5090/i, 520],

  // NVIDIA MX Mobile Series
  [/mx\s*1[135]0/i, 20],
  [/mx\s*2[35]0/i, 24],
  [/mx\s*3[35]0/i, 28],
  [/mx\s*450/i, 36],
  [/mx\s*550|mx\s*570/i, 46],

  // AMD Radeon RX
  [/rx\s*460|rx\s*550\b/i, 34],
  [/rx\s*560/i, 42],
  [/rx\s*470/i, 62],
  [/rx\s*480/i, 70],
  [/rx\s*570\b/i, 66],
  [/rx\s*580/i, 74],
  [/rx\s*590/i, 84],
  [/vega\s*56/i, 108],
  [/vega\s*64/i, 122],
  [/rx\s*5500\s*xt/i, 76],
  [/rx\s*5600\s*xt/i, 118],
  [/rx\s*5700\s*xt/i, 136],
  [/rx\s*5700/i, 120],
  [/rx\s*6400/i, 48],
  [/rx\s*6500\s*xt/i, 64],
  [/rx\s*6600\s*xt|rx\s*6650\s*xt/i, 152],
  [/rx\s*6600/i, 134],
  [/rx\s*6700\s*xt|rx\s*6750\s*xt/i, 184],
  [/rx\s*6700/i, 162],
  [/rx\s*6800\s*xt/i, 242],
  [/rx\s*6800/i, 215],
  [/rx\s*6900\s*xt|rx\s*6950\s*xt/i, 268],
  [/rx\s*7600\s*xt/i, 168],
  [/rx\s*7600/i, 156],
  [/rx\s*7700\s*xt/i, 212],
  [/rx\s*7800\s*xt/i, 248],
  [/rx\s*7900\s*gre/i, 270],
  [/rx\s*7900\s*xtx/i, 355],
  [/rx\s*7900\s*xt/i, 310],
  [/rx\s*9070\s*xt/i, 330],
  [/rx\s*9070/i, 285],

  // Intel Arc
  [/arc\s*a310/i, 38],
  [/arc\s*a380/i, 54],
  [/arc\s*a580/i, 112],
  [/arc\s*a750/i, 128],
  [/arc\s*a770/i, 144],
  [/arc\s*b570/i, 152],
  [/arc\s*b580/i, 174],

  // Apple Silicon GPU
  [/apple\s*m1\s*max/i, 135],
  [/apple\s*m1\s*pro/i, 92],
  [/apple\s*m1/i, 56],
  [/apple\s*m2\s*max/i, 165],
  [/apple\s*m2\s*pro/i, 110],
  [/apple\s*m2/i, 68],
  [/apple\s*m3\s*max/i, 210],
  [/apple\s*m3\s*pro/i, 138],
  [/apple\s*m3/i, 85],
  [/apple\s*m4\s*(?:pro|max)/i, 195],
  [/apple\s*m4/i, 102],

  // Integrated / Generic Fallback Models
  [/amd\s*radeon(?:\s*tm)?\s*graphics/i, 32],
  [/radeon\s*vega/i, 28],
];

function scoreSingleGpu(gpuText: string): { score: number | null; isGeneric: boolean; genericVramGB: number | null; requiresCuda: boolean } {
  const clean = gpuText.trim();
  if (!clean) return { score: null, isGeneric: false, genericVramGB: null, requiresCuda: false };

  const requiresCuda = /\bcuda\b/i.test(clean);

  let matchedScore: number | null = null;
  for (const [pattern, score] of GPU_SCORE_TABLE) {
    if (pattern.test(clean)) {
      matchedScore = score;
      break;
    }
  }

  if (matchedScore !== null) {
    // Laptop / Mobile GPUs run ~14% cooler than desktop counterparts unless already laptop-specific (RTX 4050/2050/MX/M-series)
    const isLaptop = /\blaptop\b|\bmobile\b|\bmax-q\b/i.test(clean);
    const alreadyMobile = /\b4050\b|\b2050\b|\bmx\s*\d|\b\d{3}m\b/i.test(clean);
    const adjusted =
      isLaptop && !alreadyMobile ? Math.round(matchedScore * 0.86) : matchedScore;
    return { score: Math.max(4, adjusted), isGeneric: false, genericVramGB: null, requiresCuda };
  }

  // Generic DirectX / VRAM descriptions common in Tools or broad games
  const vramMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*gb\s*(?:vram|video\s*memory|gpu)/i) ||
    clean.match(/(?:vram|video\s*memory|gpu)\s*(?:of|:)?\s*(\d+(?:[.,]\d+)?)\s*gb/i) ||
    clean.match(/^(\d+(?:[.,]\d+)?)\s*gb\b/i);
  const genericVramGB = vramMatch ? parseFloat(vramMatch[1].replace(',', '.')) : null;

  const isGenericVendor =
    /\bdirectx\b|\bshader\s*model\b|\bcuda\b|\bnvidia\s*\/\s*amd\b|\bcapable\b/i.test(clean) ||
    genericVramGB !== null;

  if (isGenericVendor) {
    if (genericVramGB !== null) {
      // Map VRAM requirement smoothly (2GB -> 24, 4GB -> 45, 8GB -> 115)
      const vramScore =
        genericVramGB >= 12 ? 175 : genericVramGB >= 8 ? 115 : genericVramGB >= 6 ? 80 : genericVramGB >= 4 ? 48 : 22;
      return { score: vramScore, isGeneric: true, genericVramGB, requiresCuda };
    }
    if (requiresCuda) {
      return { score: 28, isGeneric: true, genericVramGB: null, requiresCuda: true };
    }
    return { score: 18, isGeneric: true, genericVramGB: null, requiresCuda: false };
  }

  return { score: null, isGeneric: false, genericVramGB: null, requiresCuda };
}

function splitHardwareAlternatives(rawReq: string): string[] {
  return rawReq
    .replace(/\bor\s+better\b|\bor\s+equivalent\b|\bor\s+higher\b/gi, '')
    .split(/\s*(?:\/|\bor\b|,|\|)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function scoreGpuRequirement(rawReq: string): { score: number | null; isGeneric: boolean; genericVramGB: number | null; requiresCuda: boolean } {
  const parts = splitHardwareAlternatives(rawReq);
  let minConcreteScore: number | null = null;
  let minGenericScore: number | null = null;
  let minGenericVram: number | null = null;
  let requiresCuda = /\bcuda\b/i.test(rawReq);

  for (const part of parts) {
    const res = scoreSingleGpu(part);
    if (res.requiresCuda) requiresCuda = true;
    if (res.isGeneric) {
      if (res.genericVramGB !== null) {
        minGenericVram =
          minGenericVram === null ? res.genericVramGB : Math.min(minGenericVram, res.genericVramGB);
      }
      if (res.score !== null) {
        minGenericScore =
          minGenericScore === null ? res.score : Math.min(minGenericScore, res.score);
      }
    } else if (res.score !== null) {
      minConcreteScore =
        minConcreteScore === null ? res.score : Math.min(minConcreteScore, res.score);
    }
  }

  if (minConcreteScore !== null) {
    return {
      score: minConcreteScore,
      isGeneric: false,
      genericVramGB: null,
      requiresCuda,
    };
  }

  if (minGenericScore !== null) {
    return {
      score: minGenericScore,
      isGeneric: true,
      genericVramGB: minGenericVram,
      requiresCuda,
    };
  }

  return scoreSingleGpu(rawReq);
}

function scoreSingleCpu(cpuText: string): { score: number | null; isGeneric: boolean } {
  const clean = cpuText.trim();
  if (!clean) return { score: null, isGeneric: false };

  // Legacy Core 2 / Athlon / FX
  if (/core\s*2\s*quad|q6600|q8\d{3}|q9\d{3}/i.test(clean)) return { score: 26, isGeneric: false };
  if (/core\s*2\s*duo/i.test(clean)) return { score: 15, isGeneric: false };
  if (/pentium|celeron|athlon\s*(?:ii|x2|x4)/i.test(clean)) return { score: 22, isGeneric: false };
  if (/fx[\s-]*(?:4|6)\d{3}/i.test(clean)) return { score: 34, isGeneric: false };
  if (/fx[\s-]*(?:8|9)\d{3}/i.test(clean)) return { score: 48, isGeneric: false };

  // Intel Core i3 / i5 / i7 / i9 with model number (e.g. i3-530, i7-4770K, i5-12400F, i7-12650H)
  const intelModel = clean.match(/\bi([3579])[\s-]?(\d{3,5})([a-z]{0,3})/i);
  if (intelModel) {
    const tier = Number(intelModel[1]); // 3, 5, 7, 9
    const modelNum = intelModel[2];
    const suffix = (intelModel[3] || '').toUpperCase();
    const gen =
      modelNum.length === 3
        ? 1
        : modelNum.length === 4
        ? Number(modelNum[0])
        : Number(modelNum.slice(0, 2));

    const tierBase = tier === 9 ? 115 : tier === 7 ? 95 : tier === 5 ? 74 : 50;
    const genMultiplier =
      gen <= 1
        ? 0.42
        : gen === 2
        ? 0.56
        : gen === 3
        ? 0.64
        : gen === 4
        ? 0.76
        : gen === 5
        ? 0.82
        : gen <= 7
        ? 0.92
        : gen === 8
        ? 1.15
        : gen === 9
        ? 1.28
        : gen === 10
        ? 1.44
        : gen === 11
        ? 1.6
        : gen === 12
        ? 2.25
        : gen === 13
        ? 2.55
        : 2.75;

    let mobileFactor = 1;
    if (suffix.includes('U')) mobileFactor = 0.72;
    else if (suffix.includes('P')) mobileFactor = 0.86;
    else if (suffix.includes('H')) mobileFactor = 0.96;

    return { score: Math.round(tierBase * genMultiplier * mobileFactor), isGeneric: false };
  }

  // Intel Core Ultra (e.g. Ultra 7 155H / 265K)
  const ultraMatch = clean.match(/ultra\s*([579])\s*(\d{3})([a-z]{0,2})/i);
  if (ultraMatch) {
    const tier = Number(ultraMatch[1]);
    const base = tier === 9 ? 310 : tier === 7 ? 260 : 210;
    return { score: base, isGeneric: false };
  }

  // AMD Ryzen 3 / 5 / 7 / 9 (e.g. Ryzen 5 3600, Ryzen 5 5500, Ryzen 7 7800X3D)
  const ryzenMatch = clean.match(/ryzen\s*([3579])\s*(?:pro\s*)?(\d{4})([a-z0-9]*)/i);
  if (ryzenMatch) {
    const tier = Number(ryzenMatch[1]);
    const num = ryzenMatch[2];
    const genDigit = Number(num[0]); // 1..9
    const tierBase = tier === 9 ? 132 : tier === 7 ? 105 : tier === 5 ? 82 : 55;
    const genMult =
      genDigit === 1
        ? 0.92
        : genDigit === 2
        ? 1.05
        : genDigit === 3
        ? 1.32
        : genDigit === 4
        ? 1.42
        : genDigit === 5
        ? 1.85
        : genDigit === 6
        ? 1.9
        : genDigit === 7
        ? 2.35
        : genDigit === 8
        ? 2.25
        : 2.65;
    const isX3D = /x3d/i.test(ryzenMatch[3] || '');
    return {
      score: Math.round(tierBase * genMult * (isX3D ? 1.18 : 1)),
      isGeneric: false,
    };
  }

  // Threadripper / Xeon
  if (/threadripper|xeon/i.test(clean)) return { score: 220, isGeneric: false };

  // Apple Silicon
  if (/apple\s*m4/i.test(clean)) return { score: 240, isGeneric: false };
  if (/apple\s*m3/i.test(clean)) return { score: 205, isGeneric: false };
  if (/apple\s*m2/i.test(clean)) return { score: 175, isGeneric: false };
  if (/apple\s*m1/i.test(clean)) return { score: 145, isGeneric: false };

  // Generic tier mentions like "Intel Core i7" or "Intel Core i5" without model
  if (/\bi9\b/i.test(clean)) return { score: 170, isGeneric: false };
  if (/\bi7\b/i.test(clean)) return { score: 120, isGeneric: false };
  if (/\bi5\b/i.test(clean)) return { score: 85, isGeneric: false };
  if (/\bi3\b/i.test(clean)) return { score: 50, isGeneric: false };

  // Generic GHz / Intel or AMD text (common in Tools)
  const ghzMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*\+?\s*ghz/i);
  if (ghzMatch) {
    const ghz = parseFloat(ghzMatch[1].replace(',', '.'));
    return { score: ghz >= 3.5 ? 95 : ghz >= 3 ? 75 : 42, isGeneric: true };
  }
  if (/intel\s*\/\s*amd|processor|multi-?core/i.test(clean)) {
    return { score: 45, isGeneric: true };
  }

  return { score: null, isGeneric: false };
}

function scoreCpuRequirement(rawReq: string): { score: number | null; isGeneric: boolean } {
  const parts = splitHardwareAlternatives(rawReq);
  let minScore: number | null = null;
  let anyGeneric = false;

  for (const part of parts) {
    const res = scoreSingleCpu(part);
    if (res.isGeneric) anyGeneric = true;
    if (res.score !== null) {
      minScore = minScore === null ? res.score : Math.min(minScore, res.score);
    }
  }

  if (minScore === null) {
    return scoreSingleCpu(rawReq);
  }
  return { score: minScore, isGeneric: anyGeneric };
}

function scoreUserCpu(specs: SystemHardwareSpecs): { score: number | null; label: string } {
  const cpuName = (specs.cpuName || '').trim();
  const isUnknownCpuName = !cpuName || /^(?:unknown|unavailable|browser-reported|desktop processor|processor)/i.test(cpuName);
  const scored = scoreSingleCpu(cpuName);
  if (scored.score !== null && !scored.isGeneric) {
    return { score: scored.score, label: cpuName };
  }
  if (!isUnknownCpuName && specs.cpuCores !== null && specs.cpuCores > 0 && specs.cpuSpeedGhz !== null && specs.cpuSpeedGhz > 0) {
    const estScore = Math.round(specs.cpuCores * 12 * (specs.cpuSpeedGhz / 3.0));
    return { score: Math.max(20, estScore), label: cpuName };
  }
  return { score: null, label: cpuName || 'Unknown CPU' };
}

function scoreUserGpu(specs: SystemHardwareSpecs): {
  score: number | null;
  isNvidia: boolean;
  estimatedVramGB: number | null;
} {
  const name = specs.gpuName || '';
  const isNvidia = /nvidia|geforce|rtx|gtx|quadro/i.test(name);
  const single = scoreSingleGpu(name);

  let estVram = specs.gpuVramGB;
  if (estVram === null || estVram >= 3.9) {
    // Windows Win32_VideoController caps AdapterRAM at ~4GB (4293918720 bytes)
    if (/rtx\s*4090|rtx\s*5090|rx\s*7900\s*xtx/i.test(name)) estVram = 24;
    else if (/rtx\s*4080|rtx\s*5080|rx\s*7900|rx\s*6900/i.test(name)) estVram = 16;
    else if (/rtx\s*3060\b|rtx\s*4070|rtx\s*5070|rx\s*6700|rx\s*7700|rx\s*7800|arc\s*b580/i.test(name)) estVram = 12;
    else if (/rtx\s*4060|rtx\s*3070|rtx\s*3060\s*ti|rtx\s*2060\s*super|rtx\s*2070|rx\s*6600|rx\s*5700/i.test(name)) estVram = 8;
    else if (/rtx\s*4050|rtx\s*2060|gtx\s*1660|gtx\s*1060/i.test(name)) estVram = 6;
    else if (/gtx\s*1650|gtx\s*1050\s*ti|rtx\s*2050|rtx\s*3050/i.test(name)) estVram = 4;
  }

  return {
    score: single.score,
    isNvidia,
    estimatedVramGB: estVram,
  };
}

function parseRamRequirementGB(rawRam?: string): number | null {
  if (!rawRam) return null;
  const matches = rawRam.match(/(\d+(?:[.,]\d+)?)\s*(gb|mb)/i);
  if (!matches) return null;
  const val = parseFloat(matches[1].replace(',', '.'));
  if (Number.isNaN(val) || val <= 0) return null;
  return matches[2].toUpperCase() === 'MB' ? Number((val / 1024).toFixed(2)) : val;
}

function parseStorageSizeGB(sizeStr?: string): number | null {
  if (!sizeStr) return null;
  const match = sizeStr.match(/(\d+(?:[.,]\d+)?)\s*(TB|GB|MB)/i);
  if (!match) return null;
  const val = parseFloat(match[1].replace(',', '.'));
  if (Number.isNaN(val) || val <= 0) return null;
  const unit = match[2].toUpperCase();
  if (unit === 'TB') return Math.round(val * 1024 * 10) / 10;
  if (unit === 'MB') return Math.round((val / 1024) * 10) / 10;
  return val;
}

function formatDeltaPercent(delta: number): string {
  const rounded = Math.round(delta);
  const absFormatted = Math.abs(rounded).toLocaleString();
  return rounded >= 0 ? `+${absFormatted}%` : `-${absFormatted}%`;
}

const canRunEvalCache = new WeakMap<
  SystemHardwareSpecs,
  WeakMap<GameItem, CanRunEvaluation>
>();

export function evaluateCanRunGame(
  game: GameItem,
  specs: SystemHardwareSpecs
): CanRunEvaluation {
  let byGame = canRunEvalCache.get(specs);
  if (byGame) {
    const cached = byGame.get(game);
    if (cached) return cached;
  }
  const result = computeCanRunGame(game, specs);
  if (!byGame) {
    byGame = new WeakMap<GameItem, CanRunEvaluation>();
    canRunEvalCache.set(specs, byGame);
  }
  byGame.set(game, result);
  return result;
}

function computeCanRunGame(
  game: GameItem,
  specs: SystemHardwareSpecs
): CanRunEvaluation {
  const { gpu, cpu, ram, raw } = game.parsedRequirements;
  const hasReqs = Boolean(gpu || cpu || ram || raw);

  const storageReqGB =
    parseStorageSizeGB(game.originalSize) ?? parseStorageSizeGB(game.repackSize);

  const rows: RequirementCheckRow[] = [];
  const weakComponents: ('gpu' | 'cpu' | 'ram' | 'space')[] = [];

  const userGpu = scoreUserGpu(specs);
  const userCpu = scoreUserCpu(specs);

  const gpuName = (specs.gpuName || '').trim();
  const isGpuUnknown =
    !gpuName ||
    /^(?:unknown|unavailable|graphics adapter|integrated\s*\/\s*standard\s*gpu|web\s*gpu)/i.test(gpuName);

  // 1. Graphics / GPU
  if (gpu) {
    const reqGpu = scoreGpuRequirement(gpu);
    let status: ComponentStatus = 'unknown';
    let deltaPercent: number | null = null;
    let statusText = 'Unknown';
    let reason: string | undefined;

    if (reqGpu.requiresCuda && !userGpu.isNvidia && userGpu.score !== null) {
      status = 'fail';
      statusText = 'NVIDIA CUDA Req.';
      reason = 'Requires NVIDIA GPU with CUDA';
      weakComponents.push('gpu');
    } else if (reqGpu.genericVramGB !== null && userGpu.estimatedVramGB !== null) {
      if (userGpu.estimatedVramGB >= reqGpu.genericVramGB) {
        status = 'pass';
        statusText = 'Enough VRAM';
      } else {
        status = 'fail';
        statusText = `Low VRAM (${userGpu.estimatedVramGB} GB)`;
        reason = `Needs ${reqGpu.genericVramGB} GB VRAM`;
        weakComponents.push('gpu');
      }
    } else if (reqGpu.score !== null && userGpu.score !== null) {
      deltaPercent = ((userGpu.score - reqGpu.score) / reqGpu.score) * 100;
      if (userGpu.score >= reqGpu.score * 0.92) {
        status = 'pass';
        statusText = reqGpu.isGeneric ? 'Enough' : formatDeltaPercent(deltaPercent);
      } else {
        status = 'fail';
        statusText = `${formatDeltaPercent(deltaPercent)} · Weak GPU`;
        reason = `GPU below minimum`;
        weakComponents.push('gpu');
      }
    } else if (reqGpu.isGeneric && !isGpuUnknown && userGpu.score !== null) {
      status = 'pass';
      statusText = 'Enough';
    } else {
      reason = 'GPU specification or requirement could not be verified';
    }

    rows.push({
      key: 'gpu',
      label: 'Graphics',
      requiredText: gpu,
      userText: isGpuUnknown
        ? 'Unknown GPU'
        : specs.gpuVramGB && specs.gpuVramGB > 0 && specs.gpuVramGB < 3.9
        ? `${gpuName} (${specs.gpuVramGB} GB)`
        : gpuName,
      status,
      deltaPercent,
      statusText,
      reason,
    });
  }

  // 2. Processor / CPU
  if (cpu) {
    const reqCpu = scoreCpuRequirement(cpu);
    let status: ComponentStatus = 'unknown';
    let deltaPercent: number | null = null;
    let statusText = 'Unknown';
    let reason: string | undefined;

    if (reqCpu.score !== null && userCpu.score !== null) {
      deltaPercent = ((userCpu.score - reqCpu.score) / reqCpu.score) * 100;
      if (userCpu.score >= reqCpu.score * 0.92) {
        status = 'pass';
        statusText = reqCpu.isGeneric ? 'Enough' : formatDeltaPercent(deltaPercent);
      } else {
        status = 'fail';
        statusText = `${formatDeltaPercent(deltaPercent)} · Weak CPU`;
        reason = 'Processor below minimum';
        weakComponents.push('cpu');
      }
    } else if (reqCpu.isGeneric && userCpu.score !== null) {
      status = 'pass';
      statusText = 'Enough';
    } else {
      reason = 'CPU specification or requirement could not be verified';
    }

    rows.push({
      key: 'cpu',
      label: 'Processor',
      requiredText: cpu,
      userText:
        specs.cpuCores !== null && specs.cpuCores > 0
          ? `${userCpu.label} (${specs.cpuCores} threads)`
          : userCpu.label,
      status,
      deltaPercent,
      statusText,
      reason,
    });
  }

  // 3. Memory / RAM
  if (ram) {
    const reqRamGB = parseRamRequirementGB(ram);
    let status: ComponentStatus = 'unknown';
    let statusText = 'Unknown';
    let deltaPercent: number | null = null;
    let reason: string | undefined;

    if (reqRamGB !== null && specs.ramGB !== null && specs.ramGB > 0) {
      deltaPercent = ((specs.ramGB - reqRamGB) / reqRamGB) * 100;
      if (specs.ramGB >= reqRamGB) {
        status = 'pass';
        statusText = 'Enough';
      } else if (specs.ramIsApprox && specs.ramGB >= 8 && reqRamGB > 8) {
        status = 'unknown';
        statusText = `Verify (${reqRamGB} GB req.)`;
        reason = 'Browser caps RAM reporting at 8 GB';
      } else {
        status = 'fail';
        const missing = Math.ceil(reqRamGB - specs.ramGB);
        statusText = `Weak RAM (-${missing} GB)`;
        reason = `Needs ${reqRamGB} GB RAM`;
        weakComponents.push('ram');
      }
    } else {
      reason = 'RAM capacity or requirement unknown';
    }

    rows.push({
      key: 'ram',
      label: 'Memory',
      requiredText: ram,
      userText:
        specs.ramGB !== null && specs.ramGB > 0
          ? specs.ramIsApprox
            ? `${specs.ramGB} GB+ (Browser cap)`
            : `${specs.ramGB} GB`
          : 'Unknown',
      status,
      deltaPercent,
      statusText,
      reason,
    });
  }

  // 4. Storage / Free Space
  if (storageReqGB !== null && storageReqGB > 0) {
    let status: ComponentStatus = 'unknown';
    let statusText = 'Unknown';
    let reason: string | undefined;
    const driveLabel = specs.spaceDrive;

    if (specs.freeSpaceGB !== null) {
      if (specs.freeSpaceGB >= storageReqGB) {
        status = 'pass';
        statusText = 'Enough';
      } else {
        status = 'fail';
        const neededMore = Math.ceil(storageReqGB - specs.freeSpaceGB);
        statusText = `Low Space (-${neededMore} GB)`;
        reason = `Need ${storageReqGB} GB free`;
        weakComponents.push('space');
      }
    } else {
      reason = 'Free disk space unavailable';
    }

    rows.push({
      key: 'space',
      label: 'Space',
      requiredText: driveLabel ? `~${storageReqGB} GB on ${driveLabel}` : `~${storageReqGB} GB`,
      userText:
        specs.freeSpaceGB !== null
          ? `${specs.freeSpaceGB.toFixed(1)} GB free`
          : 'Unknown',
      status,
      deltaPercent: null,
      statusText,
      reason,
    });
  }

  const labelMap: Record<'gpu' | 'cpu' | 'ram' | 'space', string> = {
    gpu: 'GPU',
    cpu: 'CPU',
    ram: 'RAM',
    space: 'Storage',
  };
  const weakLabels = weakComponents.map((k) => labelMap[k]);

  if (!hasReqs && rows.length === 0) {
    return {
      status: 'unknown',
      headline: 'Requirements not listed',
      shortBadge: 'No specs',
      summaryText: 'Catalog entry has no hardware requirements specified.',
      weakComponents: [],
      weakLabels: [],
      rows: [],
      hasRequirements: false,
    };
  }

  if (weakComponents.length > 0) {
    const weakPhrase = weakLabels.join(', ');
    return {
      status: 'cannot-run',
      headline: "Can't run well on this PC",
      shortBadge: `Weak ${weakLabels[0]}${weakLabels.length > 1 ? ` +${weakLabels.length - 1}` : ''}`,
      summaryText: `Weak component in your PC: ${weakPhrase}`,
      weakComponents,
      weakLabels,
      rows,
      hasRequirements: true,
    };
  }

  const passedLabels = rows.filter((r) => r.status === 'pass').map((r) => r.label.toLowerCase());
  const unknownRows = rows.filter((r) => r.status === 'unknown');
  if (passedLabels.length === 0 || unknownRows.length > 0) {
    const unknownNames = unknownRows.map((r) => r.label).join(', ');
    return {
      status: 'unknown',
      headline: 'Unable to confirm full compatibility',
      shortBadge: 'Unknown',
      summaryText: unknownNames
        ? `Unverified component checks: ${unknownNames}. Unknown specs are never treated as passing.`
        : 'Hardware specifications or game requirements could not be verified.',
      weakComponents: [],
      weakLabels: [],
      rows,
      hasRequirements: true,
    };
  }

  return {
    status: 'can-run',
    headline: 'Runs well on this PC',
    shortBadge: 'Can Run It',
    summaryText: `Above the minimum on ${passedLabels.slice(0, 3).join(', ')}`,
    weakComponents: [],
    weakLabels: [],
    rows,
    hasRequirements: true,
  };
}
