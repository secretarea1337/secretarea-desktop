const os = require('os');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execFile } = require('child_process');
const si = require('systeminformation');
const { readManagedLhmSensors } = require('./lhmLibBridge.cjs');

function runExecFile(cmd, args, timeoutMs = 6500) {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 6 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          resolve({ ok: false, stdout: typeof stdout === 'string' ? stdout.trim() : '', stderr: typeof stderr === 'string' ? stderr.trim() : '' });
          return;
        }
        resolve({ ok: true, stdout: typeof stdout === 'string' ? stdout.trim() : '', stderr: typeof stderr === 'string' ? stderr.trim() : '' });
      }
    );
  });
}

function toNum(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t || /^(n\/a|unknown|none|null|-)$/i.test(t)) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function cleanStr(v) {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\0/g, '').trim();
  if (
    !s ||
    /^(unknown|n\/a|none|not available|to be filled by o\.e\.m\.|default string|system serial number|system product name|system manufacturer|base board serial number|chassis serial number|0+|[-—–]+)$/i.test(
      s
    )
  ) {
    return null;
  }
  return s;
}

function normalizeCpuClockGhz(val) {
  const num = toNum(val);
  if (num === null || num <= 0) return null;
  return Number(num.toFixed(2));
}

function classifyIsIntegratedGpu(name, vendor) {
  const combined = `${name || ''} ${vendor || ''}`.toLowerCase();
  const isVirtual =
    /microsoft basic|virtual|parsec|vnc|citrix|mirage|remote display/i.test(combined);
  if (isVirtual) return true;
  const explicitlyDiscrete =
    /\b(?:geforce|rtx|gtx|quadro|tesla|titan|rx\s*\d{3,4}|radeon\s*pro|radeon\s*rx|arc(?:\((?:r|tm)\)|[®™])?\s*(?:pro\s*)?[ab]\d{2,3})\b/i.test(
      combined
    );
  if (explicitlyDiscrete) return false;
  if (
    /\b(?:uhd|hd\s*graphics|iris|vega\s*\d+|radeon\(tm\)\s*graphics|radeon\s*graphics|[678]\d0m|apple\s*m\d|arc(?:\((?:r|tm)\)|[®™])?\s*graphics|arc(?:\((?:r|tm)\)|[®™])?\s*1[34]0[vt])\b/i.test(
      combined
    )
  ) {
    return true;
  }
  if (/\bintel\b/i.test(combined)) {
    return true;
  }
  return false;
}

function sortGpusDiscreteFirst(gpus) {
  if (!Array.isArray(gpus)) return [];
  const score = (g) => {
    const m = `${g?.model || ''} ${g?.vendor || ''}`.toLowerCase();
    if (/microsoft basic|virtual|parsec|vnc|citrix|mirage|remote display/i.test(m)) {
      return -100;
    }
    if (!g?.isIntegrated) {
      return 100 + (g?.vramMB ? Math.min(24, Math.round(g.vramMB / 1024)) : 0);
    }
    return 10;
  };
  return [...gpus].sort((a, b) => score(b) - score(a));
}

function normalizeWmiInstanceKey(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  return s.replace(/_\d+$/, '');
}

function extractPciParentToken(raw) {
  const s = String(raw || '').toUpperCase();
  const m = s.match(/\\([0-9A-F]+&[0-9A-F]+&[0-9A-F]+)/);
  return m ? m[1] : null;
}

function resolveMonitorGpuPnpId({ pnpSeg, instanceName, isInternal, videoCtrls }) {
  const ctrls = Array.isArray(videoCtrls) ? videoCtrls : [];
  if (ctrls.length > 0) {
    const parentTok = extractPciParentToken(instanceName);
    if (parentTok) {
      const tokenMatch = ctrls.find((vc) => String(vc?.PNPDeviceID || '').toUpperCase().includes(parentTok));
      if (tokenMatch && cleanStr(tokenMatch?.PNPDeviceID)) {
        return cleanStr(tokenMatch.PNPDeviceID);
      }
    }
    const activeNonVirtual = ctrls.filter((vc) => {
      const nm = `${vc?.Name || ''} ${vc?.AdapterCompatibility || ''}`;
      return !/microsoft basic|virtual|parsec|vnc|citrix|mirage|remote display/i.test(nm);
    });
    if (activeNonVirtual.length === 1 && cleanStr(activeNonVirtual[0]?.PNPDeviceID)) {
      return cleanStr(activeNonVirtual[0].PNPDeviceID);
    }
    if (activeNonVirtual.length > 1 && isInternal) {
      const igpu = activeNonVirtual.find((vc) => classifyIsIntegratedGpu(vc?.Name, vc?.AdapterCompatibility));
      if (igpu && cleanStr(igpu?.PNPDeviceID)) {
        return cleanStr(igpu.PNPDeviceID);
      }
    }
  }
  return pnpSeg ? `DISPLAY\\${pnpSeg}` : null;
}

function matchWmiMonitors(siDispList, monIds, monParams, monConns, videoCtrls = []) {
  const ids = Array.isArray(monIds) ? monIds : [];
  const params = Array.isArray(monParams) ? monParams : [];
  const conns = Array.isArray(monConns) ? monConns : [];
  const disps = Array.isArray(siDispList) ? siDispList : [];

  const paramByKey = new Map();
  for (const p of params) {
    const k = normalizeWmiInstanceKey(p?.InstanceName);
    if (k && !paramByKey.has(k)) paramByKey.set(k, p);
  }
  const connByKey = new Map();
  for (const c of conns) {
    const k = normalizeWmiInstanceKey(c?.InstanceName);
    if (k && !connByKey.has(k)) connByKey.set(k, c);
  }

  const singleWmi = ids.length === 1 && params.length <= 1 && conns.length <= 1;
  const wmiBundles = ids
    .map((mId, i) => {
      const key = normalizeWmiInstanceKey(mId?.InstanceName);
      const param = (key && paramByKey.get(key)) || (singleWmi ? params[0] : null) || null;
      const conn = (key && connByKey.get(key)) || (singleWmi ? conns[0] : null) || null;
      const friendly = decodeEdidBytesToText(mId?.UserFriendlyName);
      const mfg = decodeEdidBytesToText(mId?.ManufacturerName);
      const serial = decodeEdidBytesToText(mId?.SerialNumberID);
      const instUpper = String(mId?.InstanceName || '').toUpperCase();
      const pnpSeg = instUpper.match(/^DISPLAY\\([^\\]+)/)?.[1] || null;
      const isConnInternal =
        String(conn?.VideoOutputTechnology || '') === '2147483648' ||
        Number(conn?.VideoOutputTechnology) === 11 ||
        Number(conn?.VideoOutputTechnology) === 13;
      const isActive = conn && typeof conn.Active === 'boolean' ? conn.Active : true;
      return {
        idx: i,
        key,
        instanceName: mId?.InstanceName || null,
        pnpSeg,
        friendly,
        mfg,
        serial,
        param,
        conn,
        isConnInternal,
        isActive,
        used: false,
      };
    })
    .sort((a, b) => Number(b.isActive) - Number(a.isActive));

  if (disps.length === 0 && wmiBundles.length > 0) {
    return wmiBundles.map((b, idx) => {
      const wMm = toNum(b.param?.MaxHorizontalImageSize) ? Number(b.param.MaxHorizontalImageSize) * 10 : null;
      const hMm = toNum(b.param?.MaxVerticalImageSize) ? Number(b.param.MaxVerticalImageSize) * 10 : null;
      const diagIn = wMm && hMm && wMm > 0 && hMm > 0 ? Number((Math.sqrt(wMm * wMm + hMm * hMm) / 25.4).toFixed(1)) : null;
      return {
        id: `disp-${idx}`,
        name: b.friendly || (idx === 0 ? 'Primary Display' : `Display ${idx + 1}`),
        manufacturer: b.mfg,
        serialMasked: maskValue(b.serial),
        diagonalInches: diagIn,
        physicalWidthMm: wMm,
        physicalHeightMm: hMm,
        nativeResolution: null,
        currentResolution: null,
        refreshRateHz: null,
        maxRefreshRateHz: null,
        colorDepthBits: null,
        connectionType: mapVideoConnector(b.conn?.VideoOutputTechnology),
        gpuPnpDeviceId: resolveMonitorGpuPnpId({
          pnpSeg: b.pnpSeg,
          instanceName: b.instanceName,
          isInternal: b.isConnInternal,
          videoCtrls,
        }),
        isInternal: b.isConnInternal,
        isPrimary: idx === 0,
        hdrCapable: null,
        vrrCapable: null,
        provenance: 'detected',
      };
    });
  }

  return disps.map((d, idx) => {
    const dModel = cleanStr(d?.model) || '';
    const dDevice = cleanStr(d?.deviceName) || '';
    const dModelLower = dModel.toLowerCase();
    const dDevLower = dDevice.toLowerCase();
    const dBuiltin = Boolean(d?.builtin);

    // 1. Match by device / PNP ID or normalized instance key
    let matched =
      wmiBundles.find(
        (b) =>
          !b.used &&
          b.isActive &&
          ((b.pnpSeg && dDevLower && dDevLower.includes(b.pnpSeg.toLowerCase())) ||
            (b.key && dDevLower && dDevLower.includes(b.key)))
      ) || null;

    // 2. Match by EDID UserFriendlyName against reported display model
    if (!matched && dModelLower) {
      matched =
        wmiBundles.find(
          (b) =>
            !b.used &&
            b.isActive &&
            b.friendly &&
            (b.friendly.toLowerCase() === dModelLower ||
              dModelLower.includes(b.friendly.toLowerCase()) ||
              b.friendly.toLowerCase().includes(dModelLower))
        ) || null;
    }

    // 3. Match internal laptop panel strictly by built-in flag when unambiguous
    if (!matched && dBuiltin) {
      const internalCandidates = wmiBundles.filter((b) => !b.used && b.isActive && b.isConnInternal);
      if (internalCandidates.length === 1) {
        matched = internalCandidates[0];
      }
    }

    // 4. Only fall back positionally in unambiguous single-display setups
    if (!matched && disps.length === 1 && wmiBundles.length === 1 && !wmiBundles[0].used) {
      matched = wmiBundles[0];
    }

    if (matched) matched.used = true;

    const param = matched?.param || null;
    const conn = matched?.conn || null;
    const wMm = toNum(param?.MaxHorizontalImageSize) ? Number(param.MaxHorizontalImageSize) * 10 : null;
    const hMm = toNum(param?.MaxVerticalImageSize) ? Number(param.MaxVerticalImageSize) * 10 : null;
    const diagIn =
      wMm && hMm && wMm > 0 && hMm > 0
        ? Number((Math.sqrt(wMm * wMm + hMm * hMm) / 25.4).toFixed(1))
        : null;
    const curW = toNum(d?.currentResX) ?? toNum(d?.resolutionX);
    const curH = toNum(d?.currentResY) ?? toNum(d?.resolutionY);
    const maxW = toNum(d?.resolutionX) ?? curW;
    const maxH = toNum(d?.resolutionY) ?? curH;
    const isInternal = Boolean(d?.builtin || matched?.isConnInternal);

    return {
      id: `disp-${idx}`,
      name: matched?.friendly || cleanStr(d?.model) || (idx === 0 ? 'Primary Display' : `Display ${idx + 1}`),
      manufacturer: matched?.mfg || cleanStr(d?.vendor),
      serialMasked: maskValue(matched?.serial),
      diagonalInches: diagIn,
      physicalWidthMm: wMm,
      physicalHeightMm: hMm,
      nativeResolution: maxW && maxH ? `${maxW} × ${maxH}` : null,
      currentResolution: curW && curH ? `${curW} × ${curH}` : null,
      refreshRateHz: toNum(d?.currentRefreshRate),
      maxRefreshRateHz: toNum(d?.currentRefreshRate),
      colorDepthBits: toNum(d?.pixelDepth),
      connectionType: mapVideoConnector(conn?.VideoOutputTechnology) || cleanStr(d?.connection),
      gpuPnpDeviceId: resolveMonitorGpuPnpId({
        pnpSeg: matched?.pnpSeg || null,
        instanceName: matched?.instanceName || null,
        isInternal,
        videoCtrls,
      }),
      isInternal,
      isPrimary: Boolean(d?.main || idx === 0),
      hdrCapable: null,
      vrrCapable: null,
      provenance: 'detected',
    };
  });
}

function resolveTpmState({ platform, winData, linuxTpmInfo }) {
  if (platform === 'darwin') {
    return {
      present: null,
      enabled: null,
      specVersion: null,
      manufacturer: null,
      status: 'not_supported',
      provenance: 'not_supported',
    };
  }
  if (platform === 'linux') {
    if (linuxTpmInfo && linuxTpmInfo.present === true) {
      return {
        present: true,
        enabled: linuxTpmInfo.enabled ?? null,
        specVersion: linuxTpmInfo.specVersion || null,
        manufacturer: linuxTpmInfo.manufacturer || null,
        status: 'detected',
        provenance: 'detected',
      };
    }
    if (linuxTpmInfo && linuxTpmInfo.permissionDenied) {
      return {
        present: null,
        enabled: null,
        specVersion: null,
        manufacturer: null,
        status: 'requires_admin',
        provenance: 'requires_admin',
      };
    }
    return {
      present: null,
      enabled: null,
      specVersion: null,
      manufacturer: null,
      status: 'unknown',
      provenance: 'unknown',
    };
  }
  if (platform !== 'win32') {
    return {
      present: null,
      enabled: null,
      specVersion: null,
      manufacturer: null,
      status: 'not_supported',
      provenance: 'not_supported',
    };
  }

  if (!winData) {
    return {
      present: null,
      enabled: null,
      specVersion: null,
      manufacturer: null,
      status: 'unknown',
      provenance: 'unknown',
    };
  }

  if (winData.tpm) {
    return {
      present: true,
      enabled:
        typeof winData.tpm.IsEnabled_InitialValue === 'boolean'
          ? winData.tpm.IsEnabled_InitialValue
          : null,
      specVersion: cleanStr(winData.tpm.SpecVersion),
      manufacturer: cleanStr(winData.tpm.ManufacturerVersion),
      status: 'detected',
      provenance: 'detected',
    };
  }

  const errText = String(winData.tpmErr || '').toLowerCase();
  const hasAccessDenied =
    /access|denied|unauthorized|privilege|0x80041003|0x80070005|security/.test(errText);
  const tpmPnpList = Array.isArray(winData.tpmPnp)
    ? winData.tpmPnp
    : winData.tpmPnp
    ? [winData.tpmPnp]
    : [];

  if (hasAccessDenied || (winData.isAdmin === false && tpmPnpList.length > 0)) {
    return {
      present: tpmPnpList.length > 0 ? true : null,
      enabled: null,
      specVersion: null,
      manufacturer: cleanStr(tpmPnpList[0]?.Name) || null,
      status: 'requires_admin',
      provenance: 'requires_admin',
    };
  }

  if (winData.isAdmin === false) {
    return {
      present: null,
      enabled: null,
      specVersion: null,
      manufacturer: null,
      status: 'requires_admin',
      provenance: 'requires_admin',
    };
  }

  if (winData.tpmErr) {
    return {
      present: null,
      enabled: null,
      specVersion: null,
      manufacturer: null,
      status: 'unknown',
      provenance: 'unknown',
    };
  }

  return {
    present: false,
    enabled: false,
    specVersion: null,
    manufacturer: null,
    status: 'not_detected',
    provenance: 'not_detected',
  };
}

function maskValue(raw) {
  const s = cleanStr(raw);
  if (!s) return null;
  if (s.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(8, s.length - 4))}${s.slice(-4)}`;
}

function maskMac(raw) {
  const s = cleanStr(raw);
  if (!s) return null;
  const parts = s.split(/[:-]/);
  if (parts.length === 6) {
    return `${parts[0]}:${parts[1]}:••:••:••:${parts[5]}`;
  }
  return maskValue(s);
}

function asArray(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') return [val];
  return [];
}

function mapChassisFormFactor(chassisTypes) {
  const list = asArray(chassisTypes).map((x) => Number(x)).filter(Number.isFinite);
  const laptopCodes = new Set([8, 9, 10, 11, 14, 30, 31, 32]);
  const desktopCodes = new Set([3, 4, 5, 6, 7, 13, 15, 16, 24, 35]);
  for (const code of list) {
    if (code === 30 || code === 31 || code === 32) {
      return { formFactor: 'tablet_convertible', label: `Convertible / Tablet (SMBIOS #${code})` };
    }
    if (laptopCodes.has(code)) {
      return { formFactor: 'laptop', label: `Laptop / Notebook (SMBIOS #${code})` };
    }
    if (desktopCodes.has(code)) {
      return { formFactor: 'desktop', label: `Desktop / Workstation (SMBIOS #${code})` };
    }
  }
  return { formFactor: 'unknown', label: list.length ? `SMBIOS Chassis #${list[0]}` : null };
}

function mapSmbiosMemoryType(code) {
  const num = Number(code);
  switch (num) {
    case 20: return 'DDR';
    case 21: return 'DDR2';
    case 24: return 'DDR3';
    case 26: return 'DDR4';
    case 27: return 'LPDDR';
    case 28: return 'LPDDR2';
    case 29: return 'LPDDR3';
    case 30: return 'LPDDR4';
    case 34: return 'DDR5';
    case 35: return 'LPDDR5';
    default: return null;
  }
}

function mapMemoryFormFactor(code) {
  switch (Number(code)) {
    case 8: return 'DIMM';
    case 12: return 'SO-DIMM';
    case 13: return 'Micro-DIMM';
    case 15: return 'FB-DIMM';
    case 22: return 'Soldered / Chip';
    default: return null;
  }
}

function mapPortConnectorType(externalRef, internalRef, connectorTypeCode) {
  const text = `${externalRef || ''} ${internalRef || ''}`.toLowerCase();
  const code = Number(connectorTypeCode);
  if (text.includes('usb4') || text.includes('thunderbolt')) {
    return { kind: 'usb', connector: 'USB4 / Thunderbolt (USB-C)', bandwidth: 'Up to 40–80 Gbps', caps: ['Data', 'Power Delivery', 'DisplayPort Alt Mode'] };
  }
  if (text.includes('type-c') || text.includes('usb-c') || text.includes('type c')) {
    return { kind: 'usb', connector: 'USB Type-C', bandwidth: 'Up to 5–20 Gbps (controller dependent)', caps: ['Data'] };
  }
  if (text.includes('usb 3') || text.includes('ssusb') || text.includes('usb3')) {
    return { kind: 'usb', connector: 'USB Type-A (USB 3.x)', bandwidth: 'Up to 5–10 Gbps', caps: ['Data'] };
  }
  if (text.includes('usb') || code === 18) {
    return { kind: 'usb', connector: 'USB', bandwidth: 'Up to 480 Mbps–10 Gbps', caps: ['Data'] };
  }
  if (text.includes('hdmi')) {
    return { kind: 'video', connector: 'HDMI', bandwidth: 'Up to 18–48 Gbps', caps: ['Video', 'Audio'] };
  }
  if (text.includes('mini displayport') || text.includes('mdp')) {
    return { kind: 'video', connector: 'Mini DisplayPort', bandwidth: 'Up to 17.28–32.4 Gbps', caps: ['Video', 'Audio'] };
  }
  if (text.includes('displayport') || text.includes('dp')) {
    return { kind: 'video', connector: 'DisplayPort', bandwidth: 'Up to 21.6–80 Gbps', caps: ['Video', 'Audio', 'Adaptive Sync'] };
  }
  if (text.includes('vga') || text.includes('d-sub') || code === 7) {
    return { kind: 'video', connector: 'VGA (D-Sub)', bandwidth: 'Analog Video', caps: ['Video'] };
  }
  if (text.includes('dvi')) {
    return { kind: 'video', connector: 'DVI', bandwidth: 'Up to 9.9 Gbps', caps: ['Video'] };
  }
  if (text.includes('rj-45') || text.includes('rj45') || text.includes('lan') || text.includes('ethernet') || code === 11) {
    return { kind: 'network', connector: 'RJ45 Ethernet', bandwidth: '1–10 Gbps (NIC dependent)', caps: ['Wired LAN'] };
  }
  if (text.includes('spdif') || text.includes('optical') || text.includes('toslink')) {
    return { kind: 'audio', connector: 'Optical S/PDIF', bandwidth: 'Digital Audio', caps: ['Digital Audio'] };
  }
  if (text.includes('audio') || text.includes('mic') || text.includes('line') || text.includes('headphone') || text.includes('jack') || code === 31) {
    return { kind: 'audio', connector: '3.5mm Audio Jack', bandwidth: 'Analog Audio', caps: ['Audio'] };
  }
  if (text.includes('m.2') || text.includes('ngff') || text.includes('nvme')) {
    return { kind: 'storage', connector: 'M.2 Slot', bandwidth: 'Up to PCIe 3.0–5.0 x4', caps: ['NVMe / SATA / Wi-Fi'] };
  }
  if (text.includes('sata') || text.includes('esata') || code === 25) {
    return { kind: 'storage', connector: 'SATA Port', bandwidth: 'Up to 6 Gbps (SATA III)', caps: ['Storage'] };
  }
  if (text.includes('sd') || text.includes('card reader')) {
    return { kind: 'storage', connector: 'SD Card Slot', bandwidth: 'UHS-I / UHS-II', caps: ['Removable Media'] };
  }
  if (text.includes('pci') || text.includes('pcie')) {
    return { kind: 'pcie', connector: 'PCIe Expansion Slot', bandwidth: 'Bus dependent', caps: ['Expansion'] };
  }
  return { kind: 'other', connector: cleanStr(externalRef) || cleanStr(internalRef) || 'System Port', bandwidth: null, caps: [] };
}

function mapVideoConnector(codeOrName) {
  const num = Number(codeOrName);
  if (Number.isFinite(num)) {
    switch (num) {
      case 0: return 'VGA';
      case 4: return 'DVI';
      case 5: return 'HDMI';
      case 10: return 'DisplayPort';
      case 11:
      case 13: return 'eDP (Internal)';
      case 14: return 'Miracast';
      case 15: return 'USB-C / DisplayPort';
      case 2147483648: return 'Internal Panel';
      default: break;
    }
  }
  return cleanStr(String(codeOrName || ''));
}

function classifyPeripheralCategory(name, pnpClass, service) {
  const combined = `${name || ''} ${pnpClass || ''} ${service || ''}`.toLowerCase();
  if (/keyboard|kbd/.test(combined)) return 'keyboard';
  if (/mouse|touchpad|pointing/.test(combined)) return 'mouse';
  if (/xbox|gamepad|controller|joystick|dualsense|dualshock|xinput|hid-compliant game/.test(combined)) return 'controller';
  if (/webcam|camera|imaging/.test(combined)) return 'camera';
  if (/printer|printqueue/.test(combined)) return 'printer';
  if (/dock|hub|thunderbolt/.test(combined)) return 'dock_hub';
  if (/usbstor|mass storage|flash drive|external.*disk/.test(combined)) return 'storage_usb';
  if (/headset|headphone|speaker|microphone|audio|realtek|sound/.test(combined)) return 'audio';
  if (/bluetooth|bth/.test(combined)) return 'bluetooth';
  return 'other';
}

function parseWindowsFirmwareDate(raw) {
  const s = cleanStr(String(raw || ''));
  if (!s) return null;
  if (/^\d{14}/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  const isoMatch = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];
  return s.slice(0, 32);
}

function mapBusTypeLabel(raw) {
  const str = String(raw || '').trim();
  const num = Number(raw);
  if (Number.isFinite(num)) {
    switch (num) {
      case 3: return 'ATA';
      case 7: return 'USB';
      case 11: return 'SATA';
      case 17: return 'NVMe';
      case 12: return 'SD';
      default: break;
    }
  }
  return str || null;
}

function mapMediaType(rawMedia, rawBus, model) {
  const combined = `${rawMedia || ''} ${rawBus || ''} ${model || ''}`.toUpperCase();
  if (combined.includes('USB') && !combined.includes('NVME')) return 'External / USB';
  if (combined.includes('NVME')) return 'NVMe SSD';
  if (combined.includes('HDD') || combined.includes('ROTATIONAL') || combined.includes('HARD DISK')) return 'HDD';
  if (combined.includes('SSD') || combined.includes('SOLID STATE')) {
    return combined.includes('SATA') ? 'SATA SSD' : 'SSD';
  }
  return 'Unknown';
}

function detectPlatformSupportAndChipset(boardProduct, cpuModel) {
  const combined = `${boardProduct || ''} ${cpuModel || ''}`.toUpperCase();
  let chipset = null;
  let socket = null;
  let ramGen = null;

  const chipsetMatch = combined.match(/\b(Z890|B860|H810|Z790|B760|H770|H710|Z690|B660|H670|H610|Z590|B560|H570|H510|Z490|B460|Z390|B365|B360|X870E|X870|B850|B840|X670E|X670|B650E|B650|A620|X570|B550|A520|X470|B450|A320|TRX50|TRX40)\b/);
  if (chipsetMatch) chipset = chipsetMatch[1];

  if (/\b(Z890|B860|H810|CORE ULTRA\s*2\d{2})\b/.test(combined)) {
    socket = 'LGA 1851';
    ramGen = 'DDR5';
  } else if (/\b(Z790|B760|H770|H710|Z690|B660|H670|H610)\b/.test(combined) || /1[234]\d{3}/.test(combined)) {
    socket = 'LGA 1700';
    ramGen = 'DDR4 / DDR5 (Board Dependent)';
  } else if (/\b(Z590|B560|H570|H510|Z490|B460)\b/.test(combined) || /1[01]\d{3}/.test(combined)) {
    socket = 'LGA 1200';
    ramGen = 'DDR4';
  } else if (/\b(X870|B850|B840|X670|B650|A620)\b/.test(combined) || /\bRYZEN\s*[789]\d{3}/i.test(combined)) {
    socket = 'AM5';
    ramGen = 'DDR5';
  } else if (/\b(X570|B550|A520|X470|B450|A320)\b/.test(combined) || /\bRYZEN\s*[12345]\d{3}/i.test(combined)) {
    socket = 'AM4';
    ramGen = 'DDR4';
  }
  return { chipset, socket, ramGen };
}

function classifyEventCategory(providerName, message) {
  const s = `${providerName || ''} ${message || ''}`.toLowerCase();
  if (s.includes('whea')) return 'whea';
  if (/(disk|stornvme|ntfs|partmgr|ahci)/.test(s)) return 'disk';
  if (/(nvlddmkm|amdkmdag|igfx|display|dwm|dxkrnl)/.test(s)) return 'display';
  if (/(kernel-power|power)/.test(s)) return 'power';
  if (/(thermal|processor-power|overheat)/.test(s)) return 'thermal';
  return 'other';
}

function decodeEdidBytesToText(arr) {
  if (!Array.isArray(arr)) return null;
  const chars = arr.filter((n) => Number.isFinite(n) && n > 0).map((n) => String.fromCharCode(n));
  return cleanStr(chars.join(''));
}

function decodeBatteryChemistry(raw) {
  switch (Number(raw)) {
    case 3: return 'Lead Acid';
    case 4: return 'Nickel Cadmium';
    case 5: return 'Nickel Metal Hydride';
    case 6: return 'Lithium-Ion';
    case 7: return 'Zinc Air';
    case 8: return 'Lithium Polymer';
    default: return cleanStr(String(raw || ''));
  }
}

function createDeepInventoryCollector({ getLhmLibraryInfo, onElevationDetected } = {}) {
  let cachedInventory = null;
  let lastCollectedAt = 0;
  let pendingPromise = null;

  async function queryWindowsDeepData() {
    const psScript = [
      '$ErrorActionPreference = "SilentlyContinue";',
      '$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator);',
      '$cs = Get-CimInstance Win32_ComputerSystem | Select-Object -First 1 Manufacturer,Model,SystemFamily,SystemSKUNumber,PCSystemType,HypervisorPresent;',
      '$csp = Get-CimInstance Win32_ComputerSystemProduct | Select-Object -First 1 Vendor,Name,Version,IdentifyingNumber,UUID,SKUNumber;',
      '$enc = Get-CimInstance Win32_SystemEnclosure | Select-Object -First 1 ChassisTypes,SerialNumber;',
      '$bb = Get-CimInstance Win32_BaseBoard | Select-Object -First 1 Manufacturer,Product,Version,SerialNumber;',
      '$bios = Get-CimInstance Win32_BIOS | Select-Object -First 1 Manufacturer,SMBIOSBIOSVersion,ReleaseDate,SerialNumber,SystemBiosMajorVersion,SystemBiosMinorVersion;',
      '$os = Get-CimInstance Win32_OperatingSystem | Select-Object -First 1 Caption,Version,BuildNumber,OSArchitecture;',
      '$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1 Name,Manufacturer,SocketDesignation,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed,L2CacheSize,L3CacheSize,Stepping,Revision,VirtualizationFirmwareEnabled;',
      '$memArr = Get-CimInstance Win32_PhysicalMemoryArray | Select-Object -First 1 MemoryDevices,MaxCapacity,MaxCapacityEx,MemoryErrorCorrection;',
      '$memMods = @(Get-CimInstance Win32_PhysicalMemory | Select-Object BankLabel,DeviceLocator,Manufacturer,PartNumber,SerialNumber,Capacity,Speed,ConfiguredClockSpeed,SMBIOSMemoryType,FormFactor,ConfiguredVoltage);',
      '$pageFile = Get-CimInstance Win32_PageFileUsage | Select-Object -First 1 AllocatedBaseSize,CurrentUsage;',
      '$slots = @(Get-CimInstance Win32_SystemSlot | Select-Object SlotDesignation,SlotType,CurrentUsage,MaxDataWidth,SupportsHotPlug);',
      '$ports = @(Get-CimInstance Win32_PortConnector | Select-Object ExternalReferenceDesignator,InternalReferenceDesignator,PortType,ConnectorType);',
      '$usbCtrls = @(Get-CimInstance Win32_USBController | Select-Object Name,Manufacturer,Status,PNPDeviceID);',
      '$soundDevs = @(Get-CimInstance Win32_SoundDevice | Select-Object Name,Manufacturer,Status,PNPDeviceID);',
      '$videoCtrls = @(Get-CimInstance Win32_VideoController | Select-Object Name,AdapterCompatibility,DriverVersion,DriverDate,AdapterRAM,PNPDeviceID,VideoModeDescription);',
      '$cdrom = @(Get-CimInstance Win32_CDROMDrive | Select-Object Name,Manufacturer,Drive,Status);',
      '$physDisks = @(Get-PhysicalDisk | ForEach-Object {',
      '  $rel = $_ | Get-StorageReliabilityCounter;',
      '  [PSCustomObject]@{',
      '    DeviceId = $_.DeviceId; FriendlyName = $_.FriendlyName; Model = $_.Model; Manufacturer = $_.Manufacturer;',
      '    SerialNumber = $_.SerialNumber; MediaType = [string]$_.MediaType; BusType = [string]$_.BusType;',
      '    Size = $_.Size; HealthStatus = [string]$_.HealthStatus; OperationalStatus = [string]$_.OperationalStatus;',
      '    Rel = if ($rel) { [PSCustomObject]@{',
      '      Temperature = $rel.Temperature; TemperatureMax = $rel.TemperatureMax; Wear = $rel.Wear;',
      '      PowerOnHours = $rel.PowerOnHours; ReadErrorsTotal = $rel.ReadErrorsTotal;',
      '      ReadErrorsUncorrected = $rel.ReadErrorsUncorrected; WriteErrorsTotal = $rel.WriteErrorsTotal;',
      '      WriteErrorsUncorrected = $rel.WriteErrorsUncorrected; StartStopCycleCount = $rel.StartStopCycleCount;',
      '      FlushLatencyMax = $rel.FlushLatencyMax',
      '    } } else { $null }',
      '  }',
      '});',
      '$monIds = @(Get-CimInstance -Namespace root\\wmi WmiMonitorID | Select-Object InstanceName,ManufacturerName,UserFriendlyName,SerialNumberID);',
      '$monParams = @(Get-CimInstance -Namespace root\\wmi WmiMonitorBasicDisplayParams | Select-Object InstanceName,MaxHorizontalImageSize,MaxVerticalImageSize);',
      '$monConn = @(Get-CimInstance -Namespace root\\wmi WmiMonitorConnectionParams | Select-Object InstanceName,VideoOutputTechnology,Active);',
      '$netAdapters = @(Get-NetAdapter | Select-Object Name,InterfaceDescription,Status,LinkSpeed,MacAddress,DriverVersion,DriverDateString,MediaType,PhysicalMediaType);',
      '$wlanRaw = (netsh wlan show interfaces) 2>$null;',
      '$bat = Get-CimInstance Win32_Battery | Select-Object -First 1 Name,Chemistry,EstimatedChargeRemaining,BatteryStatus,DesignVoltage;',
      '$batStatic = Get-CimInstance -Namespace root\\wmi BatteryStaticData | Select-Object -First 1 ManufactureName,DesignedCapacity;',
      '$batFull = Get-CimInstance -Namespace root\\wmi BatteryFullChargedCapacity | Select-Object -First 1 FullChargedCapacity;',
      '$batCycle = Get-CimInstance -Namespace root\\wmi BatteryCycleCount | Select-Object -First 1 CycleCount;',
      '$batStat = Get-CimInstance -Namespace root\\wmi BatteryStatus | Select-Object -First 1 ChargeRate,DischargeRate,Voltage,PowerOnline,Charging;',
      '$tpm = $null; $tpmErr = $null;',
      'try { $tpm = Get-CimInstance -Namespace root\\cimv2\\Security\\MicrosoftTpm Win32_Tpm -ErrorAction Stop | Select-Object -First 1 IsEnabled_InitialValue,SpecVersion,ManufacturerVersion } catch { $tpmErr = $_.Exception.Message };',
      '$tpmPnp = @(Get-CimInstance Win32_PnPEntity -Filter "PNPClass=\'SecurityDevices\'" | Select-Object -First 3 Name,Status);',
      '$secureBoot = $null; try { $secureBoot = Confirm-SecureBootUEFI } catch { $secureBoot = $null };',
      '$bootMode = if ($env:firmware_type) { $env:firmware_type } else { "Unknown" };',
      '$pnpErrors = @(Get-CimInstance Win32_PnPEntity | Where-Object { $_.ConfigManagerErrorCode -ne 0 } | Select-Object -First 40 Name,PNPDeviceID,PNPClass,ConfigManagerErrorCode,Status);',
      '$pnpConnected = @(Get-CimInstance Win32_PnPEntity | Where-Object { $_.Status -eq "OK" -and ($_.PNPClass -in @("Keyboard","Mouse","Camera","Image","MEDIA","AudioEndpoint","Printer","USB","HIDClass","Bluetooth","Monitor","Xbox","Ports","SCSIAdapter","SmartCardReader")) } | Select-Object -First 90 Name,PNPClass,Manufacturer,Service,PNPDeviceID);',
      '$drivers = @(Get-CimInstance Win32_PnPSignedDriver | Where-Object { $_.DeviceName -and $_.DeviceClass -in @("DISPLAY","NET","DISKDRIVE","USB","MEDIA","SYSTEM","FIRMWARE","HIDCLASS","BLUETOOTH","SCSIADAPTER") } | Select-Object -First 65 DeviceName,DeviceClass,Manufacturer,DriverVersion,DriverDate,IsSigned,Signer);',
      '$lhmSensors = @(Get-CimInstance -Namespace root\\LibreHardwareMonitor Sensor | Select-Object Name,SensorType,Value,Min,Max,Identifier);',
      '$ohmSensors = if ($lhmSensors.Count -eq 0) { @(Get-CimInstance -Namespace root\\OpenHardwareMonitor Sensor | Select-Object Name,SensorType,Value,Min,Max,Identifier) } else { @() };',
      '$events = @(); $eventErr = $null;',
      'try {',
      '  $since = (Get-Date).AddDays(-14);',
      '  $events = @(Get-WinEvent -FilterHashtable @{ LogName = "System"; StartTime = $since } -MaxEvents 250 | Where-Object { $_.ProviderName -match "WHEA|disk|stornvme|nvlddmkm|amdkmdag|igfx|Display|Kernel-Power|Kernel-Processor-Power" -and ($_.Level -le 3) } | Select-Object -First 25 TimeCreated,LevelDisplayName,ProviderName,Id,Message);',
      '} catch { $eventErr = $_.Exception.Message };',
      '@{',
      '  isAdmin = $isAdmin; cs = $cs; csp = $csp; enc = $enc; bb = $bb; bios = $bios; os = $os; cpu = $cpu;',
      '  memArr = $memArr; memMods = $memMods; pageFile = $pageFile; slots = $slots; ports = $ports;',
      '  usbCtrls = $usbCtrls; soundDevs = $soundDevs; videoCtrls = $videoCtrls; cdrom = $cdrom;',
      '  physDisks = $physDisks; monIds = $monIds; monParams = $monParams; monConn = $monConn;',
      '  netAdapters = $netAdapters; wlanRaw = ($wlanRaw -join "`n");',
      '  bat = $bat; batStatic = $batStatic; batFull = $batFull; batCycle = $batCycle; batStat = $batStat;',
      '  tpm = $tpm; tpmErr = $tpmErr; tpmPnp = $tpmPnp; secureBoot = $secureBoot; bootMode = $bootMode;',
      '  pnpErrors = $pnpErrors; pnpConnected = $pnpConnected; drivers = $drivers;',
      '  lhmSensors = $lhmSensors; ohmSensors = $ohmSensors; events = $events; eventErr = $eventErr;',
      '} | ConvertTo-Json -Depth 5 -Compress',
    ].join(' ');

    const res = await runExecFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
      14000
    );
    if (!res.ok || !res.stdout) return null;
    try {
      return JSON.parse(res.stdout);
    } catch {
      return null;
    }
  }

  async function trySmartctlForDisk(devicePath) {
    const res = await runExecFile('smartctl', ['-j', '-A', '-H', '-i', devicePath], 3500);
    if (!res.ok || !res.stdout) return null;
    try {
      return JSON.parse(res.stdout);
    } catch {
      return null;
    }
  }

  async function readLinuxTpmInfo() {
    let permissionDenied = false;
    const checkAccess = async (p) => {
      try {
        await fsp.access(p, fs.constants.R_OK);
        return true;
      } catch (err) {
        if (err && (err.code === 'EACCES' || err.code === 'EPERM')) {
          permissionDenied = true;
        }
        return false;
      }
    };

    try {
      const hasTpmSys = fs.existsSync('/sys/class/tpm/tpm0');
      const hasTpmDev = fs.existsSync('/dev/tpmrm0') || fs.existsSync('/dev/tpm0');
      if (!hasTpmSys && !hasTpmDev) {
        // Probe read access on /sys/class/tpm and /dev/tpmrm0 in case permissions hide nodes
        await checkAccess('/dev/tpmrm0');
        await checkAccess('/dev/tpm0');
        await checkAccess('/sys/class/tpm');
        return { present: null, permissionDenied };
      }
      let specVersion = null;
      const verPath = '/sys/class/tpm/tpm0/tpm_version_major';
      if (fs.existsSync(verPath)) {
        try {
          const major = (await fsp.readFile(verPath, 'utf8')).trim();
          if (major) specVersion = `${major}.0`;
        } catch (err) {
          if (err && (err.code === 'EACCES' || err.code === 'EPERM')) {
            permissionDenied = true;
          }
        }
      }
      if (!hasTpmSys && hasTpmDev) {
        const readableDev = (await checkAccess('/dev/tpmrm0')) || (await checkAccess('/dev/tpm0'));
        if (!readableDev && permissionDenied) {
          return { present: true, permissionDenied: true };
        }
      }
      return { present: true, enabled: true, specVersion, permissionDenied: false };
    } catch (err) {
      if (err && (err.code === 'EACCES' || err.code === 'EPERM')) {
        return { present: null, permissionDenied: true };
      }
      return { present: null, permissionDenied };
    }
  }

  async function queryNvidiaSmiDeep() {
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
      const res = await runExecFile(
        candidate,
        [
          '--query-gpu=name,driver_version,vbios_version,pcie.link.gen.current,pcie.link.width.current,fan.speed,temperature.gpu,temperature.memory',
          '--format=csv,noheader,nounits',
        ],
        2500
      ).catch(() => ({ ok: false, stdout: '' }));
      if (res && res.ok && res.stdout) {
        return res;
      }
    }
    return { ok: false, stdout: '' };
  }

  async function readLinuxSensors() {
    const fans = [];
    const temps = [];
    try {
      const hwRoot = '/sys/class/hwmon';
      if (!fs.existsSync(hwRoot)) return { fans, temps };
      const dirs = await fsp.readdir(hwRoot);
      for (const dir of dirs) {
        const full = path.join(hwRoot, dir);
        const drvName = (await fsp.readFile(path.join(full, 'name'), 'utf8').catch(() => dir)).trim();
        const files = await fsp.readdir(full).catch(() => []);
        for (const f of files) {
          if (/^fan\d+_input$/.test(f)) {
            const rpmRaw = toNum(await fsp.readFile(path.join(full, f), 'utf8').catch(() => ''));
            const idx = f.match(/^fan(\d+)/)[1];
            const label = (await fsp.readFile(path.join(full, `fan${idx}_label`), 'utf8').catch(() => `${drvName} Fan ${idx}`)).trim();
            if (rpmRaw !== null) {
              fans.push({ name: label, rpm: Math.round(rpmRaw), source: `Linux hwmon (${drvName})` });
            }
          }
          if (/^temp\d+_input$/.test(f)) {
            const milli = toNum(await fsp.readFile(path.join(full, f), 'utf8').catch(() => ''));
            if (milli !== null && milli > 0 && milli < 130000) {
              const idx = f.match(/^temp(\d+)/)[1];
              const label = (await fsp.readFile(path.join(full, `temp${idx}_label`), 'utf8').catch(() => `${drvName} Temp ${idx}`)).trim();
              temps.push({ name: label, celsius: Number((milli / 1000).toFixed(1)), source: `Linux hwmon (${drvName})` });
            }
          }
        }
      }
    } catch {
      // ignore
    }
    return { fans, temps };
  }

  function parseSensorsList(rawSensors, sourceName) {
    const fans = [];
    const boardTemps = [];
    const allTemps = [];
    const voltages = [];
    for (const s of asArray(rawSensors)) {
      const type = String(s?.SensorType || '').toLowerCase();
      const name = cleanStr(s?.Name) || 'Sensor';
      const ident = String(s?.Identifier || '').toLowerCase();
      const val = toNum(s?.Value);
      const minV = toNum(s?.Min);
      const maxV = toNum(s?.Max);
      if (val === null) continue;

      if (type === 'fan') {
        const rpm = Math.round(val);
        let role = 'other';
        const nl = name.toLowerCase();
        if (nl.includes('cpu') || ident.includes('cpu')) role = 'cpu';
        else if (nl.includes('gpu') || ident.includes('gpu')) role = 'gpu';
        else if (nl.includes('pump') || nl.includes('aio')) role = 'aio_pump';
        else if (nl.includes('chassis') || nl.includes('sys') || nl.includes('case')) role = 'case';

        let status = 'unknown';
        if (rpm === 0) status = 'stopped_confirmed';
        else if (rpm > 0 && (rpm < 150 || rpm > 9500)) status = 'abnormal_rpm';
        else if (rpm > 0) status = 'running';

        fans.push({
          id: `fan-${ident || fans.length}`,
          name,
          role,
          rpm,
          percent: null,
          minRpm: minV !== null ? Math.round(minV) : null,
          maxRpm: maxV !== null ? Math.round(maxV) : null,
          status,
          linkedTempSensor: role === 'cpu' ? 'CPU Package' : role === 'gpu' ? 'GPU Core' : null,
          source: sourceName,
          provenance: 'measured',
        });
      } else if (type === 'temperature' && val > 0 && val <= 130) {
        const nl = name.toLowerCase();
        let cat = 'other';
        if (ident.includes('cpu') || nl.includes('cpu')) cat = 'cpu';
        else if (nl.includes('hot spot') || nl.includes('hotspot')) cat = 'gpu_hotspot';
        else if (nl.includes('memory') && ident.includes('gpu')) cat = 'vram';
        else if (ident.includes('gpu') || nl.includes('gpu')) cat = 'gpu';
        else if (ident.includes('nvme') || ident.includes('hdd') || ident.includes('ssd') || nl.includes('drive')) cat = 'storage';
        else if (nl.includes('chipset') || nl.includes('pch')) cat = 'chipset';
        else if (nl.includes('ambient')) cat = 'ambient';
        else if (ident.includes('lpc') || nl.includes('motherboard') || nl.includes('system') || nl.includes('vrm') || nl.includes('mos')) cat = 'motherboard';

        const entry = {
          id: `temp-${ident || allTemps.length}`,
          name,
          category: cat,
          value: Number(val.toFixed(1)),
          unit: 'C',
          minValue: minV !== null ? Number(minV.toFixed(1)) : null,
          maxValue: maxV !== null ? Number(maxV.toFixed(1)) : null,
          source: sourceName,
          provenance: 'measured',
        };
        allTemps.push(entry);
        if (cat === 'motherboard' || cat === 'chipset') {
          boardTemps.push(entry);
        }
      } else if (type === 'voltage' && val >= 0 && val < 30) {
        voltages.push({
          id: `volt-${ident || voltages.length}`,
          name,
          category: 'voltage',
          value: Number(val.toFixed(3)),
          unit: 'V',
          minValue: minV !== null ? Number(minV.toFixed(3)) : null,
          maxValue: maxV !== null ? Number(maxV.toFixed(3)) : null,
          source: sourceName,
          provenance: 'measured',
        });
      }
    }
    return { fans, boardTemps, allTemps, voltages };
  }

  async function collectDeepInventory(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedInventory && now - lastCollectedAt < 4 * 60 * 1000) {
      return cachedInventory;
    }
    if (pendingPromise) return pendingPromise;

    pendingPromise = (async () => {
      const isWindows = process.platform === 'win32';
      const isLinux = process.platform === 'linux';
      const limitations = [];

      const [
        siSys,
        siBoard,
        siBios,
        siCpu,
        siMemLayout,
        siDisks,
        siGraphics,
        siNetIfaces,
        siBattery,
        winData,
        linuxSensors,
        linuxTpmInfo,
        nvSmiRes,
      ] = await Promise.all([
        si.system().catch(() => null),
        si.baseboard().catch(() => null),
        si.bios().catch(() => null),
        si.cpu().catch(() => null),
        si.memLayout().catch(() => []),
        si.diskLayout().catch(() => []),
        si.graphics().catch(() => null),
        si.networkInterfaces().catch(() => []),
        si.battery().catch(() => null),
        isWindows ? queryWindowsDeepData().catch(() => null) : Promise.resolve(null),
        isLinux ? readLinuxSensors().catch(() => ({ fans: [], temps: [] })) : Promise.resolve({ fans: [], temps: [] }),
        isLinux ? readLinuxTpmInfo().catch(() => null) : Promise.resolve(null),
        queryNvidiaSmiDeep(),
      ]);

      const chassis = mapChassisFormFactor(winData?.enc?.ChassisTypes);
      const hasBattery = Boolean(siBattery?.hasBattery || winData?.bat);
      const formFactor =
        chassis.formFactor !== 'unknown'
          ? chassis.formFactor
          : hasBattery
          ? 'laptop'
          : 'unknown';

      if (isWindows && typeof winData?.isAdmin === 'boolean' && typeof onElevationDetected === 'function') {
        try {
          onElevationDetected(winData.isAdmin);
        } catch {
          // ignore
        }
      }

      const lhmArr = asArray(winData?.lhmSensors);
      const ohmArr = asArray(winData?.ohmSensors);
      const lhmWmiRunning = lhmArr.length > 0;
      const ohmRunning = ohmArr.length > 0;
      const nvSmiAvailable = Boolean(nvSmiRes?.ok && nvSmiRes.stdout);

      const lhmLibInfo =
        isWindows && typeof getLhmLibraryInfo === 'function' ? getLhmLibraryInfo() : null;
      const lhmDirectInstalled = Boolean(lhmLibInfo?.installed && lhmLibInfo?.healthy && lhmLibInfo?.dllPath);
      const lhmDirectVersion = lhmLibInfo?.version || null;
      let directLhmRes = null;
      if (isWindows && !lhmWmiRunning && !ohmRunning && lhmDirectInstalled) {
        directLhmRes = await readManagedLhmSensors({
          dllPath: lhmLibInfo.dllPath,
          timeoutMs: 7000,
        }).catch(() => null);
      }
      const directLhmSensors =
        directLhmRes?.ok && Array.isArray(directLhmRes.sensors) ? directLhmRes.sensors : [];
      const lhmDirectActive = directLhmSensors.length > 0;
      const lhmRunning = lhmWmiRunning || lhmDirectActive;
      const lhmRequiresAdmin = Boolean(
        lhmDirectInstalled &&
        directLhmRes?.requiresAdminHint &&
        winData?.isAdmin === false
      );

      if (isWindows && !lhmRunning && !ohmRunning) {
        limitations.push(
          lhmDirectInstalled
            ? 'LibreHardwareMonitorLib.dll is installed, but standard user permissions blocked Ring0 SuperIO/motherboard sensors. Supported GPU/NVMe sensors work without Admin; run once elevated for motherboard VRM, voltage, and fan RPM headers.'
            : 'LibreHardwareMonitorLib is not installed and LibreHardwareMonitor / OpenHardwareMonitor WMI bridge is not running; motherboard fan headers, board voltages, and some CPU/VRM sensors are unavailable to standard Windows APIs.'
        );
      } else if (isWindows && lhmDirectActive && lhmRequiresAdmin) {
        limitations.push('LibreHardwareMonitorLib (Direct) is active in standard user mode; low-level Ring0 motherboard VRM, voltage, and SuperIO fan headers may require Administrator sensor access.');
      }
      if (isWindows && winData?.isAdmin === false) {
        limitations.push('Running without Administrator elevation; some Windows Security/WHEA Event Viewer logs or low-level SMART pass-through registers may be restricted.');
      }

      const cpuModel = cleanStr(winData?.cpu?.Name) || cleanStr(`${siCpu?.manufacturer || ''} ${siCpu?.brand || ''}`);
      const boardModel = cleanStr(winData?.bb?.Product) || cleanStr(siBoard?.model);
      const guessedPlatform = detectPlatformSupportAndChipset(boardModel, cpuModel);

      // Parse sensors from LHM WMI, Direct LibreHardwareMonitorLib, OHM WMI, or Linux hwmon
      const parsedWinSensors = lhmWmiRunning
        ? parseSensorsList(lhmArr, 'LibreHardwareMonitor WMI')
        : lhmDirectActive
        ? parseSensorsList(directLhmSensors, 'LibreHardwareMonitorLib (Direct)')
        : ohmRunning
        ? parseSensorsList(ohmArr, 'OpenHardwareMonitor WMI')
        : { fans: [], boardTemps: [], allTemps: [], voltages: [] };

      const fansList = [...parsedWinSensors.fans];
      if (isLinux && linuxSensors.fans.length > 0) {
        linuxSensors.fans.forEach((f, i) => {
          fansList.push({
            id: `linux-fan-${i}`,
            name: f.name,
            role: /cpu/i.test(f.name) ? 'cpu' : /gpu/i.test(f.name) ? 'gpu' : 'case',
            rpm: f.rpm,
            percent: null,
            minRpm: null,
            maxRpm: null,
            status: f.rpm === 0 ? 'stopped_confirmed' : f.rpm > 0 ? 'running' : 'unknown',
            linkedTempSensor: null,
            source: f.source,
            provenance: 'measured',
          });
        });
      }

      // Add NVIDIA fan % if present and no explicit GPU fan entry added
      if (nvSmiAvailable) {
        const lines = nvSmiRes.stdout.split(/\r?\n/).filter(Boolean);
        lines.forEach((line, idx) => {
          const cols = line.split(',').map((c) => c.trim());
          const gpuName = cleanStr(cols[0]) || `NVIDIA GPU ${idx + 1}`;
          const fanPct = toNum(cols[5]);
          const gpuTemp = toNum(cols[6]);
          const vramTemp = toNum(cols[7]);
          if (fanPct !== null && !fansList.some((f) => f.role === 'gpu')) {
            fansList.push({
              id: `nv-fan-${idx}`,
              name: `${gpuName} Fan`,
              role: 'gpu',
              rpm: null,
              percent: Math.round(fanPct),
              minRpm: null,
              maxRpm: null,
              status: fanPct === 0 ? 'stopped_confirmed' : 'running',
              linkedTempSensor: `${gpuName} (${gpuTemp ?? 'N/A'}°C)`,
              source: 'nvidia-smi (percentage only, RPM sensor not exposed)',
              provenance: 'measured',
            });
          }
          if (vramTemp !== null && vramTemp > 0 && vramTemp < 130) {
            parsedWinSensors.allTemps.push({
              id: `nv-vram-temp-${idx}`,
              name: `${gpuName} Memory Junction`,
              category: 'vram',
              value: vramTemp,
              unit: 'C',
              minValue: null,
              maxValue: null,
              source: 'nvidia-smi',
              provenance: 'measured',
            });
          }
        });
      }

      if (isLinux) {
        linuxSensors.temps.forEach((t, idx) => {
          parsedWinSensors.allTemps.push({
            id: `linux-temp-${idx}`,
            name: t.name,
            category: /cpu|pkg|core|tctl|tdie/i.test(t.name)
              ? 'cpu'
              : /nvme|composite/i.test(t.name)
              ? 'storage'
              : /gpu|edge|junction/i.test(t.name)
              ? 'gpu'
              : 'motherboard',
            value: t.celsius,
            unit: 'C',
            minValue: null,
            maxValue: null,
            source: t.source,
            provenance: 'measured',
          });
        });
      }

      // Memory DIMMs
      const winMods = asArray(winData?.memMods);
      const rawMemList = winMods.length > 0 ? winMods : asArray(siMemLayout);
      const modules = rawMemList.map((m) => {
        const cap = toNum(m?.Capacity) ?? toNum(m?.size);
        const typeStr = mapSmbiosMemoryType(m?.SMBIOSMemoryType) || cleanStr(m?.type);
        const formStr = mapMemoryFormFactor(m?.FormFactor) || cleanStr(m?.formFactor);
        const isSoldered = Boolean(
          (formStr && formStr.toLowerCase().includes('soldered')) ||
          (typeStr && typeStr.toUpperCase().startsWith('LPDDR'))
        );
        return {
          bankLabel: cleanStr(m?.BankLabel) || cleanStr(m?.bank),
          deviceLocator: cleanStr(m?.DeviceLocator),
          manufacturer: cleanStr(m?.Manufacturer) || cleanStr(m?.manufacturer),
          partNumber: cleanStr(m?.PartNumber) || cleanStr(m?.partNum),
          serialMasked: maskValue(m?.SerialNumber || m?.serialNum),
          capacityBytes: cap && cap > 0 ? cap : null,
          configuredSpeedMhz: toNum(m?.ConfiguredClockSpeed) ?? toNum(m?.clockSpeed),
          ratedSpeedMhz: toNum(m?.Speed) ?? toNum(m?.clockSpeed),
          memoryType: typeStr,
          formFactor: formStr,
          voltageMv: toNum(m?.ConfiguredVoltage) ?? (toNum(m?.voltageConfigured) ? Math.round(toNum(m?.voltageConfigured) * 1000) : null),
          isSolderedHint: isSoldered,
          provenance: 'detected',
        };
      });

      const memSlotsTotal = toNum(winData?.memArr?.MemoryDevices) ?? (modules.length > 0 ? modules.length : null);
      const populatedModules = modules.filter((m) => (m.capacityBytes || 0) > 0);
      const maxCapKb = toNum(winData?.memArr?.MaxCapacityEx) ?? toNum(winData?.memArr?.MaxCapacity);
      const maxRamGB = maxCapKb && maxCapKb > 0 ? Math.round(maxCapKb / (1024 * 1024)) : null;

      // PCIe slots
      const pcieSlots = asArray(winData?.slots).map((sl) => {
        const usageCode = Number(sl?.CurrentUsage);
        const usage = usageCode === 4 ? 'In Use' : usageCode === 3 ? 'Available' : 'Unknown';
        const width = toNum(sl?.MaxDataWidth);
        return {
          designation: cleanStr(sl?.SlotDesignation) || 'System Slot',
          slotType: sl?.SlotType ? `SMBIOS Slot Type #${sl.SlotType}` : null,
          laneWidth: width ? `x${width}` : null,
          currentUsage: usage,
          supportsHotPlug: typeof sl?.SupportsHotPlug === 'boolean' ? sl.SupportsHotPlug : null,
          provenance: 'detected',
        };
      });

      // Storage SMART Health
      const winPhysDisks = asArray(winData?.physDisks);
      const siDiskList = asArray(siDisks);
      let smartctlAvailable = false;
      const storage = [];

      if (winPhysDisks.length > 0) {
        for (let i = 0; i < winPhysDisks.length; i++) {
          const pd = winPhysDisks[i];
          const rel = pd?.Rel || null;
          const wear = toNum(rel?.Wear);
          const temp = toNum(rel?.Temperature);
          const poh = toNum(rel?.PowerOnHours);
          const cycles = toNum(rel?.StartStopCycleCount);
          const readUnc = toNum(rel?.ReadErrorsUncorrected);
          const writeUnc = toNum(rel?.WriteErrorsUncorrected);
          const hasAnyReliability =
            rel !== null && (wear !== null || temp !== null || poh !== null || readUnc !== null || writeUnc !== null);
          const bus = mapBusTypeLabel(pd?.BusType);
          const mediaType = mapMediaType(pd?.MediaType, bus, pd?.Model || pd?.FriendlyName);
          const healthRaw = String(pd?.HealthStatus || '').toLowerCase();

          let smartHealthStatus = 'unavailable';
          const warnings = [];
          if (hasAnyReliability) {
            if (healthRaw === 'unhealthy' || (wear !== null && wear >= 90) || (readUnc || 0) > 0 || (writeUnc || 0) > 0) {
              smartHealthStatus = 'critical';
            } else if (healthRaw === 'warning' || (wear !== null && wear >= 70) || (temp !== null && temp >= 70)) {
              smartHealthStatus = 'warning';
            } else if (healthRaw === 'healthy') {
              smartHealthStatus = 'healthy';
            } else {
              smartHealthStatus = 'healthy';
            }
          } else {
            warnings.push('SMART / Reliability counters were not exposed by this storage controller (common on USB enclosures or RAID drivers).');
          }

          if (temp !== null && temp >= 68) {
            warnings.push(`Elevated drive temperature detected (${temp}°C).`);
          }
          if (wear !== null && wear >= 80) {
            warnings.push(`High SSD flash wear reported (${wear}% consumed).`);
          }

          storage.push({
            id: `disk-${pd?.DeviceId ?? i}`,
            index: toNum(pd?.DeviceId),
            friendlyName: cleanStr(pd?.FriendlyName) || cleanStr(pd?.Model) || `Physical Disk ${i}`,
            model: cleanStr(pd?.Model) || cleanStr(pd?.FriendlyName),
            vendor: cleanStr(pd?.Manufacturer),
            serialMasked: maskValue(pd?.SerialNumber),
            mediaType,
            busType: bus,
            interfaceDetail: bus ? `${bus} (${mediaType})` : mediaType,
            sizeBytes: toNum(pd?.Size),
            temperatureC: temp !== null && temp > 0 && temp < 115 ? temp : null,
            smartSupported: hasAnyReliability ? true : null,
            smartAvailable: hasAnyReliability,
            smartHealthStatus,
            smartSource: hasAnyReliability ? 'Windows Storage Reliability Counter (CIM)' : null,
            powerOnHours: poh,
            powerCycles: cycles,
            wearPercent: wear,
            remainingLifePercent: wear !== null ? Math.max(0, Math.min(100, 100 - wear)) : null,
            tbwBytes: null,
            tbrBytes: null,
            reallocatedSectors: null,
            pendingSectors: null,
            mediaErrors: (readUnc || 0) + (writeUnc || 0) > 0 ? (readUnc || 0) + (writeUnc || 0) : hasAnyReliability ? 0 : null,
            unsafeShutdowns: null,
            readErrorsUncorrected: readUnc,
            writeErrorsUncorrected: writeUnc,
            warnings,
            provenance: hasAnyReliability ? 'measured' : 'detected',
          });
        }
      } else {
        // Linux / macOS fallback with optional smartctl
        for (let i = 0; i < siDiskList.length; i++) {
          const d = siDiskList[i];
          const devPath = cleanStr(d?.device);
          const sc = devPath ? await trySmartctlForDisk(devPath) : null;
          if (sc) smartctlAvailable = true;
          const nvmeLog = sc?.nvme_smart_health_information_log;
          const smartPassed = typeof sc?.smart_status?.passed === 'boolean' ? sc.smart_status.passed : null;
          const wear = toNum(nvmeLog?.percentage_used);
          const poh = toNum(sc?.power_on_time?.hours) ?? toNum(nvmeLog?.power_on_hours);
          const cycles = toNum(sc?.power_cycle_count) ?? toNum(nvmeLog?.power_cycles);
          const temp = toNum(sc?.temperature?.current) ?? toNum(d?.temperature);
          const mediaErrors = toNum(nvmeLog?.media_errors);
          const unsafeShutdowns = toNum(nvmeLog?.unsafe_shutdowns);
          const tbwBytes = toNum(nvmeLog?.data_units_written) !== null ? Number(nvmeLog.data_units_written) * 512000 : null;
          const tbrBytes = toNum(nvmeLog?.data_units_read) !== null ? Number(nvmeLog.data_units_read) * 512000 : null;
          const hasSmart = Boolean(sc && (smartPassed !== null || poh !== null || wear !== null));

          let smartHealthStatus = 'unavailable';
          if (hasSmart) {
            if (smartPassed === false || (mediaErrors || 0) > 0 || (wear !== null && wear >= 90)) smartHealthStatus = 'critical';
            else if (wear !== null && wear >= 70) smartHealthStatus = 'warning';
            else smartHealthStatus = 'healthy';
          }

          storage.push({
            id: `disk-${i}`,
            index: i,
            friendlyName: cleanStr(d?.name) || devPath || `Drive ${i + 1}`,
            model: cleanStr(d?.name),
            vendor: cleanStr(d?.vendor),
            serialMasked: maskValue(d?.serialNum),
            mediaType: mapMediaType(d?.type, d?.interfaceType, d?.name),
            busType: cleanStr(d?.interfaceType),
            interfaceDetail: cleanStr(d?.interfaceType),
            sizeBytes: toNum(d?.size),
            temperatureC: temp !== null && temp > 0 && temp < 115 ? temp : null,
            smartSupported: hasSmart ? true : null,
            smartAvailable: hasSmart,
            smartHealthStatus,
            smartSource: hasSmart ? 'smartctl' : null,
            powerOnHours: poh,
            powerCycles: cycles,
            wearPercent: wear,
            remainingLifePercent: wear !== null ? Math.max(0, Math.min(100, 100 - wear)) : null,
            tbwBytes,
            tbrBytes,
            reallocatedSectors: null,
            pendingSectors: null,
            mediaErrors,
            unsafeShutdowns,
            readErrorsUncorrected: null,
            writeErrorsUncorrected: null,
            warnings: hasSmart ? [] : ['SMART health requires smartctl with block-device permission on this OS.'],
            provenance: hasSmart ? 'measured' : 'detected',
          });
        }
      }

      // Displays with EDID physical dimensions matched by normalized InstanceName
      const siDispList = asArray(siGraphics?.displays);
      const monIds = asArray(winData?.monIds);
      const monParams = asArray(winData?.monParams);
      const monConns = asArray(winData?.monConn);
      const displays = matchWmiMonitors(siDispList, monIds, monParams, monConns, asArray(winData?.videoCtrls));

      // Ports & Connectors (4 Strict Categories)
      const confirmedPhysical = [];
      const controllers = [];
      const connectedDevices = [];
      const unconfirmedPhysical = [];
      const portNotes = [];

      const smbiosPorts = asArray(winData?.ports);
      smbiosPorts.forEach((p, idx) => {
        const extName = cleanStr(p?.ExternalReferenceDesignator);
        const intName = cleanStr(p?.InternalReferenceDesignator);
        const mapped = mapPortConnectorType(extName, intName, p?.ConnectorType);
        const target = extName ? confirmedPhysical : unconfirmedPhysical;
        target.push({
          id: `smbios-port-${idx}`,
          category: extName ? 'confirmed_physical' : 'unconfirmed_physical',
          kind: mapped.kind,
          name: extName || intName || `Port #${idx + 1}`,
          connectorType: mapped.connector,
          versionOrSpec: extName ? 'SMBIOS Type 8 External Header' : 'SMBIOS Internal / Unmapped Header',
          theoreticalBandwidth: mapped.bandwidth,
          status: 'unknown',
          connectedDeviceName: null,
          capabilities: mapped.caps,
          confidence: extName ? 'high' : 'low',
          source: 'Win32_PortConnector (SMBIOS)',
          provenance: 'detected',
        });
      });

      if (!isWindows) {
        portNotes.push('SMBIOS Type 8 physical port enumeration is currently unsupported outside Windows (`not_supported` on Linux/macOS); physical chassis port counts are never guessed from controllers.');
      } else if (smbiosPorts.length === 0) {
        portNotes.push('Motherboard SMBIOS Type 8 tables did not enumerate external physical port headers; physical chassis port counts cannot be guessed safely in software.');
      }

      // Controllers (USB, Sound, Network, Video) - strictly categorized as 'controller'
      asArray(winData?.usbCtrls).forEach((u, idx) => {
        const name = cleanStr(u?.Name) || `USB Host Controller ${idx + 1}`;
        const nl = name.toLowerCase();
        const isUsb4 = nl.includes('usb4') || nl.includes('thunderbolt');
        const is3 = nl.includes('3.2') || nl.includes('3.1') || nl.includes('3.0') || nl.includes('xhci') || nl.includes('extensible');
        controllers.push({
          id: `ctrl-usb-${idx}`,
          category: 'controller',
          kind: 'usb',
          name,
          connectorType: isUsb4 ? 'USB4 / Thunderbolt Host Controller' : is3 ? 'xHCI USB 3.x Host Controller' : 'USB Host Controller',
          versionOrSpec: isUsb4 ? 'USB4 / TB (40 Gbps Host)' : is3 ? 'USB 3.x xHCI' : 'USB 2.0 / Standard',
          theoreticalBandwidth: isUsb4 ? '40 Gbps (Controller)' : is3 ? '5–20 Gbps (Controller)' : '480 Mbps (Controller)',
          status: String(u?.Status || '').toUpperCase() === 'OK' ? 'active' : 'unknown',
          connectedDeviceName: null,
          capabilities: ['Host Controller (Does NOT equal 1 physical port)'],
          confidence: 'high',
          source: 'Win32_USBController',
          provenance: 'detected',
        });
      });

      asArray(winData?.soundDevs).forEach((s, idx) => {
        controllers.push({
          id: `ctrl-audio-${idx}`,
          category: 'controller',
          kind: 'audio',
          name: cleanStr(s?.Name) || `Audio Controller ${idx + 1}`,
          connectorType: 'Audio Hardware Controller',
          versionOrSpec: cleanStr(s?.Manufacturer),
          theoreticalBandwidth: null,
          status: String(s?.Status || '').toUpperCase() === 'OK' ? 'active' : 'unknown',
          connectedDeviceName: null,
          capabilities: ['Audio Codec / Endpoint Host'],
          confidence: 'high',
          source: 'Win32_SoundDevice',
          provenance: 'detected',
        });
      });

      // Connected devices mapped to ports/links
      displays.filter((d) => !d.isInternal).forEach((d, idx) => {
        connectedDevices.push({
          id: `conn-disp-${idx}`,
          category: 'connected_device',
          kind: 'video',
          name: d.name,
          connectorType: d.connectionType || 'External Video Output',
          versionOrSpec: d.currentResolution ? `${d.currentResolution} @ ${d.refreshRateHz || '?'} Hz` : null,
          theoreticalBandwidth: null,
          status: 'connected',
          connectedDeviceName: d.name,
          capabilities: ['Active Display Output'],
          confidence: 'high',
          source: 'WmiMonitorConnectionParams / Display EDID',
          provenance: 'detected',
        });
      });

      // Network adapters & Wi-Fi RSSI / gen parsing
      const wlanStr = String(winData?.wlanRaw || '');
      const wlanSsid = wlanStr.match(/^\s*SSID\s*:\s*(.+)$/im)?.[1]?.trim() || null;
      const wlanRadio = wlanStr.match(/^\s*Radio type\s*:\s*(.+)$/im)?.[1]?.trim() || null;
      const wlanSig = toNum(wlanStr.match(/^\s*Signal\s*:\s*(\d+)%/im)?.[1]);
      let wifiGen = wlanRadio;
      if (wlanRadio) {
        if (/802\.11be|wi-fi\s*7/i.test(wlanRadio)) wifiGen = 'Wi-Fi 7 (802.11be)';
        else if (/802\.11ax|wi-fi\s*6/i.test(wlanRadio)) wifiGen = 'Wi-Fi 6 / 6E (802.11ax)';
        else if (/802\.11ac/i.test(wlanRadio)) wifiGen = 'Wi-Fi 5 (802.11ac)';
        else if (/802\.11n/i.test(wlanRadio)) wifiGen = 'Wi-Fi 4 (802.11n)';
      }

      const winNets = asArray(winData?.netAdapters);
      const siNets = asArray(siNetIfaces);
      const networkAdapters = (winNets.length > 0 ? winNets : siNets).map((n, idx) => {
        const desc = cleanStr(n?.InterfaceDescription) || cleanStr(n?.ifaceName) || cleanStr(n?.iface) || `Adapter ${idx + 1}`;
        const lower = `${desc} ${n?.Name || ''} ${n?.type || ''}`.toLowerCase();
        const isBt = lower.includes('bluetooth');
        const isWifi = lower.includes('wi-fi') || lower.includes('wifi') || lower.includes('wireless') || lower.includes('wlan');
        const isVirt = lower.includes('virtual') || lower.includes('hyper-v') || lower.includes('vpn') || lower.includes('loopback') || lower.includes('tap-') || lower.includes('wan miniport');
        const kind = isVirt ? 'virtual' : isBt ? 'bluetooth' : isWifi ? 'wifi' : 'ethernet';

        let speedMbps = toNum(n?.speed);
        if (!speedMbps && typeof n?.LinkSpeed === 'string') {
          const gMatch = n.LinkSpeed.match(/([\d.]+)\s*Gbps/i);
          const mMatch = n.LinkSpeed.match(/([\d.]+)\s*Mbps/i);
          if (gMatch) speedMbps = Math.round(Number(gMatch[1]) * 1000);
          else if (mMatch) speedMbps = Math.round(Number(mMatch[1]));
        }

        return {
          id: `net-${idx}`,
          name: desc,
          interfaceName: cleanStr(n?.Name) || cleanStr(n?.iface),
          kind,
          status: cleanStr(n?.Status) || cleanStr(n?.operstate) || 'Unknown',
          macMasked: maskMac(n?.MacAddress || n?.mac),
          linkSpeedMbps: speedMbps,
          wifiGeneration: isWifi ? wifiGen : null,
          ssid: isWifi ? wlanSsid : null,
          signalQualityPercent: isWifi ? wlanSig : null,
          rssiDbm: isWifi && wlanSig !== null ? Math.round(wlanSig / 2 - 100) : null,
          driverVersion: cleanStr(n?.DriverVersion),
          driverDate: cleanStr(n?.DriverDateString),
          provenance: 'detected',
        };
      });

      // Add active wired/wireless NICs to connectedDevices when up
      networkAdapters.filter((a) => a.kind === 'ethernet' && String(a.status).toLowerCase() === 'up').forEach((a, idx) => {
        connectedDevices.push({
          id: `conn-eth-${idx}`,
          category: 'connected_device',
          kind: 'network',
          name: `${a.name} (Wired Ethernet Link)`,
          connectorType: 'RJ45 Ethernet',
          versionOrSpec: a.linkSpeedMbps ? `${a.linkSpeedMbps} Mbps negotiated` : null,
          theoreticalBandwidth: a.linkSpeedMbps ? `${a.linkSpeedMbps} Mbps` : null,
          status: 'connected',
          connectedDeviceName: 'Active Ethernet Cable',
          capabilities: ['Wired Networking'],
          confidence: 'high',
          source: 'Get-NetAdapter',
          provenance: 'detected',
        });
      });

      // Peripherals & Other Components
      const peripherals = [];
      const otherComponents = [];
      asArray(winData?.pnpConnected).forEach((p, idx) => {
        const name = cleanStr(p?.Name);
        if (!name) return;
        const cls = cleanStr(p?.PNPClass);
        const idLower = String(p?.PNPDeviceID || '').toLowerCase();
        const cat = classifyPeripheralCategory(name, cls, p?.Service);

        if (/pci\\|acpi\\|swd\\|root\\/.test(idLower) && !['keyboard', 'mouse', 'camera', 'printer', 'controller'].includes(cat)) {
          let compCat = 'other';
          if (name.toLowerCase().includes('tpm')) compCat = 'tpm_security';
          else if (name.toLowerCase().includes('npu') || name.toLowerCase().includes('neural')) compCat = 'acceleration_npu';
          else if (cls === 'MEDIA') compCat = 'audio_controller';
          else if (cls === 'USB') compCat = 'usb_controller';
          else if (cls === 'SmartCardReader') compCat = 'card_reader';
          otherComponents.push({
            id: `comp-${idx}`,
            name,
            category: compCat,
            manufacturer: cleanStr(p?.Manufacturer),
            driverVersion: null,
            status: 'OK',
            errorCode: 0,
            provenance: 'detected',
          });
          return;
        }

        peripherals.push({
          id: `periph-${idx}`,
          name,
          category: cat,
          manufacturer: cleanStr(p?.Manufacturer),
          status: 'Connected / OK',
          connectionBus: idLower.startsWith('usb\\') ? 'USB' : idLower.startsWith('bth') ? 'Bluetooth' : cls,
          driverVersion: null,
          provenance: 'detected',
        });

        if (idLower.startsWith('usb\\') && !name.toLowerCase().includes('root hub')) {
          connectedDevices.push({
            id: `conn-usb-${idx}`,
            category: 'connected_device',
            kind: cat === 'storage_usb' ? 'storage' : cat === 'audio' ? 'audio' : 'usb',
            name,
            connectorType: 'USB Bus Device',
            versionOrSpec: cleanStr(p?.Manufacturer),
            theoreticalBandwidth: null,
            status: 'connected',
            connectedDeviceName: name,
            capabilities: [cls || 'USB Device'],
            confidence: 'high',
            source: 'Win32_PnPEntity',
            provenance: 'detected',
          });
        }
      });

      asArray(winData?.cdrom).forEach((cd, idx) => {
        otherComponents.push({
          id: `cdrom-${idx}`,
          name: cleanStr(cd?.Name) || `Optical Drive (${cd?.Drive || ''})`,
          category: 'optical',
          manufacturer: cleanStr(cd?.Manufacturer),
          driverVersion: null,
          status: cleanStr(cd?.Status),
          errorCode: 0,
          provenance: 'detected',
        });
      });

      const bluetoothAdapters = networkAdapters
        .filter((a) => a.kind === 'bluetooth')
        .map((a) => ({ name: a.name, status: a.status, driverVersion: a.driverVersion }));

      // Battery details
      const batDesign = toNum(siBattery?.designedCapacity) ?? toNum(winData?.batStatic?.DesignedCapacity);
      const batFull = toNum(siBattery?.maxCapacity) ?? toNum(winData?.batFull?.FullChargedCapacity);
      const batHealth =
        batDesign && batFull && batDesign > 0
          ? Math.min(100, Math.max(1, Math.round((batFull / batDesign) * 100)))
          : null;
      const batWear = batHealth !== null ? Math.max(0, 100 - batHealth) : null;
      const chargeRateMw = toNum(winData?.batStat?.ChargeRate) || toNum(winData?.batStat?.DischargeRate);

      // Build complete DeepHardwareInventory
      const inventory = {
        collectedAt: Date.now(),
        sourceMode: 'desktop_ipc',
        platform: process.platform,
        isElevated: typeof winData?.isAdmin === 'boolean' ? winData.isAdmin : null,
        detectionLimitations: limitations,
        system: {
          formFactor,
          chassisTypeLabel: chassis.label,
          manufacturer: cleanStr(winData?.cs?.Manufacturer) || cleanStr(siSys?.manufacturer),
          model: cleanStr(winData?.cs?.Model) || cleanStr(winData?.csp?.Name) || cleanStr(siSys?.model),
          sku: cleanStr(winData?.cs?.SystemSKUNumber) || cleanStr(winData?.csp?.SKUNumber) || cleanStr(siSys?.sku),
          family: cleanStr(winData?.cs?.SystemFamily),
          serialMasked: maskValue(winData?.bios?.SerialNumber || winData?.csp?.IdentifyingNumber || siSys?.serial),
          uuidMasked: maskValue(winData?.csp?.UUID || siSys?.uuid),
          architecture: cleanStr(winData?.os?.OSArchitecture) || os.arch(),
          osName: cleanStr(winData?.os?.Caption)?.replace(/^Microsoft\s+/i, '') || `${os.type()} ${os.release()}`,
          osVersion: cleanStr(winData?.os?.Version) || os.release(),
          osBuild: cleanStr(winData?.os?.BuildNumber),
          bootMode:
            String(winData?.bootMode || '').toUpperCase().includes('UEFI')
              ? 'UEFI'
              : String(winData?.bootMode || '').toUpperCase().includes('LEGACY')
              ? 'Legacy BIOS'
              : isLinux && fs.existsSync('/sys/firmware/efi')
              ? 'UEFI'
              : 'Unknown',
          secureBoot: typeof winData?.secureBoot === 'boolean' ? winData.secureBoot : null,
          tpm: resolveTpmState({ platform: process.platform, winData, linuxTpmInfo }),
          sensorBackends: {
            lhmRunning,
            lhmDirectInstalled,
            lhmDirectVersion,
            lhmRequiresAdmin,
            ohmRunning,
            nvidiaSmiAvailable: nvSmiAvailable,
            smartctlAvailable,
          },
          provenance: 'detected',
        },
        motherboard: {
          manufacturer: cleanStr(winData?.bb?.Manufacturer) || cleanStr(siBoard?.manufacturer),
          model: boardModel,
          version: cleanStr(winData?.bb?.Version) || cleanStr(siBoard?.version),
          serialMasked: maskValue(winData?.bb?.SerialNumber || siBoard?.serial),
          chipset: guessedPlatform.chipset,
          socket: cleanStr(winData?.cpu?.SocketDesignation) || cleanStr(siCpu?.socket) || guessedPlatform.socket,
          biosVendor: cleanStr(winData?.bios?.Manufacturer) || cleanStr(siBios?.vendor),
          biosVersion: cleanStr(winData?.bios?.SMBIOSBIOSVersion) || cleanStr(siBios?.version),
          biosReleaseDate: parseWindowsFirmwareDate(winData?.bios?.ReleaseDate) || cleanStr(siBios?.releaseDate),
          memorySlotsTotal: memSlotsTotal,
          memorySlotsUsed: populatedModules.length > 0 ? populatedModules.length : null,
          maxRamGB,
          ramGenSupported: modules.find((m) => m.memoryType)?.memoryType || guessedPlatform.ramGen,
          pcieSlots,
          voltages: parsedWinSensors.voltages,
          boardTemps: parsedWinSensors.boardTemps,
          provenance: 'detected',
        },
        cpu: {
          model: cpuModel,
          manufacturer: cleanStr(winData?.cpu?.Manufacturer) || cleanStr(siCpu?.manufacturer),
          architecture: os.arch(),
          socket: cleanStr(winData?.cpu?.SocketDesignation) || cleanStr(siCpu?.socket) || guessedPlatform.socket,
          physicalCores: toNum(winData?.cpu?.NumberOfCores) ?? toNum(siCpu?.physicalCores),
          logicalThreads: toNum(winData?.cpu?.NumberOfLogicalProcessors) ?? toNum(siCpu?.cores),
          baseClockGhz: normalizeCpuClockGhz(siCpu?.speed),
          maxBoostClockGhz:
            toNum(winData?.cpu?.MaxClockSpeed) && Number(winData.cpu.MaxClockSpeed) > 0
              ? normalizeCpuClockGhz(Number(winData.cpu.MaxClockSpeed) / 1000)
              : normalizeCpuClockGhz(siCpu?.speedMax),
          l2CacheKB: toNum(winData?.cpu?.L2CacheSize),
          l3CacheKB: toNum(winData?.cpu?.L3CacheSize),
          stepping: cleanStr(winData?.cpu?.Stepping) || cleanStr(siCpu?.stepping),
          virtualizationFirmwareEnabled: typeof winData?.cpu?.VirtualizationFirmwareEnabled === 'boolean' ? winData.cpu.VirtualizationFirmwareEnabled : null,
          hypervisorPresent: typeof winData?.cs?.HypervisorPresent === 'boolean' ? winData.cs.HypervisorPresent : null,
          instructionSets: cleanStr(siCpu?.flags) ? String(siCpu.flags).split(/\s+/).slice(0, 24) : [],
          throttlingState: 'unknown',
          provenance: 'detected',
        },
        gpus: sortGpusDiscreteFirst(
          asArray(winData?.videoCtrls).length > 0
            ? asArray(winData?.videoCtrls).map((g, idx) => {
                const name = cleanStr(g?.Name) || `GPU ${idx + 1}`;
                const vendor = cleanStr(g?.AdapterCompatibility);
                const isIntegrated = classifyIsIntegratedGpu(name, vendor);
                return {
                  id: `dgpu-${idx}`,
                  model: name,
                  vendor,
                  isIntegrated,
                  workloadRole: isIntegrated
                    ? 'Desktop Compositing / Display Output / QuickSync-Video Decode'
                    : 'Primary 3D Rendering, Gaming & Compute',
                  driverVersion: cleanStr(g?.DriverVersion),
                  driverDate: parseWindowsFirmwareDate(g?.DriverDate),
                  vramMB: toNum(g?.AdapterRAM) && Number(g.AdapterRAM) > 0 ? Math.round(Number(g.AdapterRAM) / (1024 * 1024)) : null,
                  directXFeatureLevel: null,
                  pnpDeviceId: cleanStr(g?.PNPDeviceID),
                  provenance: 'detected',
                };
              })
            : asArray(siGraphics?.controllers).map((c, idx) => {
                const name = cleanStr(c?.model) || `GPU ${idx + 1}`;
                const vendor = cleanStr(c?.vendor);
                const isIntegrated = classifyIsIntegratedGpu(name, vendor);
                return {
                  id: `dgpu-si-${idx}`,
                  model: name,
                  vendor,
                  isIntegrated,
                  workloadRole: isIntegrated
                    ? 'Integrated Display & Shared-Memory Graphics'
                    : 'Primary 3D Rendering, Gaming & Compute',
                  driverVersion: cleanStr(c?.driverVersion),
                  driverDate: null,
                  vramMB: toNum(c?.vram),
                  directXFeatureLevel: null,
                  pnpDeviceId: null,
                  provenance: 'detected',
                };
              })
        ),
        memory: {
          totalBytes: os.totalmem(),
          slotsTotal: memSlotsTotal,
          slotsUsed: populatedModules.length > 0 ? populatedModules.length : null,
          maxCapacityBytes: maxRamGB ? maxRamGB * 1024 * 1024 * 1024 : null,
          channelMode:
            populatedModules.length === 1
              ? 'Single Channel'
              : populatedModules.length === 2
              ? 'Dual Channel'
              : populatedModules.length >= 4
              ? 'Dual / Quad Channel'
              : null,
          eccStatus:
            Number(winData?.memArr?.MemoryErrorCorrection) === 6
              ? 'Multi-bit ECC'
              : Number(winData?.memArr?.MemoryErrorCorrection) === 5
              ? 'Single-bit ECC'
              : Number(winData?.memArr?.MemoryErrorCorrection) === 3
              ? 'Non-ECC'
              : 'Unknown',
          pageFileTotalMB: toNum(winData?.pageFile?.AllocatedBaseSize),
          pageFileUsedMB: toNum(winData?.pageFile?.CurrentUsage),
          modules,
          provenance: 'detected',
        },
        storage,
        fans: {
          items: fansList,
          totalDetectedCount: fansList.length,
          runningCount: fansList.filter((f) => f.status === 'running').length,
          stoppedCount: fansList.filter((f) => f.status === 'stopped_confirmed').length,
          sensorSource: lhmWmiRunning
            ? 'LibreHardwareMonitor WMI'
            : lhmDirectActive
            ? 'LibreHardwareMonitorLib (Direct)'
            : ohmRunning
            ? 'OpenHardwareMonitor WMI'
            : isLinux && fansList.length > 0
            ? 'Linux sysfs hwmon'
            : nvSmiAvailable
            ? 'NVIDIA nvidia-smi (% only)'
            : null,
          provenance: fansList.length > 0 ? 'measured' : 'sensor_unavailable',
        },
        thermals: {
          sensors: parsedWinSensors.allTemps,
          inspectionNote: 'Software sensors cannot detect dust buildup or dried thermal paste directly. Physical inspection is required if temperatures stay abnormally high under normal load.',
        },
        ports: {
          confirmedPhysical,
          controllers,
          connectedDevices,
          unconfirmedPhysical,
          summaryNotes: portNotes,
          provenance: !isWindows ? 'not_supported' : confirmedPhysical.length > 0 ? 'detected' : 'unknown',
        },
        power: {
          psuTelemetryExposed: false,
          psuNote: 'Standard consumer ATX/SFX power supplies do not report total wattage or rail health via OS software unless connected to a specialized USB telemetry PSU (e.g., Corsair iCUE / ASUS ROG Thor OLED bridge).',
          acAdapterConnected:
            hasBattery
              ? typeof siBattery?.acConnected === 'boolean'
                ? siBattery.acConnected
                : typeof winData?.batStat?.PowerOnline === 'boolean'
                ? winData.batStat.PowerOnline
                : null
              : null,
          powerPlan: null,
          battery: hasBattery
            ? {
                present: true,
                manufacturer: cleanStr(winData?.batStatic?.ManufactureName) || cleanStr(siBattery?.manufacturer),
                chemistry: decodeBatteryChemistry(winData?.bat?.Chemistry) || cleanStr(siBattery?.type),
                chargePercent: toNum(siBattery?.percent) ?? toNum(winData?.bat?.EstimatedChargeRemaining),
                isCharging:
                  typeof siBattery?.isCharging === 'boolean'
                    ? siBattery.isCharging
                    : typeof winData?.batStat?.Charging === 'boolean'
                    ? winData.batStat.Charging
                    : null,
                designCapacityMwh: batDesign,
                fullChargeCapacityMwh: batFull,
                wearPercent: batWear,
                healthPercent: batHealth,
                cycleCount: toNum(siBattery?.cycleCount) ?? toNum(winData?.batCycle?.CycleCount),
                chargeRateWatts: chargeRateMw ? Number((chargeRateMw / 1000).toFixed(1)) : null,
                voltageMv: toNum(winData?.batStat?.Voltage) ?? toNum(winData?.bat?.DesignVoltage),
                provenance: 'measured',
              }
            : null,
        },
        displays,
        network: {
          adapters: networkAdapters,
          bluetoothAdapters,
        },
        peripherals,
        otherComponents,
        drivers: asArray(winData?.drivers).map((d) => ({
          deviceName: cleanStr(d?.DeviceName) || 'Driver',
          deviceClass: cleanStr(d?.DeviceClass),
          manufacturer: cleanStr(d?.Manufacturer),
          driverVersion: cleanStr(d?.DriverVersion),
          driverDate: parseWindowsFirmwareDate(d?.DriverDate),
          isSigned: typeof d?.IsSigned === 'boolean' ? d.IsSigned : null,
          signer: cleanStr(d?.Signer),
        })),
        diagnosticEvents: {
          pnpErrors: asArray(winData?.pnpErrors).map((e) => ({
            name: cleanStr(e?.Name) || 'Device',
            deviceId: cleanStr(e?.PNPDeviceID),
            deviceClass: cleanStr(e?.PNPClass),
            errorCode: toNum(e?.ConfigManagerErrorCode),
            status: cleanStr(e?.Status),
          })),
          eventLogWarnings: asArray(winData?.events).map((ev, idx) => ({
            id: `evt-${idx}`,
            timestamp: cleanStr(String(ev?.TimeCreated || '')) || '',
            level: cleanStr(ev?.LevelDisplayName) || 'Warning',
            providerName: cleanStr(ev?.ProviderName) || 'System',
            eventId: toNum(ev?.Id) || 0,
            category: classifyEventCategory(ev?.ProviderName, ev?.Message),
            message: String(ev?.Message || '').replace(/\s+/g, ' ').trim().slice(0, 280),
          })),
          eventLogErrorNote: cleanStr(winData?.eventErr),
        },
      };

      cachedInventory = inventory;
      lastCollectedAt = Date.now();
      return inventory;
    })().finally(() => {
      pendingPromise = null;
    });

    return pendingPromise;
  }

  return {
    collectDeepInventory,
  };
}

module.exports = {
  createDeepInventoryCollector,
  mapChassisFormFactor,
  mapPortConnectorType,
  cleanStr,
  normalizeCpuClockGhz,
  classifyIsIntegratedGpu,
  sortGpusDiscreteFirst,
  matchWmiMonitors,
  resolveTpmState,
};
