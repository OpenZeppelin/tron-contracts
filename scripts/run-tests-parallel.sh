#!/usr/bin/env bash
#
# scripts/run-tests-parallel.sh
#
# Parallel test runner. Detects host capacity, splits test files into N
# balanced buckets by test count, spawns one TRE container per bucket on a
# unique port, runs hardhat-test against each, and aggregates the results.
#
# Worker layout:
#   worker 0 → container tron-tvm-spike-tre-w0 → host port 9090 → TRE_URL=http://127.0.0.1:9090/jsonrpc
#   worker 1 → container tron-tvm-spike-tre-w1 → host port 9091 → TRE_URL=http://127.0.0.1:9091/jsonrpc
#   ...
#
# Each worker's full mocha output streams to /tmp/parallel-w<N>.log AND to
# this script's stdout with a `[w<N>] ` prefix so the user sees live progress
# from every bucket interleaved.
#
# Aggregated summary printed at the end. Exit code is the worst worker's
# (non-zero if any worker failed).
#
# Environment:
#   PARALLEL_MAX_WORKERS=N    cap worker count (default 6)
#   PARALLEL_FORCE_WORKERS=N  override capacity detection
#   SKIP_TEARDOWN=1           leave containers running for inspection
#

set -uo pipefail
cd "$(dirname "$0")/.."

PROJECT_DIR="$(pwd)"
BASE_PORT=9090
CONTAINER_PREFIX="tron-tvm-spike-tre-w"
NETWORK_PREFIX="tron-tvm-spike-net-w"
JAR_HOST_PATH="$PROJECT_DIR/tre/FullNode.jar"

# ----- 1. Detect capacity ------------------------------------------------

echo "→ Detecting host capacity..."
eval "$(node scripts/detect-capacity.js)"
echo "  → spawning $WORKERS worker(s)"

# ----- 2. Bucket the test files ------------------------------------------

echo "→ Bucketing test files (LPT bin-pack by elapsed time, fallback to test count)..."
BUCKETS_TSV=$(node scripts/bucket-files.js "$WORKERS")
if [[ -z "$BUCKETS_TSV" ]]; then
  echo "ERROR: no test files discovered" >&2
  exit 1
fi
# Column 2 is now total weight in ms (real timings preferred, count×300ms
# fallback for files we haven't timed yet). Display as seconds for
# readability; the underlying spread numbers come from bucket-files.js's
# stderr diagnostic.
echo "$BUCKETS_TSV" | awk -F'\t' '{ n=split($3,a," "); printf "  worker %d: %6.1fs weight, %3d files\n", $1, $2/1000, n }'

# ----- 3. Pre-flight: jar present, no stale containers, no port collisions

if [[ ! -f "$JAR_HOST_PATH" ]]; then
  echo "ERROR: patched FullNode.jar not found at $JAR_HOST_PATH" >&2
  echo "Run scripts/build-tre-fork.sh first." >&2
  exit 1
fi

echo "→ Cleaning up any prior tron-tvm-spike containers (serial + workers)..."
# Match BOTH the worker containers (tron-tvm-spike-tre-w<N>) AND the
# legacy serial container (tron-tvm-spike-tre, from docker-compose.tre.yml
# when used standalone for dev / `npm run tre:up`). Without the broader
# match a stale serial container can collide with port 9090, which is
# what worker 0 expects → `docker run` fails with "container name already
# in use" or "port already allocated".
docker ps -a --format '{{.Names}}' \
  | grep -E "^tron-tvm-spike-tre(-w[0-9]+)?$" \
  | xargs -r docker rm -f >/dev/null 2>&1 || true
# Same broadening for networks: the serial compose run creates
# `tron-tvm-spike_default`, plus any worker networks.
docker network ls --format '{{.Name}}' \
  | grep -E "^(tron-tvm-spike_default|${NETWORK_PREFIX}[0-9]+)$" \
  | xargs -r docker network rm >/dev/null 2>&1 || true

for ((i=0; i<WORKERS; i++)); do
  port=$((BASE_PORT + i))
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "ERROR: host port $port is already in use (needed for worker $i)" >&2
    exit 1
  fi
done

# ----- 4. Bring up all containers in parallel ----------------------------

WORKER_PIDS=()
WORKER_LOGS=()
WORKER_EXIT=()

cleanup() {
  local code=$?
  echo ""
  echo "→ Cleaning up workers..."
  if [[ "${SKIP_TEARDOWN:-}" != "1" ]]; then
    # Tear down every container + network in parallel. Sequential
    # `docker rm -f` was ~400-800 ms per worker; at N=4 that's ~3 s
    # of post-test wait charged on every run.
    local pids=()
    for ((i=0; i<WORKERS; i++)); do
      (
        docker rm -f "${CONTAINER_PREFIX}${i}" >/dev/null 2>&1 || true
        docker network rm "${NETWORK_PREFIX}${i}" >/dev/null 2>&1 || true
      ) &
      pids+=("$!")
    done
    for pid in "${pids[@]}"; do wait "$pid" 2>/dev/null || true; done
  fi
  exit $code
}
trap cleanup EXIT INT TERM

echo "→ Starting $WORKERS TRE container(s) in parallel..."
# Background the docker create + run calls so all N workers start
# concurrently. Previously the for-loop blocked on each `docker run
# -d` returning (~300-800 ms each); even though the container itself
# runs in the background AFTER the command returns, the loop pays
# the create-handshake latency serially. Backgrounding fans this out
# so cold-start cost converges to one container's worth.
start_pids=()
for ((i=0; i<WORKERS; i++)); do
  port=$((BASE_PORT + i))
  net="${NETWORK_PREFIX}${i}"
  container="${CONTAINER_PREFIX}${i}"
  (
    docker network create "$net" >/dev/null
    # JVM tuning matches docker-compose.tre.yml. G1GC with a tight
    # 20 ms pause target is REQUIRED here — the snapshot/revert path
    # allocates large LinkedHashMaps and drops them on revert, and a
    # multi-hundred-ms STW pause drops the HTTP keep-alive socket,
    # surfacing as `socket hang up` from axios mid-test. Confirmed
    # empirically: swapping to ParallelGC fails this exact workload.
    # AlwaysPreTouch keeps fault-in latency off the first test, and
    # the cold-start cost (1.5-3s) parallelizes via the `&` fan-out
    # below, so its absolute impact on wall clock is one container's
    # worth. Heap (-Xmx2g) sized to detect-capacity.js per-worker
    # budget (2.4 GiB total, ~400 MiB native overhead).
    docker run -d \
      --name "$container" \
      --network "$net" \
      -p "127.0.0.1:${port}:9090" \
      -e accounts=10 \
      -e defaultBalance=1000000000 \
      -e mnemonic="test test test test test test test test test test test junk" \
      -e hdPath="m/44'/60'/0'/0" \
      -e quiet=true \
      -e JAVA_TOOL_OPTIONS="-XX:+UseG1GC -XX:MaxGCPauseMillis=20 -Xmx2g -Xms512m -XX:+AlwaysPreTouch -XX:+TieredCompilation" \
      -v "${JAR_HOST_PATH}:/tron/FullNode/FullNode.jar:ro" \
      --restart no \
      tronbox/tre:dev >/dev/null
  ) &
  start_pids+=("$!")
done
for pid in "${start_pids[@]}"; do wait "$pid"; done

# ----- 5. Wait for all FullNodes to come up ------------------------------

echo "→ Waiting for FullNodes to come up..."
# Poll all workers' readiness checks IN PARALLEL each round, at a 250 ms
# cadence instead of 1 s. java-tron + the patched jar cold-starts in
# 8-15 s; the prior 1 s round granularity meant the wait overshot by
# up to ~1 s. The parallel curls also matter at N=4-6: serial round was
# N × ~50 ms of curl overhead, which is silly when we can fan them
# out. The readiness signal is still a real JSON-RPC call (TCP-only
# probes return ready while the JVM is still parsing config).
all_ready=0
ready_deadline=$(( $(date +%s) + 60 ))
while (( $(date +%s) < ready_deadline )); do
  ready_pids=()
  for ((i=0; i<WORKERS; i++)); do
    port=$((BASE_PORT + i))
    (
      curl -sS -m 3 -X POST "http://127.0.0.1:${port}/tre" \
        -H 'Content-Type: application/json' \
        -d '{"jsonrpc":"2.0","id":1,"method":"tre_version","params":[]}' 2>/dev/null \
        | grep -q result
    ) &
    ready_pids+=("$!")
  done
  ready=0
  for pid in "${ready_pids[@]}"; do
    if wait "$pid"; then ready=$((ready + 1)); fi
  done
  if [[ $ready -eq $WORKERS ]]; then
    elapsed=$(( $(date +%s) - (ready_deadline - 60) ))
    echo "  → all $WORKERS workers ready after ${elapsed}s"
    all_ready=1
    break
  fi
  sleep 0.25
done
if [[ $all_ready -ne 1 ]]; then
  echo "ERROR: not all workers came up within 60s" >&2
  for ((i=0; i<WORKERS; i++)); do
    echo "--- ${CONTAINER_PREFIX}${i} logs ---"
    docker logs --tail 30 "${CONTAINER_PREFIX}${i}" 2>&1 | sed "s/^/[w${i}] /"
  done
  exit 1
fi

# ----- 5.5. Verify the patched jar is live on every worker ---------------
#
# `tre_version` on the patched fork returns a string with the
# `oz-tron` suffix; on stock tronbox/tre:dev it returns the upstream
# version without it, and the OLDER `-oz-spike` fork lacks the renamed
# cheatcode surface the runtime now calls (tre_setNextBlockTimestamp,
# tre_setAccountBalance, impersonation). Time-warp, snapshot/revert and
# impersonation all require the `-oz-tron` jar, so a stock/old image
# silently degrades to per-test redeploy (snapshot fallback) AND wall-clock
# time-warps (multi-day skips become real-time waits) — hundreds of
# time-dependent / impersonation tests then fail. Build the right jar with
# `scripts/build-tre-fork.sh`. Warn loudly here so an out-of-date mount
# surfaces at run start rather than as a confusing per-test failure.
for ((i=0; i<WORKERS; i++)); do
  port=$((BASE_PORT + i))
  V=$(curl -sS -m 3 -X POST "http://127.0.0.1:${port}/tre" \
    -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"tre_version","params":[]}' 2>/dev/null \
    | python3 -c "import sys,json;print(json.load(sys.stdin).get('result',''))" 2>/dev/null || echo "")
  if [[ "$V" != *"oz-tron"* ]]; then
    echo "  WARN: worker $i tre_version='$V' (no oz-tron suffix) — patched jar may be missing/stale;" >&2
    echo "        time-warp/impersonation tests will fail. Rebuild via scripts/build-tre-fork.sh." >&2
  fi
done

# ----- 5.6. Prime each chain one block past genesis ----------------------
#
# At block 0 java-tron's proto3 JSON omits the zero-valued block number, so the
# first CreateSmartContract deploy throws "Unable to get params: Cannot read
# properties of undefined (reading 'toString')" from TronWeb's
# getCurrentRefBlockParams. hardhat-tron's ensureUp() mines one block via
# primeGenesis() to avoid this — but ONLY when it spawns the container. We
# pre-spawn with `docker run`, so the in-process ensureUp() hits its
# "TRE already reachable (skipping spawn)" early-return and primeGenesis never
# runs. Mine one block per worker here (fanned out like the readiness curls).
echo "→ Priming each chain one block past genesis (tre_mine)..."
prime_pids=()
for ((i=0; i<WORKERS; i++)); do
  port=$((BASE_PORT + i))
  (
    resp=$(curl -sS -m 5 -X POST "http://127.0.0.1:${port}/tre" \
      -H 'Content-Type: application/json' \
      -d '{"jsonrpc":"2.0","id":1,"method":"tre_mine","params":[]}' 2>&1) || true
    case "$resp" in
      *'"error"'*|'') echo "  WARN: worker $i genesis prime (tre_mine) may have failed: $resp" >&2 ;;
    esac
  ) &
  prime_pids+=("$!")
done
for pid in "${prime_pids[@]}"; do wait "$pid" 2>/dev/null || true; done

# ----- 6. Spawn one hardhat-test process per bucket ----------------------

echo "→ Launching test workers..."
. scripts/set-max-old-space-size.sh
mkdir -p /tmp/parallel-runs
mkdir -p .parallel-cache
START_TS=$(date +%s)

# The mocha reporter (configured in hardhat.config.cjs) writes a
# per-file timings JSON when MOCHA_TIMINGS_OUT is set. Each worker
# writes its own file; we merge them after all workers finish
# (step 9.5 → scripts/merge-file-timings.js → .parallel-cache/file-timings.json
# → consumed by scripts/bucket-files.js on the NEXT run).

# Read bucket lines into a bash array — `mapfile` is bash 4+ (macOS still
# ships bash 3.2), so use a portable while-read loop.
BUCKET_LINES=()
while IFS= read -r line; do
  BUCKET_LINES+=("$line")
done <<< "$BUCKETS_TSV"

for ((i=0; i<WORKERS; i++)); do
  port=$((BASE_PORT + i))
  line="${BUCKET_LINES[$i]}"
  # Tab-separated: index, total, files. We want column 3.
  files="$(printf '%s' "$line" | cut -f3)"
  log="/tmp/parallel-runs/worker-${i}.log"
  timings_out=".parallel-cache/file-timings-w${i}.json"
  WORKER_LOGS+=("$log")

  echo "  → worker $i → port $port, $(echo "$files" | wc -w | tr -d ' ') files → $log"

  (
    # shellcheck disable=SC2086
    TRE_URL="http://127.0.0.1:${port}/jsonrpc" \
    MOCHA_TIMINGS_OUT="$timings_out" \
      ./node_modules/.bin/hardhat test --no-compile --network tre $files 2>&1
    rc=$?
    echo "WORKER_EXIT_CODE=$rc"
    # A subshell's exit status is that of its LAST command. Without this
    # explicit re-raise, the trailing `echo` (always 0) masks hardhat's real
    # exit code, so `wait` below captures 0, worst_exit stays 0, and CI reports
    # green even when workers fail. Re-raise hardhat's code.
    exit "$rc"
  ) > "$log" 2>&1 &
  WORKER_PIDS+=($!)
done

# ----- 7. Stream all logs live with [wN] prefix --------------------------

# Tail each log with a per-worker prefix. tail -F handles file creation race.
# Background tails are killed automatically when the script exits via trap.
for ((i=0; i<WORKERS; i++)); do
  ( tail -F -q -n +1 "${WORKER_LOGS[$i]}" 2>/dev/null \
      | awk -v p="[w${i}] " '{print p $0; fflush()}' ) &
done

# ----- 8. Wait for all workers, capture exit codes -----------------------

for ((i=0; i<WORKERS; i++)); do
  wait "${WORKER_PIDS[$i]}"
  WORKER_EXIT+=("$?")
done

# Give the tails a moment to flush the last lines, then kill them.
sleep 1
kill $(jobs -p) 2>/dev/null || true

END_TS=$(date +%s)
ELAPSED=$((END_TS - START_TS))

# ----- 9. Aggregate summary ---------------------------------------------

echo ""
echo "========================================================================"
echo "PARALLEL TEST SUMMARY"
echo "========================================================================"
total_pass=0
total_fail=0
worst_exit=0
for ((i=0; i<WORKERS; i++)); do
  log="${WORKER_LOGS[$i]}"
  # mocha's "X passing" / "X failing" summary lines
  pass=$(grep -oE '[0-9]+ passing' "$log" | tail -1 | awk '{print $1}')
  fail=$(grep -oE '[0-9]+ failing' "$log" | tail -1 | awk '{print $1}')
  pass=${pass:-0}; fail=${fail:-0}
  exit_code=${WORKER_EXIT[$i]}
  if [[ $exit_code -gt $worst_exit ]]; then worst_exit=$exit_code; fi
  total_pass=$((total_pass + pass))
  total_fail=$((total_fail + fail))
  printf "  worker %d: %4d pass, %4d fail, exit=%d (log: %s)\n" \
    "$i" "$pass" "$fail" "$exit_code" "$log"
done

mins=$((ELAPSED / 60))
secs=$((ELAPSED % 60))
echo "  ----------------------------------------------------------------------"
printf "  TOTAL:    %4d pass, %4d fail, wall-clock %dm %02ds\n" \
  "$total_pass" "$total_fail" "$mins" "$secs"
echo "========================================================================"

# ----- 9.5 Merge per-worker timings → bucket weight cache --------------
#
# Each worker wrote .parallel-cache/file-timings-wN.json. Merge them into
# .parallel-cache/file-timings.json (the canonical file bucket-files.js
# reads). Each file lives in exactly one bucket per run, so the merge is
# a plain object-spread — no sum needed.
node scripts/merge-file-timings.js "$WORKERS" 2>&1 || \
  echo "  (timings merge skipped — non-fatal)"

exit $worst_exit
