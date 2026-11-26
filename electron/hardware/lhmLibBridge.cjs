const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execFile } = require('child_process');

const ALLOWED_LHM_SENSOR_TYPES = new Set([
  'Temperature',
  'Fan',
  'Voltage',
  'Clock',
  'Load',
  'Power',
  'Control',
]);

const PS_QUERY_SCRIPT = [
  '$ErrorActionPreference = "Stop";',
  '$dllPath = $env:LHM_DLL_PATH;',
  'if (-not $dllPath -or -not (Test-Path -LiteralPath $dllPath)) { throw "LibreHardwareMonitorLib.dll path not found." }',
  '$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator);',
  '$dllDir = Split-Path -Parent $dllPath;',
  '$hidDll = Join-Path $dllDir "HidSharp.dll";',
  'if (Test-Path -LiteralPath $hidDll) { try { Add-Type -Path $hidDll | Out-Null } catch {} }',
  'Add-Type -Path $dllPath | Out-Null;',
  '$computer = [LibreHardwareMonitor.Hardware.Computer]::new();',
  '$computer.IsCpuEnabled = $true;',
  '$computer.IsGpuEnabled = $true;',
  '$computer.IsMotherboardEnabled = $true;',
  '$computer.IsMemoryEnabled = $true;',
  '$computer.IsStorageEnabled = $true;',
  '$computer.IsNetworkEnabled = $true;',
  '$computer.IsControllerEnabled = $true;',
  '$sensors = New-Object System.Collections.Generic.List[object];',
  '$hardwareErrors = New-Object System.Collections.Generic.List[string];',
  '$opened = $false;',
  'try {',
  '  $computer.Open();',
  '  $opened = $true;',
  '  foreach ($hw in $computer.Hardware) {',
  '    try { $hw.Update() } catch { $hardwareErrors.Add($_.Exception.Message) }',
  '    $hwType = [string]$hw.HardwareType;',
  '    $hwName = [string]$hw.Name;',
  '    foreach ($s in $hw.Sensors) {',
  '      if ($null -eq $s.Value) { continue }',
  '      $st = [string]$s.SensorType;',
  '      if ($st -notin @("Temperature","Fan","Voltage","Clock","Load","Power","Control")) { continue }',
  '      $sensors.Add([PSCustomObject]@{ Name = [string]$s.Name; SensorType = $st; Value = [double]$s.Value; Min = if ($null -ne $s.Min) { [double]$s.Min } else { $null }; Max = if ($null -ne $s.Max) { [double]$s.Max } else { $null }; Identifier = [string]$s.Identifier; HardwareType = $hwType; HardwareName = $hwName });',
  '    }',
  '    foreach ($sub in $hw.SubHardware) {',
  '      try { $sub.Update() } catch {}',
  '      $subType = [string]$sub.HardwareType;',
  '      $subName = [string]$sub.Name;',
  '      foreach ($s in $sub.Sensors) {',
  '        if ($null -eq $s.Value) { continue }',
  '        $st = [string]$s.SensorType;',
  '        if ($st -notin @("Temperature","Fan","Voltage","Clock","Load","Power","Control")) { continue }',
  '        $sensors.Add([PSCustomObject]@{ Name = [string]$s.Name; SensorType = $st; Value = [double]$s.Value; Min = if ($null -ne $s.Min) { [double]$s.Min } else { $null }; Max = if ($null -ne $s.Max) { [double]$s.Max } else { $null }; Identifier = [string]$s.Identifier; HardwareType = $subType; HardwareName = $subName });',
  '      }',
  '    }',
  '  }',
  '} finally {',
  '  if ($opened) { try { $computer.Close() } catch {} }',
  '}',
  '@{ ok = $true; isAdmin = $isAdmin; sensors = $sensors; errors = $hardwareErrors } | ConvertTo-Json -Depth 4 -Compress',
].join(' ');

function isValidDllPath(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath.trim()) return false;
  if (rawPath.includes('\0')) return false;
  const resolved = path.resolve(rawPath.trim());
  return resolved.toLowerCase().endsWith('.dll');
}

function execFileWithEnv(cmd, args, { env, timeoutMs = 6500 } = {}) {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      {
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: 4 * 1024 * 1024,
        env: env || process.env,
      },
      (err, stdout, stderr) => {
        resolve({
          ok: !err,
          stdout: typeof stdout === 'string' ? stdout.trim() : '',
          stderr: typeof stderr === 'string' ? stderr.trim() : '',
          errorMessage: err ? String(err.message || err) : null,
        });
      }
    );
  });
}

function summarizeLhmCoverage(sensors, isAdmin) {
  const list = Array.isArray(sensors) ? sensors : [];
  let hasCpuSensors = false;
  let hasGpuSensors = false;
  let hasMotherboardSensors = false;
  let hasMemorySensors = false;
  let hasStorageSensors = false;
  let hasFanSensors = false;
  let hasVoltageSensors = false;

  for (const s of list) {
    const hwType = String(s?.HardwareType || '').toLowerCase();
    const ident = String(s?.Identifier || '').toLowerCase();
    const sType = String(s?.SensorType || '').toLowerCase();
    if (hwType.includes('cpu') || ident.includes('cpu')) hasCpuSensors = true;
    if (hwType.includes('gpu') || ident.includes('gpu')) hasGpuSensors = true;
    if (hwType.includes('motherboard') || hwType.includes('superio') || ident.includes('/lpc')) {
      hasMotherboardSensors = true;
    }
    if (hwType.includes('memory') || ident.includes('/ram')) hasMemorySensors = true;
    if (hwType.includes('storage') || ident.includes('nvme') || ident.includes('hdd')) {
      hasStorageSensors = true;
    }
    if (sType === 'fan') hasFanSensors = true;
    if (sType === 'voltage') hasVoltageSensors = true;
  }

  const requiresAdminHint =
    isAdmin === false && (!hasMotherboardSensors || !hasCpuSensors || !hasFanSensors);

  return {
    sensorCount: list.length,
    hasCpuSensors,
    hasGpuSensors,
    hasMotherboardSensors,
    hasMemorySensors,
    hasStorageSensors,
    hasFanSensors,
    hasVoltageSensors,
    requiresAdminHint,
  };
}

function parseLhmBridgeOutput(rawStdout, fallbackError = null) {
  if (!rawStdout || typeof rawStdout !== 'string') {
    const msg = fallbackError || 'Empty output from LibreHardwareMonitorLib bridge.';
    const adminHint = /access|denied|unauthorized|privilege|winring0|driver/i.test(msg);
    return {
      ok: false,
      isAdmin: null,
      sensors: [],
      errors: msg ? [msg] : [],
      coverage: summarizeLhmCoverage([], adminHint ? false : null),
      requiresAdminHint: adminHint,
      error: msg,
    };
  }

  try {
    const parsed = JSON.parse(rawStdout);
    const rawSensors = Array.isArray(parsed?.sensors)
      ? parsed.sensors
      : parsed?.sensors
      ? [parsed.sensors]
      : [];
    const sensors = rawSensors
      .filter((s) => s && ALLOWED_LHM_SENSOR_TYPES.has(String(s.SensorType || '')))
      .map((s) => ({
        Name: String(s.Name || '').trim(),
        SensorType: String(s.SensorType || '').trim(),
        Value: Number(s.Value),
        Min: s.Min !== null && s.Min !== undefined && Number.isFinite(Number(s.Min)) ? Number(s.Min) : null,
        Max: s.Max !== null && s.Max !== undefined && Number.isFinite(Number(s.Max)) ? Number(s.Max) : null,
        Identifier: String(s.Identifier || '').trim(),
        HardwareType: String(s.HardwareType || '').trim(),
        HardwareName: String(s.HardwareName || '').trim(),
      }))
      .filter((s) => s.Name && Number.isFinite(s.Value));

    const isAdmin = typeof parsed?.isAdmin === 'boolean' ? parsed.isAdmin : null;
    const errors = Array.isArray(parsed?.errors)
      ? parsed.errors.map((e) => String(e || '').trim()).filter(Boolean)
      : [];
    const coverage = summarizeLhmCoverage(sensors, isAdmin);
    const errorHintsAdmin = errors.some((e) => /access|denied|unauthorized|privilege|winring0|driver/i.test(e));

    return {
      ok: true,
      isAdmin,
      sensors,
      errors,
      coverage,
      requiresAdminHint: Boolean(coverage.requiresAdminHint || (isAdmin === false && errorHintsAdmin)),
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      isAdmin: null,
      sensors: [],
      errors: [String(err?.message || 'Failed to parse LibreHardwareMonitorLib JSON output.')],
      coverage: summarizeLhmCoverage([], null),
      requiresAdminHint: false,
      error: 'Failed to parse LibreHardwareMonitorLib JSON output.',
    };
  }
}

async function readManagedLhmSensors({
  dllPath,
  timeoutMs = 6500,
  platformOverride,
  execOverride,
  existsOverride,
} = {}) {
  const effectivePlatform = platformOverride || process.platform;
  if (effectivePlatform !== 'win32') {
    return {
      ok: false,
      isAdmin: null,
      sensors: [],
      errors: [],
      coverage: summarizeLhmCoverage([], null),
      requiresAdminHint: false,
      error: 'Direct LibreHardwareMonitorLib telemetry is Windows-only.',
    };
  }

  if (!isValidDllPath(dllPath)) {
    return {
      ok: false,
      isAdmin: null,
      sensors: [],
      errors: [],
      coverage: summarizeLhmCoverage([], null),
      requiresAdminHint: false,
      error: 'Invalid LibreHardwareMonitorLib.dll path.',
    };
  }

  const resolvedDll = path.resolve(dllPath.trim());
  const exists = typeof existsOverride === 'function' ? existsOverride(resolvedDll) : fs.existsSync(resolvedDll);
  if (!exists) {
    return {
      ok: false,
      isAdmin: null,
      sensors: [],
      errors: [],
      coverage: summarizeLhmCoverage([], null),
      requiresAdminHint: false,
      error: 'LibreHardwareMonitorLib.dll is not installed.',
    };
  }

  const runner = typeof execOverride === 'function' ? execOverride : execFileWithEnv;
  const res = await runner(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', PS_QUERY_SCRIPT],
    {
      timeoutMs,
      env: {
        ...process.env,
        LHM_DLL_PATH: resolvedDll,
      },
    }
  );

  if (!res || (!res.ok && !res.stdout)) {
    const errText = String(res?.stderr || res?.errorMessage || 'Failed to execute LibreHardwareMonitorLib query.').trim();
    const adminHint = /access|denied|unauthorized|privilege|winring0|driver/i.test(errText);
    return {
      ok: false,
      isAdmin: null,
      sensors: [],
      errors: errText ? [errText] : [],
      coverage: summarizeLhmCoverage([], adminHint ? false : null),
      requiresAdminHint: adminHint,
      error: errText.slice(0, 260),
    };
  }

  return parseLhmBridgeOutput(res.stdout, res.stderr || res.errorMessage);
}

async function inspectDllFileMetadata(dllPath, { platformOverride, execOverride } = {}) {
  if (!isValidDllPath(dllPath)) return { validPe: false, fileVersion: null };
  const resolved = path.resolve(dllPath.trim());
  try {
    const fd = await fsp.open(resolved, 'r');
    try {
      const hdr = Buffer.alloc(2);
      await fd.read(hdr, 0, 2, 0);
      if (hdr.toString('ascii') !== 'MZ') {
        return { validPe: false, fileVersion: null };
      }
    } finally {
      await fd.close();
    }
  } catch {
    return { validPe: false, fileVersion: null };
  }

  const effectivePlatform = platformOverride || process.platform;
  if (effectivePlatform !== 'win32') {
    return { validPe: true, fileVersion: null };
  }

  const runner = typeof execOverride === 'function' ? execOverride : execFileWithEnv;
  const res = await runner(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      '$vi = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($env:LHM_DLL_PATH); @{ FileVersion = $vi.FileVersion; ProductVersion = $vi.ProductVersion } | ConvertTo-Json -Compress',
    ],
    {
      timeoutMs: 3500,
      env: { ...process.env, LHM_DLL_PATH: resolved },
    }
  ).catch(() => null);

  if (res?.ok && res.stdout) {
    try {
      const parsed = JSON.parse(res.stdout);
      const rawVer = String(parsed?.ProductVersion || parsed?.FileVersion || '').trim();
      const match = rawVer.match(/(\d+(?:\.\d+){1,3})/);
      return {
        validPe: true,
        fileVersion: match ? match[1] : null,
      };
    } catch {
      return { validPe: true, fileVersion: null };
    }
  }

  return { validPe: true, fileVersion: null };
}

module.exports = {
  readManagedLhmSensors,
  inspectDllFileMetadata,
  parseLhmBridgeOutput,
  summarizeLhmCoverage,
  isValidDllPath,
};
