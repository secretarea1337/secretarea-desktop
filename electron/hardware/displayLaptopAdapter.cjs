const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execFile } = require('child_process');
const si = require('systeminformation');

function runExec(cmd, args, timeoutMs = 2800) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: timeoutMs, windowsHide: true, maxBuffer: 1024 * 1024 }, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      resolve(typeof stdout === 'string' ? stdout.trim() : '');
    });
  });
}

function sanitize(val) {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || /^(unknown|n\/a|none|generic pnp monitor|default monitor)$/i.test(trimmed)) return null;
  return trimmed;
}

function toNum(val) {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const n = Number(val.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function classifyCpuFamily(modelName, manufacturer) {
  const full = `${manufacturer || ''} ${modelName || ''}`
    .replace(/\((?:r|tm)\)|[®™]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const lower = full.toLowerCase();
  if (!lower) {
    return { vendor: null, series: null, generation: null };
  }
  if (lower.includes('amd') || lower.includes('ryzen') || lower.includes('epyc') || lower.includes('threadripper') || lower.includes('athlon')) {
    let series = 'AMD Processor';
    let generation = null;
    if (lower.includes('ryzen ai')) {
      series = 'AMD Ryzen AI';
      generation = 'Zen 5 / Strix';
    } else if (/\bryzen\s*[3579]\s*9\d{3}/i.test(full)) {
      series = 'AMD Ryzen 9000 Series';
      generation = 'Zen 5';
    } else if (/\bryzen\s*[3579]\s*8\d{3}/i.test(full)) {
      series = 'AMD Ryzen 8000 Series';
      generation = 'Zen 4 + NPU';
    } else if (/\bryzen\s*[3579]\s*7\d{3}/i.test(full)) {
      series = 'AMD Ryzen 7000 Series';
      generation = 'Zen 4';
    } else if (/\bryzen\s*[3579]\s*5\d{3}/i.test(full)) {
      series = 'AMD Ryzen 5000 Series';
      generation = 'Zen 3';
    } else if (/\bryzen\s*[3579]\s*[34]\d{3}/i.test(full)) {
      series = 'AMD Ryzen 3000/4000 Series';
      generation = 'Zen 2';
    } else if (/\bryzen\b/i.test(full)) {
      series = 'AMD Ryzen';
    }
    return { vendor: 'AMD', series, generation };
  }
  if (lower.includes('intel') || lower.includes('core') || lower.includes('xeon') || lower.includes('pentium') || lower.includes('celeron')) {
    let series = 'Intel Processor';
    let generation = null;
    if (/\bcore\s+ultra\b/i.test(full)) {
      series = 'Intel Core Ultra';
      const ultraGen = full.match(/ultra\s*[579]\s*(\d)/i);
      generation = ultraGen ? `Series ${ultraGen[1]}` : 'Arrow / Meteor / Lunar Lake';
    } else {
      const coreMatch = full.match(/i[3579][-\s]*(1[0-4]\d{3}|[2-9]\d{2,3})/i);
      if (coreMatch) {
        const modelNum = coreMatch[1];
        const genNum = modelNum.length >= 5 ? modelNum.slice(0, 2) : modelNum.slice(0, 1);
        series = `Intel Core ${genNum}th Gen`;
        generation = `${genNum}th Gen`;
      } else if (/\bi[3579]\b/i.test(full)) {
        series = 'Intel Core';
      }
    }
    return { vendor: 'Intel', series, generation };
  }
  return { vendor: sanitize(manufacturer), series: null, generation: null };
}

function classifyMemoryChannels(memModules) {
  if (!Array.isArray(memModules) || memModules.length === 0) {
    return { populatedSlots: null, channelMode: null };
  }
  const populated = memModules.filter((m) => (toNum(m?.size) ?? toNum(m?.Capacity) ?? 0) > 0);
  if (populated.length === 0) {
    return { populatedSlots: null, channelMode: null };
  }
  let channelMode = null;
  if (populated.length === 1) {
    channelMode = 'Single Channel';
  } else if (populated.length === 2) {
    channelMode = 'Dual Channel';
  } else if (populated.length === 4) {
    channelMode = 'Dual / Quad Channel';
  } else {
    channelMode = `Multi-Channel (${populated.length} DIMMs)`;
  }
  return { populatedSlots: populated.length, channelMode };
}

function mapConnectionType(raw) {
  const s = String(raw || '').trim().toUpperCase();
  const num = Number(raw);
  // WMI VideoOutputTechnology numeric constants
  if (Number.isFinite(num)) {
    switch (num) {
      case 0: return 'VGA';
      case 4: return 'DVI';
      case 5: return 'HDMI';
      case 10: return 'DisplayPort';
      case 11: return 'eDP (Internal)';
      case 12: return 'UDI';
      case 13: return 'eDP (Internal)';
      case 14: return 'Miracast';
      case 15: return 'DisplayPort (USB-C / Indirect)';
      case 2147483648: return 'Internal Panel';
      default: break;
    }
  }
  if (!s) return null;
  if (s.includes('EDP')) return 'eDP (Internal)';
  if (s.includes('USB') || s.includes('TYPE-C')) return 'USB-C / DP';
  if (s.includes('DP') || s.includes('DISPLAYPORT')) return 'DisplayPort';
  if (s.includes('HDMI')) return 'HDMI';
  if (s.includes('DVI')) return 'DVI';
  if (s.includes('VGA')) return 'VGA';
  if (s.includes('INTERNAL')) return 'Internal Panel';
  return sanitize(String(raw));
}

function isIntegratedGpuModel(model, manufacturer) {
  const m = `${model || ''} ${manufacturer || ''}`.toLowerCase();
  if (/microsoft basic|virtual|parsec|vnc|citrix|mirage|remote display/i.test(m)) return true;
  if (/\b(?:geforce|rtx|gtx|quadro|tesla|titan|rx\s*\d{3,4}|radeon\s*pro|radeon\s*rx|arc(?:\((?:r|tm)\)|[®™])?\s*(?:pro\s*)?[ab]\d{2,3})\b/i.test(m)) {
    return false;
  }
  if (
    /\b(?:uhd|hd\s*graphics|iris|vega\s*\d+|radeon\(tm\)\s*graphics|radeon\s*graphics|[678]\d0m|apple\s*m\d|arc(?:\((?:r|tm)\)|[®™])?\s*graphics|arc(?:\((?:r|tm)\)|[®™])?\s*1[34]0[vt])\b/i.test(
      m
    )
  ) {
    return true;
  }
  return /\bintel\b/i.test(m);
}

function normalizeWmiInstanceKey(raw) {
  const s = String(raw || '').trim().toLowerCase();
  return s ? s.replace(/_\d+$/, '') : '';
}

function decodeEdidText(arr) {
  if (!Array.isArray(arr)) return null;
  const chars = arr.filter((n) => Number.isFinite(n) && n > 0).map((n) => String.fromCharCode(n));
  return sanitize(chars.join(''));
}

function matchDisplayMonitors(rawDisplays, winDisplays, winMonIds, winVideoCtrls) {
  const rawList = Array.isArray(rawDisplays) ? rawDisplays : [];
  const connList = Array.isArray(winDisplays) ? winDisplays : [];
  const idList = Array.isArray(winMonIds) ? winMonIds : [];
  const vcList = Array.isArray(winVideoCtrls) ? winVideoCtrls : [];

  const connByKey = new Map();
  for (const c of connList) {
    const k = normalizeWmiInstanceKey(c?.InstanceName);
    if (k && !connByKey.has(k)) connByKey.set(k, c);
  }
  const idByKey = new Map();
  for (const mId of idList) {
    const k = normalizeWmiInstanceKey(mId?.InstanceName);
    if (k && !idByKey.has(k)) idByKey.set(k, mId);
  }

  // Merge WMI connection + monitor ID entries by normalized InstanceName
  const allKeys = new Set();
  for (const k of connByKey.keys()) allKeys.add(k);
  for (const k of idByKey.keys()) allKeys.add(k);

  const singleWmiFallback = allKeys.size === 0 && connList.length === 1;
  const wmiEntries = Array.from(allKeys)
    .map((key) => {
      const conn = connByKey.get(key) || null;
      const idObj = idByKey.get(key) || null;
      const instUpper = String(conn?.InstanceName || idObj?.InstanceName || '').toUpperCase();
      const pnpSeg = instUpper.match(/^DISPLAY\\([^\\]+)/)?.[1] || null;
      const parentTok = instUpper.match(/\\([0-9A-F]+&[0-9A-F]+&[0-9A-F]+)/)?.[1] || null;
      const friendly = decodeEdidText(idObj?.UserFriendlyName);
      const isInternalConn =
        String(conn?.VideoOutputTechnology || '') === '2147483648' ||
        Number(conn?.VideoOutputTechnology) === 11 ||
        Number(conn?.VideoOutputTechnology) === 13;
      const isActive = conn && typeof conn.Active === 'boolean' ? conn.Active : true;
      return {
        key,
        instanceName: conn?.InstanceName || idObj?.InstanceName || null,
        pnpSeg,
        parentTok,
        friendly,
        conn,
        isInternalConn,
        isActive,
        used: false,
      };
    })
    .sort((a, b) => Number(b.isActive) - Number(a.isActive));

  return rawList.map((d, idx) => {
    const width = toNum(d?.currentResX) ?? toNum(d?.resolutionX);
    const height = toNum(d?.currentResY) ?? toNum(d?.resolutionY);
    const refreshRateHz = toNum(d?.currentRefreshRate);
    const dModelLower = (sanitize(d?.model) || '').toLowerCase();
    const dDevLower = (sanitize(d?.deviceName) || '').toLowerCase();
    const dBuiltin = Boolean(d?.builtin);

    let matched =
      wmiEntries.find(
        (b) =>
          !b.used &&
          b.isActive &&
          ((b.pnpSeg && dDevLower && dDevLower.includes(b.pnpSeg.toLowerCase())) ||
            (b.key && dDevLower && dDevLower.includes(b.key)))
      ) || null;

    if (!matched && dModelLower) {
      matched =
        wmiEntries.find(
          (b) =>
            !b.used &&
            b.isActive &&
            b.friendly &&
            (b.friendly.toLowerCase() === dModelLower ||
              dModelLower.includes(b.friendly.toLowerCase()) ||
              b.friendly.toLowerCase().includes(dModelLower))
        ) || null;
    }

    if (!matched && dBuiltin) {
      const internalMatches = wmiEntries.filter((b) => !b.used && b.isActive && b.isInternalConn);
      if (internalMatches.length === 1) {
        matched = internalMatches[0];
      }
    }

    if (!matched && rawList.length === 1 && wmiEntries.length === 1 && !wmiEntries[0].used) {
      matched = wmiEntries[0];
    }

    if (matched) matched.used = true;

    const wmiConn = matched?.conn || (singleWmiFallback ? connList[0] : null);
    const connectionType =
      mapConnectionType(wmiConn?.VideoOutputTechnology) ||
      mapConnectionType(d?.connection) ||
      null;

    const matchedGpu =
      (matched?.parentTok &&
        vcList.find((vc) => String(vc?.PNPDeviceID || '').toUpperCase().includes(matched.parentTok))) ||
      null;

    return {
      id: `disp-${idx}`,
      model: matched?.friendly || sanitize(d?.model) || sanitize(d?.deviceName) || (idx === 0 ? 'Primary Display' : `Display ${idx + 1}`),
      isPrimary: Boolean(d?.main || idx === 0),
      width,
      height,
      resolutionText: width && height ? `${width} × ${height}` : null,
      refreshRateHz: refreshRateHz && refreshRateHz > 0 ? Math.round(refreshRateHz) : null,
      connectionType,
      builtin: Boolean(d?.builtin || matched?.isInternalConn),
      ...(matchedGpu?.PNPDeviceID ? { gpuPnpDeviceId: String(matchedGpu.PNPDeviceID) } : {}),
    };
  });
}

function determineHybridGpuMode({ gpus, hasBattery }) {
  if (!Array.isArray(gpus) || gpus.length === 0) {
    return 'Unavailable';
  }
  const vendors = gpus.map((g) => String(g.manufacturer || '').toLowerCase());
  const models = gpus.map((g) => String(g.model || '').toLowerCase());
  const hasNvidia = vendors.some((v) => v.includes('nvidia'));
  const hasIntel = vendors.some((v) => v.includes('intel'));
  const hasAmd = vendors.some((v) => v.includes('amd'));
  const hasIntegratedHint =
    gpus.some((g) => isIntegratedGpuModel(g.model, g.manufacturer)) ||
    models.some((m) =>
      m.includes('uhd') ||
      m.includes('iris') ||
      m.includes('radeon(tm) graphics') ||
      m.includes('radeon graphics') ||
      /\b[678]\d0m\b/.test(m)
    );

  if (gpus.length >= 2 && hasNvidia && hasIntegratedHint) {
    return hasBattery ? 'NVIDIA Optimus (Hybrid Switchable)' : 'Hybrid Dual-GPU (iGPU + NVIDIA dGPU)';
  }
  if (gpus.length >= 2 && hasAmd && hasIntel) {
    return hasBattery ? 'AMD Switchable Graphics (Hybrid)' : 'Hybrid Dual-GPU (iGPU + AMD dGPU)';
  }
  if (gpus.length >= 2 && hasAmd && hasIntegratedHint) {
    return hasBattery ? 'AMD SmartShift / Switchable Graphics' : 'Multi-GPU (AMD iGPU + dGPU)';
  }
  if (gpus.length >= 2) {
    return `Multi-GPU (${gpus.length} Adapters)`;
  }
  if (isIntegratedGpuModel(gpus[0]?.model, gpus[0]?.manufacturer)) {
    return 'Integrated Graphics Only';
  }
  return 'Discrete GPU Mode';
}

function estimateDirectXVersionFromGpus(gpus, dxdiagText) {
  if (dxdiagText) {
    const match = dxdiagText.match(/DirectX Version:\s*(DirectX\s*[0-9.]+)/i);
    if (match) return match[1].trim();
  }
  if (process.platform === 'win32' && Array.isArray(gpus) && gpus.length > 0) {
    const combined = gpus.map((g) => String(g.model || '').toLowerCase()).join(' ');
    if (/(rtx\s*[2345]0|rx\s*[679]\d{3}|arc(?:\((?:r|tm)\)|[®™])?\s*[ab]\d{3})/.test(combined)) {
      return 'DirectX 12 Ultimate (12_2)';
    }
    if (/(gtx\s*1[06]|rx\s*5\d{3}|rx\s*[45]\d{2}|iris\s*xe|uhd)/.test(combined)) {
      return 'DirectX 12 (12_1 / 12_0)';
    }
    return 'DirectX 12';
  }
  return null;
}

function createDisplayLaptopAdapter({ execWinPs } = {}) {
  let cachedStaticWinInfo = null;
  let lastWinInfoAt = 0;
  let confirmedNoBattery = false;

  async function queryWindowsExtendedSystem() {
    if (process.platform !== 'win32') return null;
    const now = Date.now();
    if (cachedStaticWinInfo && now - lastWinInfoAt < 30000) {
      return cachedStaticWinInfo;
    }

    const script = [
      '$ErrorActionPreference = "SilentlyContinue";',
      '$displays = @(Get-CimInstance -Namespace root\\wmi WmiMonitorConnectionParams | Select-Object InstanceName,VideoOutputTechnology,Active);',
      '$monIds = @(Get-CimInstance -Namespace root\\wmi WmiMonitorID | Select-Object InstanceName,ManufacturerName,UserFriendlyName);',
      '$hdrMon = @(Get-CimInstance -Namespace root\\wmi WmiMonitorColorCharacteristics | Select-Object InstanceName);',
      '$bat = Get-CimInstance Win32_Battery | Select-Object -First 1 EstimatedChargeRemaining,BatteryStatus,DesignVoltage,Name;',
      '$batStatic = Get-CimInstance -Namespace root\\wmi BatteryStaticData | Select-Object -First 1 DesignedCapacity;',
      '$batFull = Get-CimInstance -Namespace root\\wmi BatteryFullChargedCapacity | Select-Object -First 1 FullChargedCapacity;',
      '$hagsKey = Get-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name HwSchMode;',
      '$gmKey = Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\GameBar" -Name AutoGameModeEnabled,AllowAutoGameMode;',
      '$hdrReg = Get-ChildItem -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CloudStore\\Store\\DefaultAccount\\Current" | Where-Object { $_.Name -match "Display|HDR" } | Select-Object -First 1 Name;',
      '$dxVer = (Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\DirectX" -Name Version).Version;',
      '$powerPlan = (powercfg /getactivescheme) 2>$null;',
      '$videoCtrls = @(Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion,CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate,AdapterDACType,PNPDeviceID);',
      '@{ displays = $displays; monIds = $monIds; hdrMon = $hdrMon; bat = $bat; batStatic = $batStatic; batFull = $batFull; hags = $hagsKey.HwSchMode; gameMode = $gmKey.AutoGameModeEnabled; allowGameMode = $gmKey.AllowAutoGameMode; dxVer = $dxVer; powerPlan = $powerPlan; videoCtrls = $videoCtrls } | ConvertTo-Json -Depth 4 -Compress',
    ].join(' ');

    const raw =
      typeof execWinPs === 'function'
        ? await execWinPs(script, 4500)
        : await runExec(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
            4000
          );
    if (!raw) return cachedStaticWinInfo;
    try {
      cachedStaticWinInfo = JSON.parse(raw);
      lastWinInfoAt = Date.now();
      return cachedStaticWinInfo;
    } catch {
      return cachedStaticWinInfo;
    }
  }

  async function collectDisplayAndLaptopInfo({ gpus }) {
    const [siGraphics, siBattery, winExt] = await Promise.all([
      si.graphics().catch(() => null),
      confirmedNoBattery ? Promise.resolve(null) : si.battery().catch(() => null),
      queryWindowsExtendedSystem().catch(() => null),
    ]);
    if (siBattery && siBattery.hasBattery === false && !winExt?.bat) {
      confirmedNoBattery = true;
    } else if (siBattery?.hasBattery || winExt?.bat) {
      confirmedNoBattery = false;
    }

    const rawDisplays = Array.isArray(siGraphics?.displays) ? siGraphics.displays : [];
    const winDisplays = Array.isArray(winExt?.displays)
      ? winExt.displays
      : winExt?.displays
      ? [winExt.displays]
      : [];
    const winMonIds = Array.isArray(winExt?.monIds)
      ? winExt.monIds
      : winExt?.monIds
      ? [winExt.monIds]
      : [];
    const winVideoCtrls = Array.isArray(winExt?.videoCtrls)
      ? winExt.videoCtrls
      : winExt?.videoCtrls
      ? [winExt.videoCtrls]
      : [];

    const monitors = matchDisplayMonitors(rawDisplays, winDisplays, winMonIds, winVideoCtrls);

    // If si.graphics().displays was empty on headless Linux or certain Windows drivers, inspect Win32_VideoController
    if (monitors.length === 0 && winVideoCtrls.length > 0) {
      for (const vc of winVideoCtrls) {
        const w = toNum(vc?.CurrentHorizontalResolution);
        const h = toNum(vc?.CurrentVerticalResolution);
        const hz = toNum(vc?.CurrentRefreshRate);
        if (w && h) {
          monitors.push({
            id: `disp-vc-${monitors.length}`,
            model: sanitize(vc?.Name) || 'Primary Display',
            isPrimary: monitors.length === 0,
            width: w,
            height: h,
            resolutionText: `${w} × ${h}`,
            refreshRateHz: hz && hz > 0 ? Math.round(hz) : null,
            connectionType: null,
            builtin: false,
          });
        }
      }
    }

    const primaryMonitor = monitors.find((m) => m.isPrimary) || monitors[0] || null;

    // Driver versions map for Windows GPUs if nvidia-smi didn't supply them
    const gpuDriversByModel = new Map();
    for (const vc of winVideoCtrls) {
      const name = sanitize(vc?.Name);
      const drv = sanitize(vc?.DriverVersion);
      if (name && drv) {
        gpuDriversByModel.set(name.toLowerCase(), drv);
      }
    }

    // Battery & Laptop Support
    let hasBattery = Boolean(siBattery?.hasBattery || winExt?.bat);
    let batteryPercent = toNum(siBattery?.percent) ?? toNum(winExt?.bat?.EstimatedChargeRemaining);
    let acConnected =
      typeof siBattery?.acConnected === 'boolean'
        ? siBattery.acConnected
        : winExt?.bat?.BatteryStatus !== undefined
        ? Number(winExt.bat.BatteryStatus) === 2 || Number(winExt.bat.BatteryStatus) >= 6
        : null;
    let isCharging = typeof siBattery?.isCharging === 'boolean' ? siBattery.isCharging : null;

    let batteryHealthPercent = null;
    const designedCap = toNum(siBattery?.designedCapacity) ?? toNum(winExt?.batStatic?.DesignedCapacity);
    const maxCap = toNum(siBattery?.maxCapacity) ?? toNum(winExt?.batFull?.FullChargedCapacity);
    if (designedCap && maxCap && designedCap > 0) {
      batteryHealthPercent = Math.min(100, Math.max(1, Math.round((maxCap / designedCap) * 100)));
    }

    // Linux fallback for /sys/class/power_supply if si.battery returned false/empty
    if (process.platform === 'linux' && !hasBattery) {
      try {
        const psRoot = '/sys/class/power_supply';
        if (fs.existsSync(psRoot)) {
          const entries = await fsp.readdir(psRoot);
          const batEntry = entries.find((e) => /^BAT\d+$/i.test(e));
          if (batEntry) {
            hasBattery = true;
            const capRaw = await fsp.readFile(path.join(psRoot, batEntry, 'capacity'), 'utf8').catch(() => '');
            const statusRaw = await fsp.readFile(path.join(psRoot, batEntry, 'status'), 'utf8').catch(() => '');
            batteryPercent = toNum(capRaw);
            isCharging = statusRaw.trim().toLowerCase() === 'charging';
            acConnected = statusRaw.trim().toLowerCase() !== 'discharging';
          }
        }
      } catch {
        // ignore
      }
    }

    // Windows Power Plan name extraction: "Power Scheme GUID: ... (Balanced)"
    let powerPlan = null;
    if (typeof winExt?.powerPlan === 'string') {
      const m = winExt.powerPlan.match(/\(([^)]+)\)\s*$/);
      if (m) powerPlan = m[1].trim();
    }

    const hagsCode = toNum(winExt?.hags);
    const hagsStatus =
      process.platform === 'win32'
        ? hagsCode === 2
          ? 'Enabled'
          : hagsCode === 1
          ? 'Disabled'
          : 'Unavailable'
        : null;

    const gmVal = winExt?.gameMode ?? winExt?.allowGameMode;
    const windowsGameMode =
      process.platform === 'win32'
        ? gmVal === 1 || gmVal === true
          ? 'Enabled'
          : gmVal === 0 || gmVal === false
          ? 'Disabled'
          : 'Enabled (Windows Default)'
        : null;

    const activeRenderingGpu =
      Array.isArray(gpus) && gpus.length > 0
        ? (gpus.find((g) => !isIntegratedGpuModel(g.model, g.manufacturer)) || gpus[0]).model
        : null;

    return {
      monitors,
      primaryMonitor,
      activeRenderingGpu,
      directXVersion: estimateDirectXVersionFromGpus(gpus, null),
      hagsStatus,
      windowsGameMode,
      hdrSupported: null, // Requires native DXGI IDXGIOutput6 API to verify reliably without guessing
      hdrActive: null,
      vrrSupported: primaryMonitor?.refreshRateHz && primaryMonitor.refreshRateHz >= 100 ? null : null,
      vrrActive: null,
      gpuDriversByModel,
      laptop: {
        isLaptopOrBatteryDevice: hasBattery,
        batteryPercent: hasBattery ? batteryPercent : null,
        acConnected: hasBattery ? acConnected : null,
        isCharging: hasBattery ? isCharging : null,
        batteryHealthPercent: hasBattery ? batteryHealthPercent : null,
        powerPlan,
        hybridGpuMode: determineHybridGpuMode({ gpus, hasBattery }),
      },
    };
  }

  return {
    collectDisplayAndLaptopInfo,
  };
}

module.exports = {
  createDisplayLaptopAdapter,
  classifyCpuFamily,
  classifyMemoryChannels,
  determineHybridGpuMode,
  mapConnectionType,
  matchDisplayMonitors,
  isIntegratedGpuModel,
};
