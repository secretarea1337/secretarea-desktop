'use strict';

const { spawn } = require('child_process');
const path = require('path');

const RESPONSE_PREFIX = '__SA_WTW_RES__';

const PS_WORKER_BOOTSTRAP = `
$ErrorActionPreference = "SilentlyContinue"
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$script:saLhmComputer = $null
$script:saLhmDllPath = $null
$script:saIsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

function Close-SaLhm {
  if ($null -ne $script:saLhmComputer) {
    try { $script:saLhmComputer.Close() } catch {}
    $script:saLhmComputer = $null
    $script:saLhmDllPath = $null
  }
}

function Emit-SaRes([string]$id, $payload) {
  $json = $payload | ConvertTo-Json -Depth 5 -Compress
  [Console]::Out.WriteLine("${RESPONSE_PREFIX}:$($id):$($json)")
  [Console]::Out.Flush()
}

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  $trimmed = $line.Trim()
  if (-not $trimmed) { continue }

  $req = $null
  try {
    $rawJson = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($trimmed))
    $req = $rawJson | ConvertFrom-Json
  } catch {
    continue
  }

  $reqId = [string]$req.id
  $op = [string]$req.op

  if ($op -eq "exit") {
    Close-SaLhm
    Emit-SaRes $reqId @{ ok = $true }
    break
  }

  if ($op -eq "ping") {
    Emit-SaRes $reqId @{ ok = $true }
    continue
  }

  if ($op -eq "lhm_close") {
    Close-SaLhm
    Emit-SaRes $reqId @{ ok = $true }
    continue
  }

  if ($op -eq "fs_disks") {
    try {
      $disks = @(Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID,Size,FreeSpace,FileSystem,VolumeName)
      Emit-SaRes $reqId @{ ok = $true; disks = $disks }
    } catch {
      Emit-SaRes $reqId @{ ok = $false; error = $_.Exception.Message }
    }
    continue
  }

  if ($op -eq "ps_script") {
    try {
      $sb = [ScriptBlock]::Create([string]$req.script)
      $out = & $sb
      $text = if ($out -is [array]) { ($out | Out-String).Trim() } elseif ($null -ne $out) { ([string]$out).Trim() } else { "" }
      Emit-SaRes $reqId @{ ok = $true; stdout = $text }
    } catch {
      Emit-SaRes $reqId @{ ok = $false; stdout = ""; error = $_.Exception.Message }
    }
    continue
  }

  if ($op -eq "perf_tick") {
    try {
      $cpuFreq = Get-CimInstance Win32_PerfFormattedData_Counters_ProcessorInformation -Filter "Name='_Total'" | Select-Object -First 1 ProcessorFrequency
      $physDisk = @(Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk | Select-Object Name,DiskReadBytesPersec,DiskWriteBytesPersec)
      if ($physDisk.Count -eq 0) {
        $physDisk = @(Get-CimInstance Win32_PerfFormattedData_PerfDisk_LogicalDisk | Select-Object Name,DiskReadBytesPersec,DiskWriteBytesPersec)
      }
      $netStats = @(Get-NetAdapterStatistics | Select-Object Name,InterfaceDescription,ReceivedBytes,SentBytes)
      $gpuMem = @(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory | Select-Object Name,DedicatedUsage,SharedUsage)
      $gpuEng = $null
      if ($req.includeGpuEng) {
        $gpuEng = @(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine | Where-Object { $_.UtilizationPercentage -gt 0 -and $_.Name -match "engtype_(3D|Compute|VideoDecode|VideoEncode|Copy)" } | Select-Object Name,UtilizationPercentage)
      }
      $thermalAcpi = $null
      $thermalPerf = $null
      $powerMeters = $null
      if ($req.includeThermal) {
        $thermalAcpi = @(Get-CimInstance -Namespace root/wmi MSAcpi_ThermalZoneTemperature | Select-Object InstanceName,CurrentTemperature)
        $thermalPerf = @(Get-CimInstance Win32_PerfFormattedData_Counters_ThermalZoneInformation | Select-Object Name,Temperature,HighPrecisionTemperature)
        $powerMeters = @(Get-CimInstance Win32_PerfFormattedData_PowerMeterCounter_PowerMeter | Select-Object Name,Power)
      }
      $hwSensors = @()
      if ($req.hasLhmWmi) {
        $hwSensors = @(Get-CimInstance -Namespace root\\LibreHardwareMonitor -ClassName Sensor | Where-Object { $_.SensorType -in @("Temperature","Power","Clock","Load","Fan") } | Select-Object Name,SensorType,Value,Identifier)
      } elseif ($req.hasOhmWmi) {
        $hwSensors = @(Get-CimInstance -Namespace root\\OpenHardwareMonitor -ClassName Sensor | Where-Object { $_.SensorType -in @("Temperature","Power","Clock","Load","Fan") } | Select-Object Name,SensorType,Value,Identifier)
      }
      Emit-SaRes $reqId @{
        ok = $true
        data = @{
          cpuFreq = $cpuFreq
          physDisk = $physDisk
          netStats = $netStats
          gpuEng = $gpuEng
          gpuMem = $gpuMem
          thermalAcpi = $thermalAcpi
          thermalPerf = $thermalPerf
          powerMeters = $powerMeters
          hwSensors = $hwSensors
        }
      }
    } catch {
      Emit-SaRes $reqId @{ ok = $false; error = $_.Exception.Message }
    }
    continue
  }

  if ($op -eq "lhm_query") {
    try {
      $dllPath = [string]$req.dllPath
      if (-not $dllPath -or -not (Test-Path -LiteralPath $dllPath)) {
        Emit-SaRes $reqId @{ ok = $false; isAdmin = $script:saIsAdmin; sensors = @(); errors = @("LibreHardwareMonitorLib.dll path not found.") }
        continue
      }
      if ($null -eq $script:saLhmComputer -or $script:saLhmDllPath -ne $dllPath) {
        Close-SaLhm
        $dllDir = Split-Path -Parent $dllPath
        $hidDll = Join-Path $dllDir "HidSharp.dll"
        if (Test-Path -LiteralPath $hidDll) { try { Add-Type -Path $hidDll | Out-Null } catch {} }
        Add-Type -Path $dllPath | Out-Null
        $comp = [LibreHardwareMonitor.Hardware.Computer]::new()
        $comp.IsCpuEnabled = $true
        $comp.IsGpuEnabled = $true
        $comp.IsMotherboardEnabled = $true
        $comp.IsMemoryEnabled = $true
        $comp.IsStorageEnabled = $true
        $comp.IsNetworkEnabled = $true
        $comp.IsControllerEnabled = $true
        $comp.Open()
        $script:saLhmComputer = $comp
        $script:saLhmDllPath = $dllPath
      }
      $sensors = New-Object System.Collections.Generic.List[object]
      $hardwareErrors = New-Object System.Collections.Generic.List[string]
      foreach ($hw in $script:saLhmComputer.Hardware) {
        try { $hw.Update() } catch { $hardwareErrors.Add($_.Exception.Message) }
        $hwType = [string]$hw.HardwareType
        $hwName = [string]$hw.Name
        foreach ($s in $hw.Sensors) {
          if ($null -eq $s.Value) { continue }
          $st = [string]$s.SensorType
          if ($st -notin @("Temperature","Fan","Voltage","Clock","Load","Power","Control")) { continue }
          $sensors.Add([PSCustomObject]@{ Name = [string]$s.Name; SensorType = $st; Value = [double]$s.Value; Min = if ($null -ne $s.Min) { [double]$s.Min } else { $null }; Max = if ($null -ne $s.Max) { [double]$s.Max } else { $null }; Identifier = [string]$s.Identifier; HardwareType = $hwType; HardwareName = $hwName })
        }
        foreach ($sub in $hw.SubHardware) {
          try { $sub.Update() } catch {}
          $subType = [string]$sub.HardwareType
          $subName = [string]$sub.Name
          foreach ($s in $sub.Sensors) {
            if ($null -eq $s.Value) { continue }
            $st = [string]$s.SensorType
            if ($st -notin @("Temperature","Fan","Voltage","Clock","Load","Power","Control")) { continue }
            $sensors.Add([PSCustomObject]@{ Name = [string]$s.Name; SensorType = $st; Value = [double]$s.Value; Min = if ($null -ne $s.Min) { [double]$s.Min } else { $null }; Max = if ($null -ne $s.Max) { [double]$s.Max } else { $null }; Identifier = [string]$s.Identifier; HardwareType = $subType; HardwareName = $subName })
          }
        }
      }
      Emit-SaRes $reqId @{ ok = $true; isAdmin = $script:saIsAdmin; sensors = $sensors; errors = $hardwareErrors }
    } catch {
      Close-SaLhm
      Emit-SaRes $reqId @{ ok = $false; isAdmin = $script:saIsAdmin; sensors = @(); errors = @($_.Exception.Message) }
    }
    continue
  }

  Emit-SaRes $reqId @{ ok = $false; error = "Unknown op" }
}
`;

function createWinTelemetryWorker({ platformOverride, spawnOverride } = {}) {
  const effectivePlatform = platformOverride || process.platform;
  const spawnFn = typeof spawnOverride === 'function' ? spawnOverride : spawn;

  let proc = null;
  let stdoutBuffer = '';
  let nextReqSeq = 1;
  let pendingMap = new Map();
  let queue = Promise.resolve();
  let isDestroyed = false;

  function rejectAllPending(reason) {
    for (const entry of pendingMap.values()) {
      clearTimeout(entry.timer);
      entry.resolve(null);
    }
    pendingMap.clear();
  }

  function cleanupProc() {
    const active = proc;
    proc = null;
    stdoutBuffer = '';
    rejectAllPending('worker closed');
    if (active && !active.killed) {
      try {
        active.kill();
      } catch {
        // ignore
      }
    }
  }

  function ensureWorker() {
    if (effectivePlatform !== 'win32' || isDestroyed) return null;
    if (proc && !proc.killed && proc.exitCode === null && proc.stdin && !proc.stdin.destroyed) {
      return proc;
    }

    const encodedScript = Buffer.from(PS_WORKER_BOOTSTRAP, 'utf16le').toString('base64');
    const child = spawnFn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedScript],
      {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    stdoutBuffer = '';
    proc = child;

    child.stdout?.on('data', (chunk) => {
      if (proc !== child) return;
      stdoutBuffer += chunk.toString('utf8');
      let nlIdx;
      while ((nlIdx = stdoutBuffer.indexOf('\n')) >= 0) {
        const line = stdoutBuffer.slice(0, nlIdx).replace(/\r$/, '');
        stdoutBuffer = stdoutBuffer.slice(nlIdx + 1);
        if (!line.startsWith(`${RESPONSE_PREFIX}:`)) continue;
        const firstSep = line.indexOf(':', RESPONSE_PREFIX.length);
        const secondSep = firstSep >= 0 ? line.indexOf(':', firstSep + 1) : -1;
        if (firstSep < 0 || secondSep < 0) continue;
        const id = line.slice(firstSep + 1, secondSep);
        const jsonPart = line.slice(secondSep + 1);
        const entry = pendingMap.get(id);
        if (!entry) continue;
        pendingMap.delete(id);
        clearTimeout(entry.timer);
        try {
          entry.resolve(JSON.parse(jsonPart));
        } catch {
          entry.resolve(null);
        }
      }
    });

    child.stderr?.on('data', () => {
      // swallow non-fatal CIM noise cleanly
    });

    const onExit = () => {
      if (proc === child) {
        proc = null;
        stdoutBuffer = '';
        rejectAllPending('worker exited');
      }
    };
    child.once('error', onExit);
    child.once('exit', onExit);

    return child;
  }

  function sendRequest(payload, timeoutMs = 5500) {
    if (effectivePlatform !== 'win32' || isDestroyed) {
      return Promise.resolve(null);
    }

    const run = () =>
      new Promise((resolve) => {
        if (isDestroyed) {
          resolve(null);
          return;
        }
        const child = ensureWorker();
        if (!child || !child.stdin || child.stdin.destroyed) {
          resolve(null);
          return;
        }

        const id = String(nextReqSeq++);
        const b64 = Buffer.from(JSON.stringify({ ...payload, id }), 'utf8').toString('base64');

        const timer = setTimeout(() => {
          if (pendingMap.has(id)) {
            pendingMap.delete(id);
            cleanupProc();
            resolve(null);
          }
        }, timeoutMs);

        pendingMap.set(id, { resolve, timer });
        try {
          child.stdin.write(`${b64}\n`);
        } catch {
          pendingMap.delete(id);
          clearTimeout(timer);
          cleanupProc();
          resolve(null);
        }
      });

    const next = queue.then(run, run);
    queue = next.catch(() => null);
    return next;
  }

  async function queryPerfTick({
    hasLhmWmi = false,
    hasOhmWmi = false,
    includeGpuEng = true,
    includeThermal = true,
    timeoutMs = 5500,
  } = {}) {
    const res = await sendRequest(
      {
        op: 'perf_tick',
        hasLhmWmi: Boolean(hasLhmWmi),
        hasOhmWmi: Boolean(hasOhmWmi),
        includeGpuEng: Boolean(includeGpuEng),
        includeThermal: Boolean(includeThermal),
      },
      timeoutMs
    );
    return res && res.ok ? res.data : null;
  }

  async function queryManagedLhm(dllPath, timeoutMs = 6000) {
    if (!dllPath || typeof dllPath !== 'string') return null;
    const resolved = path.resolve(dllPath.trim());
    const res = await sendRequest({ op: 'lhm_query', dllPath: resolved }, timeoutMs);
    return res || null;
  }

  async function queryLogicalDisks(timeoutMs = 4000) {
    const res = await sendRequest({ op: 'fs_disks' }, timeoutMs);
    if (!res || !res.ok) return null;
    return Array.isArray(res.disks) ? res.disks : res.disks ? [res.disks] : [];
  }

  async function runPsScript(script, timeoutMs = 5500) {
    if (!script || typeof script !== 'string') return null;
    const res = await sendRequest({ op: 'ps_script', script }, timeoutMs);
    if (!res || !res.ok) return null;
    return typeof res.stdout === 'string' ? res.stdout : '';
  }

  function destroy() {
    isDestroyed = true;
    const active = proc;
    if (active && active.stdin && !active.stdin.destroyed) {
      try {
        const b64 = Buffer.from(JSON.stringify({ id: 'exit', op: 'exit' }), 'utf8').toString('base64');
        active.stdin.write(`${b64}\n`);
        active.stdin.end();
      } catch {
        // ignore
      }
      setTimeout(() => {
        if (!active.killed) {
          try {
            active.kill();
          } catch {
            // ignore
          }
        }
      }, 220);
      proc = null;
      stdoutBuffer = '';
      rejectAllPending('worker destroyed');
    } else {
      cleanupProc();
    }
  }

  function reopen() {
    isDestroyed = false;
  }

  function suspend() {
    // Pause cleanly while keeping instance reusable when resumed
    const active = proc;
    if (active && active.stdin && !active.stdin.destroyed) {
      try {
        const b64 = Buffer.from(JSON.stringify({ id: 'exit', op: 'exit' }), 'utf8').toString('base64');
        active.stdin.write(`${b64}\n`);
        active.stdin.end();
      } catch {
        // ignore
      }
      setTimeout(() => {
        if (!active.killed) {
          try {
            active.kill();
          } catch {
            // ignore
          }
        }
      }, 220);
      proc = null;
      stdoutBuffer = '';
      rejectAllPending('worker suspended');
    } else {
      cleanupProc();
    }
  }

  return {
    queryPerfTick,
    queryManagedLhm,
    queryLogicalDisks,
    runPsScript,
    suspend,
    reopen,
    destroy,
    isRunning: () => Boolean(proc && !proc.killed && proc.exitCode === null),
  };
}

module.exports = {
  createWinTelemetryWorker,
};
