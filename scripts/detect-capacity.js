#!/usr/bin/env node
//
// scripts/detect-capacity.js
//
// Returns the maximum safe parallel-worker count for `npm run test:parallel`,
// scaled to whatever resources the current machine actually exposes to Docker.
//
// Methodology (per-worker budget calibrated from observed steady-state):
//   - 1 TRE FullNode JVM: ~1.2 CPU, ~2.5 GiB RAM under instamine + viaIR test load
//   - 1 hardhat-test node process: ~0.3 CPU, ~0.5 GiB RAM
//   - Combined per worker: 1.5 CPU, 3.0 GiB RAM
//
// Host reserve (leave headroom for OS / IDE / etc): 1 CPU, 2 GiB RAM.
//
// Output: prints `WORKERS=N` on a single line so callers can `eval $(...)` it,
// plus a JSON detail dump on stderr for debugging.
//
// Configurable overrides (all optional):
//   PARALLEL_MAX_WORKERS   hard ceiling (default 6)
//   PARALLEL_FORCE_WORKERS bypass detection — useful for CI / dev override
//

const os = require('node:os');
const { execSync } = require('node:child_process');

// Per-worker budget — calibrated from observed steady state during the
// OZ test suite. The JVM hits ~2.3 GiB RSS under heavy snapshot/revert
// churn, the hardhat node process adds ~0.3-0.5 GiB. Keeping a 0.1 GiB
// margin per worker so JVM heap spikes don't OOM the container.
//
// To go faster: bump Docker Desktop's memory budget. Capacity scales
// linearly with available RAM until the CPU bound kicks in:
//   *  8 GiB → 2 workers (default Docker Desktop)
//   * 12 GiB → 4 workers
//   * 16 GiB → 6 workers (CPU-bound on most laptops)
// Settings → Resources → Memory in Docker Desktop. No other changes
// needed — `npm run test:parallel` picks up the new budget on next run.
const PER_WORKER_CPU = 1.5;
const PER_WORKER_RAM_GIB = 2.4;
// Reserve for host: docker daemon, vscode, IDE language servers, etc.
const HOST_RESERVE_CPU = 1;
const HOST_RESERVE_RAM_GIB = 1.5;
const DEFAULT_MAX_WORKERS = 6;

function gib(bytes) {
  return bytes / 1024 ** 3;
}

function tryDockerCapacity() {
  try {
    const raw = execSync('docker info --format "{{json .}}"', {
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    const info = JSON.parse(raw);
    const ncpu = Number(info.NCPU);
    const memTotal = Number(info.MemTotal);
    if (Number.isFinite(ncpu) && ncpu > 0 && Number.isFinite(memTotal) && memTotal > 0) {
      return { source: 'docker', cpus: ncpu, ramGiB: gib(memTotal) };
    }
  } catch {
    /* docker info failed; fall through */
  }
  return null;
}

function hostCapacity() {
  return {
    source: 'os',
    cpus: os.cpus().length,
    ramGiB: gib(os.totalmem()),
  };
}

function decide() {
  if (process.env.PARALLEL_FORCE_WORKERS) {
    const n = Math.max(1, parseInt(process.env.PARALLEL_FORCE_WORKERS, 10) || 1);
    return { workers: n, reason: 'PARALLEL_FORCE_WORKERS env override', details: { forced: n } };
  }

  const maxWorkers = Math.max(1, parseInt(process.env.PARALLEL_MAX_WORKERS, 10) || DEFAULT_MAX_WORKERS);

  // Prefer docker's view (it knows what Docker Desktop allocated). Fall
  // back to OS view if docker CLI is unavailable.
  const cap = tryDockerCapacity() ?? hostCapacity();

  const availableCpu = Math.max(0, cap.cpus - HOST_RESERVE_CPU);
  const availableRam = Math.max(0, cap.ramGiB - HOST_RESERVE_RAM_GIB);

  const cpuBound = Math.floor(availableCpu / PER_WORKER_CPU);
  const ramBound = Math.floor(availableRam / PER_WORKER_RAM_GIB);

  const workers = Math.max(1, Math.min(cpuBound, ramBound, maxWorkers));

  return {
    workers,
    reason: cpuBound <= ramBound ? 'cpu-bound' : 'ram-bound',
    details: {
      source: cap.source,
      cpus: cap.cpus,
      ramGiB: Number(cap.ramGiB.toFixed(2)),
      perWorkerCpu: PER_WORKER_CPU,
      perWorkerRamGiB: PER_WORKER_RAM_GIB,
      hostReserveCpu: HOST_RESERVE_CPU,
      hostReserveRamGiB: HOST_RESERVE_RAM_GIB,
      cpuBoundWorkers: cpuBound,
      ramBoundWorkers: ramBound,
      maxWorkers,
    },
  };
}

const decision = decide();
process.stderr.write(`capacity: ${JSON.stringify(decision, null, 2)}\n`);
// Single-line stdout so the bash caller can `eval $(node ...)`
process.stdout.write(`WORKERS=${decision.workers}\n`);
