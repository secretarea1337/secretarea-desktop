const os = require('os');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const net = require('net');
const { Worker } = require('worker_threads');

const MAX_SAFE_CPU_TEMP_C = 92;
const MAX_SAFE_GPU_TEMP_C = 88;

const CPU_WORKER_CODE = `
const { parentPort, workerData } = require('worker_threads');
const end = Date.now() + workerData.durationMs;
let ops = 0;
let x = 1.0001;
while (Date.now() < end) {
  for (let i = 0; i < 4000; i++) {
    x = Math.sqrt(x * 1.000003 + 0.123456) * 0.999997;
    if (x > 1e6 || x < 1) x = 1.2345;
  }
  ops += 4000;
}
parentPort.postMessage(ops);
`;

function createBenchmarkRunner({
  getMainWindow,
  getLatestSnapshot,
  getFreshSnapshot,
  maxCpuTempC = MAX_SAFE_CPU_TEMP_C,
  maxGpuTempC = MAX_SAFE_GPU_TEMP_C,
  testTimeoutMs = 15000,
}) {
  let isCancelled = false;
  let activeRun = false;
  const activeWorkers = new Set();
  const activeIntervals = new Set();
  const activeSockets = new Set();
  let lastRefreshedSnap = null;
  let lastRefreshAttemptAt = 0;

  function emitProgress(progress) {
    const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
    if (win && !win.isDestroyed()) {
      win.webContents.send('hardware:benchmark-progress', progress);
    }
  }

  function terminateAllActiveWorkers() {
    for (const iv of Array.from(activeIntervals)) {
      clearInterval(iv);
      activeIntervals.delete(iv);
    }
    for (const sock of Array.from(activeSockets)) {
      try {
        sock.destroy();
      } catch {
        // ignore socket destroy error
      }
      activeSockets.delete(sock);
    }
    for (const w of Array.from(activeWorkers)) {
      try {
        void w.terminate().catch(() => {});
      } catch {
        // ignore termination error
      }
      activeWorkers.delete(w);
    }
  }

  async function refreshThermalSnapshotIfStale() {
    if (typeof getFreshSnapshot !== 'function') return;
    const latest = typeof getLatestSnapshot === 'function' ? getLatestSnapshot() : null;
    const now = Date.now();
    if (latest && typeof latest.timestamp === 'number' && now - latest.timestamp < 1500) {
      return;
    }
    if (now - lastRefreshAttemptAt < 750) return;
    lastRefreshAttemptAt = now;
    try {
      const fresh = await getFreshSnapshot();
      if (fresh) {
        lastRefreshedSnap = fresh;
      }
    } catch {
      // keep existing thermal reading safely
    }
  }

  function checkThermalSafety() {
    const latest = typeof getLatestSnapshot === 'function' ? getLatestSnapshot() : null;
    const snap =
      latest && (!lastRefreshedSnap || (latest.timestamp || 0) >= (lastRefreshedSnap.timestamp || 0))
        ? latest
        : lastRefreshedSnap;
    const cpuT = snap?.cpu?.temperatureCelsius ?? null;
    const gpuTemps = Array.isArray(snap?.gpus)
      ? snap.gpus
          .map((g) => g?.temperatureCelsius)
          .filter((v) => typeof v === 'number' && Number.isFinite(v))
      : [];
    const gpuT = gpuTemps.length > 0 ? Math.max(...gpuTemps) : null;
    const currentTemp = Math.max(cpuT || 0, gpuT || 0) || null;
    if (typeof cpuT === 'number' && cpuT >= maxCpuTempC) {
      return {
        safe: false,
        reason: `Auto-aborted safely: CPU temperature reached ${cpuT}°C (limit ${maxCpuTempC}°C).`,
        temp: cpuT,
      };
    }
    if (typeof gpuT === 'number' && gpuT >= maxGpuTempC) {
      return {
        safe: false,
        reason: `Auto-aborted safely: GPU temperature reached ${gpuT}°C (limit ${maxGpuTempC}°C).`,
        temp: gpuT,
      };
    }
    return { safe: true, reason: null, temp: currentTemp };
  }

  async function runCpuSingle() {
    const start = Date.now();
    const durationTarget = 1200;
    let ops = 0;
    let peakTemp = null;
    let x = 1.0001;

    while (Date.now() - start < durationTarget) {
      if (isCancelled) return { cancelled: true, durationMs: Date.now() - start };
      if (Date.now() - start >= testTimeoutMs) {
        return {
          value: null,
          durationMs: Date.now() - start,
          peakTempC: peakTemp,
          abortedForSafety: true,
          note: `Benchmark timed out after ${testTimeoutMs} ms watchdog limit.`,
        };
      }
      const safety = checkThermalSafety();
      if (safety.temp !== null) peakTemp = Math.max(peakTemp || 0, safety.temp);
      if (!safety.safe) {
        return {
          value: null,
          durationMs: Date.now() - start,
          peakTempC: peakTemp,
          abortedForSafety: true,
          note: safety.reason,
        };
      }

      const sliceEnd = Date.now() + 50;
      while (Date.now() < sliceEnd) {
        if (isCancelled) return { cancelled: true, durationMs: Date.now() - start };
        for (let i = 0; i < 4000; i++) {
          x = Math.sqrt(x * 1.000003 + 0.123456) * 0.999997;
          if (x > 1e6 || x < 1) x = 1.2345;
        }
        ops += 4000;
      }
      await new Promise((r) => setTimeout(r, 10));
    }

    const elapsedSec = Math.max(0.1, (Date.now() - start) / 1000);
    const score = Number(((ops / elapsedSec) / 1e6).toFixed(2));
    return {
      value: score,
      durationMs: Date.now() - start,
      peakTempC: peakTemp,
      abortedForSafety: false,
      note: 'Deterministic floating-point single-thread throughput (M-ops/sec).',
    };
  }

  async function runCpuMulti() {
    const start = Date.now();
    const threadCount = Math.max(1, Math.min(os.cpus()?.length || 4, 16));
    let peakTemp = null;
    let abortedReason = null;
    let timedOut = false;

    const initialSafety = checkThermalSafety();
    if (initialSafety.temp !== null) peakTemp = initialSafety.temp;
    if (!initialSafety.safe) {
      return {
        value: null,
        durationMs: Date.now() - start,
        peakTempC: peakTemp,
        abortedForSafety: true,
        note: initialSafety.reason,
      };
    }

    const monitorInterval = setInterval(() => {
      if (isCancelled) {
        terminateAllActiveWorkers();
        return;
      }
      if (Date.now() - start >= testTimeoutMs) {
        timedOut = true;
        abortedReason = `CPU multi-thread benchmark timed out after ${testTimeoutMs} ms watchdog limit.`;
        terminateAllActiveWorkers();
        return;
      }
      void refreshThermalSnapshotIfStale();
      const s = checkThermalSafety();
      if (s.temp !== null) peakTemp = Math.max(peakTemp || 0, s.temp);
      if (!s.safe) {
        abortedReason = s.reason;
        terminateAllActiveWorkers();
      }
    }, 150);
    activeIntervals.add(monitorInterval);

    try {
      const workerPromises = Array.from({ length: threadCount }, () =>
        new Promise((resolve) => {
          if (isCancelled || abortedReason) {
            resolve(0);
            return;
          }
          const w = new Worker(CPU_WORKER_CODE, { eval: true, workerData: { durationMs: 1100 } });
          activeWorkers.add(w);
          let settled = false;
          const finish = (opsVal) => {
            if (settled) return;
            settled = true;
            activeWorkers.delete(w);
            clearTimeout(safetyTimer);
            resolve(opsVal);
          };
          const safetyTimer = setTimeout(() => {
            timedOut = true;
            void w.terminate().catch(() => {});
            finish(0);
          }, Math.min(Math.max(4000, testTimeoutMs), 20000));
          w.on('message', (ops) => {
            finish(Number(ops) || 0);
          });
          w.on('error', () => {
            finish(0);
          });
          w.on('exit', () => {
            finish(0);
          });
        })
      );

      const results = await Promise.all(workerPromises);
      if (isCancelled) {
        return { cancelled: true, durationMs: Date.now() - start };
      }
      const safetyAfter = checkThermalSafety();
      if (safetyAfter.temp !== null) peakTemp = Math.max(peakTemp || 0, safetyAfter.temp);
      if (abortedReason || timedOut || !safetyAfter.safe) {
        return {
          value: null,
          durationMs: Date.now() - start,
          peakTempC: peakTemp,
          abortedForSafety: true,
          note: abortedReason || safetyAfter.reason || 'CPU multi-thread benchmark exceeded watchdog timeout.',
        };
      }

      const totalOps = results.reduce((a, b) => a + b, 0);
      const elapsedSec = Math.max(0.1, (Date.now() - start) / 1000);
      return {
        value: Number(((totalOps / elapsedSec) / 1e6).toFixed(2)),
        durationMs: Date.now() - start,
        peakTempC: peakTemp,
        abortedForSafety: false,
        note: `Multi-thread compute across ${threadCount} worker threads (M-ops/sec).`,
      };
    } finally {
      clearInterval(monitorInterval);
      activeIntervals.delete(monitorInterval);
      terminateAllActiveWorkers();
    }
  }

  async function runRamThroughput() {
    const start = Date.now();
    const blockBytes = 32 * 1024 * 1024;
    let src = Buffer.allocUnsafe(blockBytes);
    let dst = Buffer.allocUnsafe(blockBytes);
    let peakTemp = null;
    try {
      src.fill(0x5a);
      let iterations = 0;

      const copyStart = process.hrtime.bigint();
      for (let i = 0; i < 48; i++) {
        if (isCancelled) return { cancelled: true, durationMs: Date.now() - start };
        if (Date.now() - start >= testTimeoutMs) {
          return {
            value: null,
            durationMs: Date.now() - start,
            peakTempC: peakTemp,
            abortedForSafety: true,
            note: `RAM throughput benchmark timed out after ${testTimeoutMs} ms watchdog limit.`,
          };
        }
        const safety = checkThermalSafety();
        if (safety.temp !== null) peakTemp = Math.max(peakTemp || 0, safety.temp);
        if (!safety.safe) {
          return {
            value: null,
            durationMs: Date.now() - start,
            peakTempC: peakTemp,
            abortedForSafety: true,
            note: safety.reason,
          };
        }

        src.copy(dst);
        iterations++;
        if (i % 4 === 0) {
          await new Promise((r) => setImmediate(r));
        }
      }
      const elapsedNs = Number(process.hrtime.bigint() - copyStart);
      const elapsedSec = Math.max(0.001, elapsedNs / 1e9);
      const totalMb = (iterations * blockBytes) / (1024 * 1024);

      return {
        value: Math.round(totalMb / elapsedSec),
        durationMs: Date.now() - start,
        peakTempC: peakTemp,
        abortedForSafety: false,
        note: '32 MB Buffer sequential memory copy bandwidth inside main Node heap/off-heap.',
      };
    } finally {
      src = null;
      dst = null;
    }
  }

  async function runStorageTempBench(mode) {
    const start = Date.now();
    const tempFile = path.join(os.tmpdir(), `secretarea-bench-${crypto.randomUUID()}.tmp`);
    let peakTemp = null;

    const checkStorageStepSafety = () => {
      if (isCancelled) return { stop: true, result: { cancelled: true, durationMs: Date.now() - start } };
      if (Date.now() - start >= testTimeoutMs) {
        return {
          stop: true,
          result: {
            value: null,
            durationMs: Date.now() - start,
            peakTempC: peakTemp,
            abortedForSafety: true,
            note: `Storage benchmark timed out after ${testTimeoutMs} ms watchdog limit.`,
          },
        };
      }
      const safety = checkThermalSafety();
      if (safety.temp !== null) peakTemp = Math.max(peakTemp || 0, safety.temp);
      if (!safety.safe) {
        return {
          stop: true,
          result: {
            value: null,
            durationMs: Date.now() - start,
            peakTempC: peakTemp,
            abortedForSafety: true,
            note: safety.reason,
          },
        };
      }
      return { stop: false };
    };

    try {
      const sizeBytes = 48 * 1024 * 1024;
      const chunk = crypto.randomBytes(1024 * 1024);
      const fh = await fsp.open(tempFile, 'w+');
      try {
        if (mode === 'seq') {
          const wStart = process.hrtime.bigint();
          for (let i = 0; i < 48; i++) {
            const check = checkStorageStepSafety();
            if (check.stop) return check.result;
            await fh.write(chunk, 0, chunk.length, i * chunk.length);
          }
          const preSync = checkStorageStepSafety();
          if (preSync.stop) return preSync.result;
          await fh.sync();
          const readBuf = Buffer.allocUnsafe(1024 * 1024);
          for (let i = 0; i < 48; i++) {
            const check = checkStorageStepSafety();
            if (check.stop) return check.result;
            await fh.read(readBuf, 0, readBuf.length, i * readBuf.length);
          }
          const sec = Math.max(0.001, Number(process.hrtime.bigint() - wStart) / 1e9);
          const mbPerSec = Math.round(((sizeBytes * 2) / (1024 * 1024)) / sec);
          return {
            value: mbPerSec,
            durationMs: Date.now() - start,
            peakTempC: peakTemp,
            abortedForSafety: false,
            note: 'Safe 48 MB temporary file write+sync+read throughput in OS temp folder (immediately deleted). Note: OS filesystem cache may influence small burst speeds.',
          };
        } else {
          // Seed 16 MB temp file with cancellation & thermal checks on every MB
          for (let i = 0; i < 16; i++) {
            const check = checkStorageStepSafety();
            if (check.stop) return check.result;
            await fh.write(chunk, 0, chunk.length, i * chunk.length);
          }
          const preSync = checkStorageStepSafety();
          if (preSync.stop) return preSync.result;
          await fh.sync();
          const buf4k = Buffer.allocUnsafe(4096);
          const ops = 600;
          const rStart = process.hrtime.bigint();
          for (let i = 0; i < ops; i++) {
            if (i % 16 === 0) {
              const check = checkStorageStepSafety();
              if (check.stop) return check.result;
            } else if (isCancelled) {
              return { cancelled: true, durationMs: Date.now() - start };
            }
            const off = Math.floor(Math.random() * ((16 * 1024 * 1024) - 4096));
            await fh.read(buf4k, 0, 4096, off);
          }
          const sec = Math.max(0.001, Number(process.hrtime.bigint() - rStart) / 1e9);
          const mbPerSec = Number((((ops * 4096) / (1024 * 1024)) / sec).toFixed(1));
          return {
            value: mbPerSec,
            durationMs: Date.now() - start,
            peakTempC: peakTemp,
            abortedForSafety: false,
            note: 'Non-destructive 4 KB random read micro-test in OS temp folder (immediately deleted).',
          };
        }
      } finally {
        await fh.close().catch(() => {});
      }
    } finally {
      await fsp.unlink(tempFile).catch(() => {});
    }
  }

  async function runNetworkLatency() {
    const start = Date.now();
    const samples = [];
    for (let i = 0; i < 4; i++) {
      if (isCancelled) return { cancelled: true, durationMs: Date.now() - start };
      if (Date.now() - start >= testTimeoutMs) {
        return {
          value: null,
          durationMs: Date.now() - start,
          peakTempC: null,
          abortedForSafety: true,
          note: `Network probe timed out after ${testTimeoutMs} ms watchdog limit.`,
        };
      }
      const ms = await new Promise((resolve) => {
        if (isCancelled) {
          resolve(null);
          return;
        }
        const t0 = process.hrtime.bigint();
        let settled = false;
        const sock = net.createConnection({ host: '1.1.1.1', port: 443, timeout: 2500 }, () => {
          if (settled) return;
          settled = true;
          const dt = Number(process.hrtime.bigint() - t0) / 1e6;
          activeSockets.delete(sock);
          sock.destroy();
          resolve(dt);
        });
        activeSockets.add(sock);
        const fail = () => {
          if (settled) return;
          settled = true;
          activeSockets.delete(sock);
          sock.destroy();
          resolve(null);
        };
        sock.on('timeout', fail);
        sock.on('error', fail);
        sock.on('close', fail);
      });
      if (isCancelled) return { cancelled: true, durationMs: Date.now() - start };
      if (ms !== null) samples.push(ms);
    }
    if (samples.length === 0) {
      return {
        value: null,
        durationMs: Date.now() - start,
        peakTempC: null,
        abortedForSafety: false,
        note: 'Unable to reach 1.1.1.1:443 (offline or firewall blocked).',
      };
    }
    const avgMs = Number((samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(1));
    return {
      value: avgMs,
      durationMs: Date.now() - start,
      peakTempC: null,
      abortedForSafety: false,
      note: `Average TCP handshake latency across ${samples.length} probes to 1.1.1.1:443.`,
    };
  }

  async function runBenchmark(testIds) {
    if (activeRun) {
      return { ok: false, error: 'A benchmark is already running.', results: [] };
    }
    activeRun = true;
    isCancelled = false;
    const requested = Array.isArray(testIds) && testIds.length > 0
      ? testIds
      : ['cpu_single', 'cpu_multi', 'ram_throughput', 'storage_seq', 'storage_4k', 'network_latency'];

    const labelMap = {
      cpu_single: 'CPU Single-Thread Compute',
      cpu_multi: 'CPU Multi-Thread Compute',
      ram_throughput: 'Memory Bandwidth Copy',
      storage_seq: 'Storage Sequential Temp I/O',
      storage_4k: 'Storage 4K Random Read',
      network_latency: 'Network TCP Latency',
    };
    const unitMap = {
      cpu_single: 'M-ops/s',
      cpu_multi: 'M-ops/s',
      ram_throughput: 'MB/s',
      storage_seq: 'MB/s',
      storage_4k: 'MB/s',
      network_latency: 'ms',
    };

    const results = [];
    try {
      for (let i = 0; i < requested.length; i++) {
        const id = requested[i];
        if (isCancelled) break;
        await refreshThermalSnapshotIfStale();
        const safetyPre = checkThermalSafety();
        if (!safetyPre.safe) {
          emitProgress({
            running: false,
            activeTestId: null,
            progressPercent: Math.round((i / requested.length) * 100),
            statusMessage: safetyPre.reason,
            currentTempC: safetyPre.temp,
            abortedReason: safetyPre.reason,
          });
          return { ok: true, abortedForSafety: true, cancelled: false, results };
        }
        emitProgress({
          running: true,
          activeTestId: id,
          progressPercent: Math.round((i / requested.length) * 100),
          statusMessage: `Running ${labelMap[id] || id}...`,
          currentTempC: safetyPre.temp,
          abortedReason: null,
        });

        let outcome;
        if (id === 'cpu_single') outcome = await runCpuSingle();
        else if (id === 'cpu_multi') outcome = await runCpuMulti();
        else if (id === 'ram_throughput') outcome = await runRamThroughput();
        else if (id === 'storage_seq') outcome = await runStorageTempBench('seq');
        else if (id === 'storage_4k') outcome = await runStorageTempBench('4k');
        else if (id === 'network_latency') outcome = await runNetworkLatency();
        else continue;

        if (outcome.cancelled) break;
        results.push({
          id,
          label: labelMap[id] || id,
          value: outcome.value,
          unit: unitMap[id] || '',
          durationMs: outcome.durationMs,
          peakTempC: outcome.peakTempC,
          abortedForSafety: Boolean(outcome.abortedForSafety),
          note: outcome.note,
          completedAt: Date.now(),
        });

        if (outcome.abortedForSafety) {
          emitProgress({
            running: false,
            activeTestId: null,
            progressPercent: Math.round(((i + 1) / requested.length) * 100),
            statusMessage: outcome.note,
            currentTempC: outcome.peakTempC,
            abortedReason: outcome.note,
          });
          return { ok: true, abortedForSafety: true, cancelled: false, results };
        }
      }

      emitProgress({
        running: false,
        activeTestId: null,
        progressPercent: 100,
        statusMessage: isCancelled ? 'Benchmark cancelled by user.' : 'Selected safe benchmarks completed.',
        currentTempC: checkThermalSafety().temp,
        abortedReason: null,
      });
      return { ok: true, abortedForSafety: false, cancelled: isCancelled, results };
    } finally {
      terminateAllActiveWorkers();
      activeRun = false;
    }
  }

  function cancel() {
    isCancelled = true;
    terminateAllActiveWorkers();
    return { ok: true };
  }

  return {
    runBenchmark,
    cancel,
  };
}

module.exports = {
  createBenchmarkRunner,
  MAX_SAFE_CPU_TEMP_C,
  MAX_SAFE_GPU_TEMP_C,
};
