// CSP-safe module Web Worker for non-blocking browser CPU micro-benchmark
self.onmessage = (event: MessageEvent<{ type?: string; durationMs?: number }>) => {
  const data = event.data || {};
  if (data.type !== 'start') return;
  const durationMs = typeof data.durationMs === 'number' && data.durationMs > 50 ? Math.min(data.durationMs, 3000) : 800;

  let cancelled = false;
  const start = performance.now();
  const endAt = start + durationMs;
  let ops = 0;
  let x = 1.0001;

  const step = () => {
    if (cancelled) return;
    const chunkEnd = Math.min(endAt, performance.now() + 24);
    while (performance.now() < chunkEnd) {
      for (let i = 0; i < 4000; i++) {
        x = Math.sqrt(x * 1.000003 + 0.123456) * 0.999997;
        if (x > 1e6 || x < 1) x = 1.2345;
      }
      ops += 4000;
    }

    if (performance.now() < endAt) {
      setTimeout(step, 0);
    } else {
      const elapsedMs = Math.max(1, performance.now() - start);
      self.postMessage({
        type: 'done',
        ops,
        elapsedMs,
      });
    }
  };

  // Allow cancel messages to interrupt between chunks
  self.onmessage = (ev: MessageEvent<{ type?: string }>) => {
    if (ev.data?.type === 'cancel') {
      cancelled = true;
      self.postMessage({ type: 'cancelled', ops, elapsedMs: Math.round(performance.now() - start) });
    }
  };

  step();
};
