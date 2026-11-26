const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execFile, spawn } = require('child_process');
const { analyzeBottlenecks } = require('./bottleneckAnalyzer.cjs');

const MAX_HISTORY_SESSIONS = 20;
const MAX_FRAME_SAMPLES = 400;

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

function isValidPingTarget(host) {
  if (!host || typeof host !== 'string') return false;
  const trimmed = host.trim();
  if (trimmed.length === 0 || trimmed.length > 120) return false;
  return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(
    trimmed
  );
}

function parsePingOutput(stdout) {
  if (!stdout || typeof stdout !== 'string') {
    return { pingMs: null, packetLossPercent: null };
  }
  let pingMs = null;
  let packetLossPercent = null;

  // Windows: "Average = 18ms" or "Minimum = 14ms, Maximum = 22ms, Average = 18ms" + "(0% loss)"
  const winLossMatch = stdout.match(/\((\d+)%\s*loss\)/i);
  if (winLossMatch) {
    packetLossPercent = Number(winLossMatch[1]);
  }
  const winAvgMatch = stdout.match(/Average\s*=\s*(\d+)\s*ms/i);
  if (winAvgMatch) {
    pingMs = Number(winAvgMatch[1]);
  }

  // Linux/macOS: "4 packets transmitted, 4 received, 0% packet loss" & "rtt min/avg/max/mdev = 10.1/12.4/15.2/1.1 ms"
  const nixLossMatch = stdout.match(/(\d+(?:\.\d+)?)%\s*packet\s*loss/i);
  if (packetLossPercent === null && nixLossMatch) {
    packetLossPercent = Number(nixLossMatch[1]);
  }
  const nixAvgMatch = stdout.match(/(?:rtt|round-trip)\s+min\/avg\/max(?:\/(?:mdev|stddev))?\s*=\s*[0-9.]+\/([0-9.]+)\//i);
  if (pingMs === null && nixAvgMatch) {
    pingMs = Math.round(Number(nixAvgMatch[1]));
  }

  return { pingMs, packetLossPercent };
}

/**
 * Parses a PresentMon CSV header line (supports both v1.x and v2.x column layouts).
 */
function parsePresentMonHeader(line) {
  if (!line || typeof line !== 'string') return null;
  const trimmed = line.trim();
  if (!trimmed || !trimmed.includes(',')) return null;
  const cols = trimmed.split(',').map((c) => c.trim());
  const lowerSet = new Set(cols.map((c) => c.toLowerCase()));
  const hasApp = lowerSet.has('application');
  const hasFrameMetric =
    lowerSet.has('msbetweenpresents') ||
    lowerSet.has('frametime') ||
    lowerSet.has('msbetweendisplaychange');
  if (!hasApp || !hasFrameMetric) return null;
  return cols;
}

/**
 * Pure parser for PresentMon CSV stdout stream lines (zero injection ETW).
 * Supports both PresentMon v1 (`MsBetweenPresents`, `-output_stdout`)
 * and PresentMon v2 (`FrameTime` / `MsBetweenPresents`, `--output_stdout`).
 */
function parsePresentMonCsvLine(line, headerCols) {
  if (!line || typeof line !== 'string' || !Array.isArray(headerCols) || headerCols.length === 0) {
    return null;
  }
  const trimmed = line.trim();
  if (!trimmed || /^application\s*,/i.test(trimmed)) return null;
  const parts = trimmed.split(',');
  if (parts.length < headerCols.length) return null;

  const lowerHeader = headerCols.map((c) => c.toLowerCase());
  const getCol = (names) => {
    for (const candidate of names) {
      const idx = lowerHeader.indexOf(candidate.toLowerCase());
      if (idx >= 0 && parts[idx] !== undefined) {
        return parts[idx].trim().replace(/^"|"$/g, '');
      }
    }
    return null;
  };

  const frameTimeRaw = getCol([
    'MsBetweenPresents',
    'FrameTime',
    'MsBetweenDisplayChange',
    'MsGPUActive',
  ]);
  const frameTimeMs = frameTimeRaw !== null ? Number(frameTimeRaw) : NaN;
  if (!Number.isFinite(frameTimeMs) || frameTimeMs <= 0 || frameTimeMs > 5000) {
    return null;
  }

  const droppedRaw = getCol(['Dropped']);
  const dropped = droppedRaw === '1' || String(droppedRaw).toLowerCase() === 'true';

  const displayLatencyRaw = getCol(['MsUntilDisplayed', 'MsInPresentAPI', 'MsClickToPhotonLatency']);
  const displayLatencyMs = displayLatencyRaw !== null ? Number(displayLatencyRaw) : NaN;

  return {
    application: getCol(['Application']) || null,
    processId: Number(getCol(['ProcessID'])) || null,
    frameTimeMs,
    fps: 1000 / frameTimeMs,
    dropped,
    displayLatencyMs: Number.isFinite(displayLatencyMs) && displayLatencyMs >= 0 ? displayLatencyMs : null,
    timestamp: Date.now(),
  };
}

/**
 * Builds PresentMon CLI arguments compatible with both v2.x (`--flag`) and v1.x (`-flag`).
 */
function buildPresentMonArgs(pid, cliCapabilities) {
  const doubleDash = cliCapabilities ? cliCapabilities.doubleDash !== false : false;
  const prefix = doubleDash ? '--' : '-';
  const args = [
    `${prefix}process_id`,
    String(pid),
    `${prefix}output_stdout`,
  ];
  if (!cliCapabilities || cliCapabilities.supportsNoTop !== false) {
    args.push(`${prefix}no_top`);
  }
  if (!cliCapabilities || cliCapabilities.supportsTerminateOnExit !== false) {
    args.push(`${prefix}terminate_on_proc_exit`);
  }
  if (doubleDash && cliCapabilities?.supportsV1Metrics) {
    args.push('--v1_metrics');
  }
  return args;
}

function computeFpsSummary(frameTimesMs, droppedCount = 0) {
  if (!Array.isArray(frameTimesMs) || frameTimesMs.length === 0) {
    return {
      currentFps: null,
      averageFps: null,
      low1PercentFps: null,
      low01PercentFps: null,
      maxFps: null,
      currentFrameTimeMs: null,
      avgFrameTimeMs: null,
      minFrameTimeMs: null,
      maxFrameTimeMs: null,
      p95FrameTimeMs: null,
      spikeCount: 0,
      stutterCount: 0,
      framePacingStabilityPercent: null,
      droppedFrames: droppedCount,
    };
  }

  const valid = frameTimesMs.filter((ft) => typeof ft === 'number' && Number.isFinite(ft) && ft > 0);
  if (valid.length === 0) {
    return {
      currentFps: null,
      averageFps: null,
      low1PercentFps: null,
      low01PercentFps: null,
      maxFps: null,
      currentFrameTimeMs: null,
      avgFrameTimeMs: null,
      minFrameTimeMs: null,
      maxFrameTimeMs: null,
      p95FrameTimeMs: null,
      spikeCount: 0,
      stutterCount: 0,
      framePacingStabilityPercent: null,
      droppedFrames: droppedCount,
    };
  }

  const currentFrameTimeMs = Number(valid[valid.length - 1].toFixed(2));
  const currentFps = Math.round(1000 / currentFrameTimeMs);

  const avgFt = valid.reduce((a, b) => a + b, 0) / valid.length;
  const averageFps = Math.round(1000 / avgFt);

  // Sort ascending frame times (fastest = shortest frame time; slowest = longest frame time -> 1% Low FPS)
  const sortedAsc = [...valid].sort((a, b) => a - b);
  const minFt = sortedAsc[0];
  const maxFt = sortedAsc[sortedAsc.length - 1];
  const maxFps = Math.round(1000 / minFt);

  const medianFt = sortedAsc[Math.floor(sortedAsc.length / 2)];
  const p95Idx = Math.min(sortedAsc.length - 1, Math.floor(sortedAsc.length * 0.95));
  const p95FrameTimeMs = Number(sortedAsc[p95Idx].toFixed(2));

  // 1% Low & 0.1% Low FPS calculated from slowest 1% / 0.1% frame times
  const sortedDesc = [...sortedAsc].reverse();
  const top1Count = Math.max(1, Math.ceil(sortedDesc.length * 0.01));
  const avgTop1Ft = sortedDesc.slice(0, top1Count).reduce((a, b) => a + b, 0) / top1Count;
  const low1PercentFps = Math.round(1000 / avgTop1Ft);

  const top01Count = Math.max(1, Math.ceil(sortedDesc.length * 0.001));
  const avgTop01Ft = sortedDesc.slice(0, top01Count).reduce((a, b) => a + b, 0) / top01Count;
  const low01PercentFps = Math.round(1000 / avgTop01Ft);

  // Spikes = frame time >= 1.8x median or >= 40ms; Stutters = severe >= 2.2x median or >= 55ms
  let spikeCount = 0;
  let stutterCount = 0;
  for (const ft of valid) {
    if (ft >= Math.max(40, medianFt * 1.8)) spikeCount += 1;
    if (ft >= Math.max(55, medianFt * 2.2)) stutterCount += 1;
  }

  // Frame pacing stability (coefficient of variation inverted, bounded 0-100%)
  const variance = valid.reduce((acc, ft) => acc + (ft - avgFt) ** 2, 0) / valid.length;
  const stdDev = Math.sqrt(variance);
  const cv = avgFt > 0 ? stdDev / avgFt : 0;
  const framePacingStabilityPercent = Math.max(0, Math.min(100, Math.round((1 - Math.min(1, cv)) * 100)));

  return {
    currentFps,
    averageFps,
    low1PercentFps,
    low01PercentFps,
    maxFps,
    currentFrameTimeMs,
    avgFrameTimeMs: Number(avgFt.toFixed(2)),
    minFrameTimeMs: Number(minFt.toFixed(2)),
    maxFrameTimeMs: Number(maxFt.toFixed(2)),
    p95FrameTimeMs,
    spikeCount,
    stutterCount,
    framePacingStabilityPercent,
    droppedFrames: droppedCount,
  };
}

function createGamingSessionManager({ getMainWindow, getUserDataPath, getPresentMonInfo }) {
  let activeSession = null;
  let presentMonChild = null;
  let pingTimer = null;
  let isPinging = false;
  let pingTarget = '1.1.1.1';
  let latestPingStats = { pingMs: null, packetLossPercent: null, host: pingTarget };
  let cachedPresentMonPath = undefined;

  function resolvePresentMonDescriptor() {
    if (process.platform !== 'win32') {
      return { path: null, cliCapabilities: null };
    }

    if (typeof getPresentMonInfo === 'function') {
      try {
        const info = getPresentMonInfo();
        if (info && info.available && info.path && fs.existsSync(info.path)) {
          cachedPresentMonPath = info.path;
          return {
            path: info.path,
            cliCapabilities: info.cliCapabilities || null,
          };
        }
      } catch {
        // fallback to disk scan below
      }
    }

    if (cachedPresentMonPath && fs.existsSync(cachedPresentMonPath)) {
      return { path: cachedPresentMonPath, cliCapabilities: null };
    }

    const userDataDir = typeof getUserDataPath === 'function' ? getUserDataPath() : '';
    const candidates = [
      userDataDir ? path.join(userDataDir, 'tools', 'presentmon', 'PresentMon.exe') : '',
      path.join(process.resourcesPath || '', 'bin', 'PresentMon.exe'),
      path.join(process.resourcesPath || '', 'PresentMon.exe'),
      path.join(__dirname, '../../resources/bin/PresentMon.exe'),
      path.join('C:\\Program Files\\Intel\\PresentMon\\PresentMon.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Intel', 'PresentMon', 'PresentMon.exe'),
      path.join(process.env.USERPROFILE || '', 'PresentMon', 'PresentMon.exe'),
    ].filter(Boolean);

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          cachedPresentMonPath = candidate;
          return { path: candidate, cliCapabilities: null };
        }
      } catch {
        // ignore
      }
    }
    cachedPresentMonPath = null;
    return { path: null, cliCapabilities: null };
  }

  function detectPresentMonBinary() {
    return resolvePresentMonDescriptor().path;
  }

  function getHistoryPath() {
    const base = typeof getUserDataPath === 'function' ? getUserDataPath() : process.cwd();
    return path.join(base, 'gaming-sessions.json');
  }

  async function readSessionHistory() {
    try {
      const file = getHistoryPath();
      if (!fs.existsSync(file)) return [];
      const raw = await fsp.readFile(file, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async function saveSessionToHistory(summary) {
    try {
      const existing = await readSessionHistory();
      const updated = [summary, ...existing].slice(0, MAX_HISTORY_SESSIONS);
      const file = getHistoryPath();
      await fsp.mkdir(path.dirname(file), { recursive: true });
      await fsp.writeFile(file, JSON.stringify(updated, null, 2), 'utf8');
      return updated;
    } catch {
      return [];
    }
  }

  async function clearSessionHistory() {
    try {
      const file = getHistoryPath();
      if (fs.existsSync(file)) {
        await fsp.writeFile(file, '[]', 'utf8');
      }
      return [];
    } catch {
      return [];
    }
  }

  async function listCandidateProcesses() {
    if (process.platform === 'win32') {
      const script = [
        '$ErrorActionPreference = "SilentlyContinue";',
        '$ignore = @("TextInputHost","ApplicationFrameHost","SystemSettings","SearchHost","ShellExperienceHost","StartMenuExperienceHost","LockApp","dwm","explorer","svchost","conhost");',
        'Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $ignore -notcontains $_.ProcessName } | Select-Object -First 30 @{N="pid";E={$_.Id}},@{N="name";E={$_.ProcessName}},@{N="windowTitle";E={$_.MainWindowTitle}},@{N="memoryMB";E={[math]::Round($_.WorkingSet64 / 1MB)}} | ConvertTo-Json -Compress',
      ].join(' ');
      const out = await runExec(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
        3000
      );
      if (!out) return [];
      try {
        const parsed = JSON.parse(out);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        return arr
          .filter((p) => p && p.pid && p.name)
          .map((p) => ({
            pid: Number(p.pid),
            name: String(p.name),
            windowTitle: p.windowTitle ? String(p.windowTitle) : null,
            memoryMB: Number.isFinite(Number(p.memoryMB)) ? Number(p.memoryMB) : null,
          }));
      } catch {
        return [];
      }
    }

    // Linux process listing fallback (read-only /proc)
    const out = await runExec('ps', ['-eo', 'pid=,comm=,rss='], 1800);
    if (!out) return [];
    const ignoreNames = new Set(['systemd', 'bash', 'sh', 'ps', 'grep', 'dbus-daemon', 'kworker']);
    const list = [];
    for (const line of out.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) continue;
      const pid = Number(parts[0]);
      const name = parts[1];
      const rssKb = Number(parts[2]);
      if (!Number.isFinite(pid) || !name || ignoreNames.has(name)) continue;
      list.push({
        pid,
        name,
        windowTitle: null,
        memoryMB: Number.isFinite(rssKb) ? Math.round(rssKb / 1024) : null,
      });
    }
    return list.slice(0, 25);
  }

  function stopPresentMon() {
    if (presentMonChild) {
      try {
        presentMonChild.kill();
      } catch {
        // ignore
      }
      presentMonChild = null;
    }
  }

  function startPresentMonStream(pid) {
    stopPresentMon();
    const descriptor = resolvePresentMonDescriptor();
    const binPath = descriptor.path;
    if (!binPath || !activeSession) {
      return false;
    }

    try {
      const args = buildPresentMonArgs(pid, descriptor.cliCapabilities);
      presentMonChild = spawn(binPath, args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let buffer = '';
      let headerCols = null;

      presentMonChild.stdout.on('data', (chunk) => {
        if (!activeSession) return;
        buffer += chunk.toString('utf8');
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        for (const line of lines) {
          const clean = line.trim();
          if (!clean) continue;
          if (!headerCols) {
            const parsedHeader = parsePresentMonHeader(clean);
            if (parsedHeader) {
              headerCols = parsedHeader;
              continue;
            }
          }
          const sample = parsePresentMonCsvLine(clean, headerCols);
          if (sample) {
            activeSession.frameTimesMs.push(sample.frameTimeMs);
            if (activeSession.frameTimesMs.length > MAX_FRAME_SAMPLES) {
              activeSession.frameTimesMs.shift();
            }
            activeSession.totalFramesCaptured += 1;
            activeSession.allFrameTimesSum += sample.frameTimeMs;
            if (sample.dropped) activeSession.droppedFrames += 1;
            if (sample.displayLatencyMs !== null) {
              activeSession.lastInputDisplayLatencyMs = Number(sample.displayLatencyMs.toFixed(1));
            }
            activeSession.fpsTelemetryStatus = 'active';
          }
        }
      });

      presentMonChild.on('error', () => {
        if (activeSession) {
          activeSession.fpsTelemetryStatus = 'requires_presentmon';
        }
        presentMonChild = null;
      });

      presentMonChild.on('exit', () => {
        presentMonChild = null;
      });

      return true;
    } catch {
      presentMonChild = null;
      return false;
    }
  }

  async function runPingProbe() {
    if (isPinging || !isValidPingTarget(pingTarget)) return;
    isPinging = true;
    try {
      const args =
        process.platform === 'win32'
          ? ['-n', '4', '-w', '900', pingTarget]
          : ['-c', '4', '-W', '1', pingTarget];
      const out = await runExec('ping', args, 5000);
      const parsed = parsePingOutput(out);
      latestPingStats = {
        ...parsed,
        host: pingTarget,
      };
    } finally {
      isPinging = false;
    }
  }

  let pausedPingByHide = false;

  function startPingPolling() {
    if (pingTimer) clearInterval(pingTimer);
    pausedPingByHide = false;
    void runPingProbe();
    pingTimer = setInterval(() => {
      if (activeSession) {
        void runPingProbe();
      }
    }, 5500);
  }

  function stopPingPolling() {
    pausedPingByHide = false;
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  }

  function pauseForHidden() {
    if (!activeSession || !pingTimer) return;
    clearInterval(pingTimer);
    pingTimer = null;
    pausedPingByHide = true;
  }

  function resumeFromHidden() {
    if (!pausedPingByHide || !activeSession) return;
    startPingPolling();
  }

  function buildGamingState() {
    const pmBin = detectPresentMonBinary();
    const presentMonAvailable = Boolean(pmBin);

    if (!activeSession) {
      return {
        isActive: false,
        sessionId: null,
        processName: null,
        pid: null,
        startedAt: null,
        durationSeconds: 0,
        presentMonAvailable,
        presentMonPath: pmBin,
        fpsTelemetryStatus: process.platform === 'win32'
          ? presentMonAvailable
            ? 'ready'
            : 'requires_presentmon'
          : 'unavailable_on_os',
        fps: computeFpsSummary([], 0),
        frameTimeHistory: [],
        inputLatencyMs: null,
        inputLatencyNote: 'Requires game Reflex/XeLL/Anti-Lag SDK or PresentMon PCL telemetry',
        pingMs: latestPingStats.pingMs,
        packetLossPercent: latestPingStats.packetLossPercent,
        pingHost: pingTarget,
        thermalThrottlingDetected: false,
        bottleneckAnalysis: {
          ready: false,
          sampleCount: 0,
          requiredSamples: 5,
          thermalThrottlingDetected: false,
          findings: [],
        },
        sessionAverages: {
          avgCpuPercent: null,
          avgGpuPercent: null,
          avgRamPercent: null,
          peakCpuTempC: null,
          peakGpuTempC: null,
          peakVramUsedMB: null,
        },
      };
    }

    const fpsSummary = computeFpsSummary(activeSession.frameTimesMs, activeSession.droppedFrames);
    const bottleneck = analyzeBottlenecks(activeSession.hwSamples, 5);
    const validCpu = activeSession.hwSamples.map((s) => s.cpuPercent).filter((v) => typeof v === 'number');
    const validGpu = activeSession.hwSamples.map((s) => s.gpuPercent).filter((v) => typeof v === 'number');
    const validRam = activeSession.hwSamples.map((s) => s.ramPercent).filter((v) => typeof v === 'number');
    const validCpuT = activeSession.hwSamples.map((s) => s.cpuTempC).filter((v) => typeof v === 'number');
    const validGpuT = activeSession.hwSamples.map((s) => s.gpuTempC).filter((v) => typeof v === 'number');
    const validVram = activeSession.hwSamples.map((s) => s.vramUsedMB).filter((v) => typeof v === 'number');

    return {
      isActive: true,
      sessionId: activeSession.sessionId,
      processName: activeSession.processName,
      pid: activeSession.pid,
      startedAt: activeSession.startedAt,
      durationSeconds: Math.max(0, Math.floor((Date.now() - activeSession.startedAt) / 1000)),
      presentMonAvailable,
      presentMonPath: pmBin,
      fpsTelemetryStatus: activeSession.fpsTelemetryStatus,
      fps: fpsSummary,
      frameTimeHistory: activeSession.frameTimesMs.slice(-90),
      inputLatencyMs: activeSession.lastInputDisplayLatencyMs,
      inputLatencyNote: activeSession.lastInputDisplayLatencyMs !== null
        ? 'PresentMon display latency (requires game SDK for full click-to-photon)'
        : 'Requires game integration (NVIDIA Reflex / AMD Anti-Lag 2 / Intel XeLL) or PresentMon ETW',
      pingMs: latestPingStats.pingMs,
      packetLossPercent: latestPingStats.packetLossPercent,
      pingHost: pingTarget,
      thermalThrottlingDetected: bottleneck.thermalThrottlingDetected,
      bottleneckAnalysis: bottleneck,
      sessionAverages: {
        avgCpuPercent: validCpu.length > 0 ? Number((validCpu.reduce((a, b) => a + b, 0) / validCpu.length).toFixed(1)) : null,
        avgGpuPercent: validGpu.length > 0 ? Number((validGpu.reduce((a, b) => a + b, 0) / validGpu.length).toFixed(1)) : null,
        avgRamPercent: validRam.length > 0 ? Number((validRam.reduce((a, b) => a + b, 0) / validRam.length).toFixed(1)) : null,
        peakCpuTempC: validCpuT.length > 0 ? Math.max(...validCpuT) : null,
        peakGpuTempC: validGpuT.length > 0 ? Math.max(...validGpuT) : null,
        peakVramUsedMB: validVram.length > 0 ? Math.max(...validVram) : null,
      },
    };
  }

  function emitGamingUpdate() {
    const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
    if (win && !win.isDestroyed()) {
      win.webContents.send('gaming:update', buildGamingState());
    }
  }

  function startSession({ pid, processName, pingHost } = {}) {
    stopPresentMon();
    if (pingHost && isValidPingTarget(pingHost)) {
      pingTarget = pingHost.trim();
    }

    const pmPath = detectPresentMonBinary();
    const numPid = Number(pid);
    const safePid = Number.isInteger(numPid) && numPid > 0 && numPid <= 4194304 ? numPid : null;
    activeSession = {
      sessionId: `gs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pid: safePid,
      processName: processName ? String(processName).slice(0, 120) : 'System Gaming Session',
      startedAt: Date.now(),
      frameTimesMs: [],
      totalFramesCaptured: 0,
      allFrameTimesSum: 0,
      droppedFrames: 0,
      lastInputDisplayLatencyMs: null,
      hwSamples: [],
      fpsTelemetryStatus:
        process.platform !== 'win32'
          ? 'unavailable_on_os'
          : pmPath
          ? 'waiting_frames'
          : 'requires_presentmon',
    };

    if (process.platform === 'win32' && pmPath && activeSession.pid) {
      startPresentMonStream(activeSession.pid);
    }

    startPingPolling();
    emitGamingUpdate();
    return buildGamingState();
  }

  async function stopSession() {
    stopPresentMon();
    stopPingPolling();
    if (!activeSession) {
      return { state: buildGamingState(), savedSummary: null };
    }

    const finalState = buildGamingState();
    const summary = {
      sessionId: finalState.sessionId,
      processName: finalState.processName,
      startedAt: finalState.startedAt,
      endedAt: Date.now(),
      durationSeconds: finalState.durationSeconds,
      averageFps: finalState.fps.averageFps,
      low1PercentFps: finalState.fps.low1PercentFps,
      low01PercentFps: finalState.fps.low01PercentFps,
      maxFps: finalState.fps.maxFps,
      avgFrameTimeMs: finalState.fps.avgFrameTimeMs,
      stutterCount: finalState.fps.stutterCount,
      avgCpuPercent: finalState.sessionAverages.avgCpuPercent,
      avgGpuPercent: finalState.sessionAverages.avgGpuPercent,
      avgRamPercent: finalState.sessionAverages.avgRamPercent,
      peakCpuTempC: finalState.sessionAverages.peakCpuTempC,
      peakGpuTempC: finalState.sessionAverages.peakGpuTempC,
      pingMs: finalState.pingMs,
      packetLossPercent: finalState.packetLossPercent,
      bottleneckIds: finalState.bottleneckAnalysis.findings.map((f) => f.id),
      thermalThrottlingDetected: finalState.thermalThrottlingDetected,
    };

    activeSession = null;
    await saveSessionToHistory(summary);
    emitGamingUpdate();
    return { state: buildGamingState(), savedSummary: summary };
  }

  function ingestHardwareSnapshot(snapshot) {
    if (!snapshot) return;
    const gpus = Array.isArray(snapshot.gpus) ? snapshot.gpus : [];
    const primaryGpu =
      gpus.find((g) => {
        const m = String(g?.model || '').toLowerCase();
        const v = String(g?.manufacturer || '').toLowerCase();
        return (
          v.includes('nvidia') ||
          /\brx\s*\d{3,4}/i.test(m) ||
          (v.includes('intel') && /\barc\b.*\b[ab]\d{3}/i.test(m))
        );
      }) ||
      gpus.find((g) => typeof g?.temperatureCelsius === 'number' || typeof g?.utilizationPercent === 'number') ||
      gpus[0] ||
      null;
    const sample = {
      cpuPercent: snapshot.cpu?.usagePercent ?? null,
      coreLoads: Array.isArray(snapshot.cpu?.coreLoads) ? snapshot.cpu.coreLoads : [],
      gpuPercent: primaryGpu?.utilizationPercent ?? null,
      vramUsedMB: primaryGpu?.vramUsedMB ?? null,
      vramTotalMB: primaryGpu?.vramTotalMB ?? null,
      ramPercent: snapshot.ram?.usagePercent ?? null,
      cpuTempC: snapshot.cpu?.temperatureCelsius ?? null,
      gpuTempC: primaryGpu?.temperatureCelsius ?? null,
      cpuClockGhz: snapshot.cpu?.clockSpeedGhz ?? null,
      gpuClockMhz: primaryGpu?.clockSpeedMhz ?? null,
      storageReadBytesPerSec: snapshot.storageTotals?.readBytesPerSec ?? null,
      storageWriteBytesPerSec: snapshot.storageTotals?.writeBytesPerSec ?? null,
      frameTimeMs: activeSession?.frameTimesMs.length > 0
        ? activeSession.frameTimesMs[activeSession.frameTimesMs.length - 1]
        : null,
      stutterEvents: 0,
    };

    if (activeSession) {
      const fpsStats = computeFpsSummary(activeSession.frameTimesMs.slice(-15), activeSession.droppedFrames);
      sample.stutterEvents = fpsStats.stutterCount;
      activeSession.hwSamples.push(sample);
      if (activeSession.hwSamples.length > 180) {
        activeSession.hwSamples.shift();
      }
      emitGamingUpdate();
    }
  }

  function setPingHost(host) {
    if (isValidPingTarget(host)) {
      pingTarget = host.trim();
      if (activeSession) void runPingProbe();
      return { ok: true, pingHost: pingTarget };
    }
    return { ok: false, pingHost: pingTarget };
  }

  function shutdown() {
    stopPresentMon();
    stopPingPolling();
    activeSession = null;
  }

  function registerIpc(ipcMain, isTrustedSender) {
    ipcMain.handle('gaming:list-processes', async (event) => {
      if (!isTrustedSender(event)) return [];
      return listCandidateProcesses();
    });

    ipcMain.handle('gaming:check-presentmon', (event) => {
      if (!isTrustedSender(event)) return { available: false, path: null };
      const bin = detectPresentMonBinary();
      return { available: Boolean(bin), path: bin };
    });

    ipcMain.handle('gaming:get-state', (event) => {
      if (!isTrustedSender(event)) return null;
      return buildGamingState();
    });

    ipcMain.handle('gaming:start-session', (event, opts) => {
      if (!isTrustedSender(event)) return null;
      return startSession(opts || {});
    });

    ipcMain.handle('gaming:stop-session', async (event) => {
      if (!isTrustedSender(event)) return null;
      return stopSession();
    });

    ipcMain.handle('gaming:get-history', async (event) => {
      if (!isTrustedSender(event)) return [];
      return readSessionHistory();
    });

    ipcMain.handle('gaming:clear-history', async (event) => {
      if (!isTrustedSender(event)) return [];
      return clearSessionHistory();
    });

    ipcMain.handle('gaming:set-ping-host', (event, host) => {
      if (!isTrustedSender(event)) return { ok: false, pingHost: pingTarget };
      return setPingHost(host);
    });
  }

  function refreshPresentMonAvailability() {
    cachedPresentMonPath = undefined;
    emitGamingUpdate();
    return buildGamingState();
  }

  return {
    registerIpc,
    startSession,
    stopSession,
    stopPresentMon,
    refreshPresentMonAvailability,
    ingestHardwareSnapshot,
    buildGamingState,
    pauseForHidden,
    resumeFromHidden,
    isActiveSession: () => Boolean(activeSession),
    shutdown,
  };
}

module.exports = {
  createGamingSessionManager,
  parsePresentMonHeader,
  parsePresentMonCsvLine,
  buildPresentMonArgs,
  computeFpsSummary,
  parsePingOutput,
  isValidPingTarget,
};
