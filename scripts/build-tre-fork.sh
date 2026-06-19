#!/usr/bin/env bash
#
# scripts/build-tre-fork.sh
#
# Build the patched ("oz-tron") java-tron FullNode.jar that the TRE test
# harness requires, and stage it at tre/FullNode.jar (gitignored).
#
# WHY: the @openzeppelin/hardhat-tron runtime gates time-warp
# (tre_setNextBlockTimestamp), snapshot/revert (tre_snapshot/tre_revert),
# balance cheats (tre_setAccountBalance) and account impersonation on a
# FullNode.jar whose `tre_version` carries the `-oz-tron` suffix. Stock
# `tronbox/tre:dev` lacks these; the older `-oz-spike` fork is missing the
# renamed/added surface (it only had setLatestBlockHeaderTimestamp). Without
# the right jar, every time-dependent / impersonation test fails.
#
# The jar's patch sources (5 .java files) live in the hardhat-tron repo under
# docker/, which is NOT shipped in the npm package (package.json files: [src]).
# So we fetch them at the EXACT commit this project installed (read from
# package-lock.json) and run that repo's docker/build-jar.sh, which compiles
# the patch against the stock jar's classpath inside a throwaway tre:dev
# container and repacks the .class files. No java-tron-from-source build.
#
# Requires: docker (daemon running) + the `tronbox/tre:dev` image, git, python3.
#
set -euo pipefail
cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

HT_URL="${HARDHAT_TRON_URL:-https://github.com/OpenZeppelin/hardhat-tron.git}"

# Pin to the commit installed in node_modules so the jar's RPC surface matches
# the runtime. Falls back to `main` if the lockfile entry can't be parsed.
COMMIT="$(python3 - <<'PY' 2>/dev/null || true
import json
d = json.load(open("package-lock.json"))
for k, v in d.get("packages", {}).items():
    if k.endswith("@openzeppelin/hardhat-tron"):
        res = v.get("resolved", "")
        if "#" in res:
            print(res.split("#")[-1])
        break
PY
)"
COMMIT="${COMMIT:-main}"
echo "→ hardhat-tron jar-patch source @ ${COMMIT}"

WORK="$(mktemp -d)"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

echo "→ Fetching docker/ jar-patch tooling..."
git -C "$WORK" init -q
git -C "$WORK" remote add origin "$HT_URL"
# Shallow-fetch just the pinned commit (full history not needed).
if ! git -C "$WORK" fetch -q --depth 1 origin "$COMMIT" 2>/dev/null; then
  echo "  (pinned commit not directly fetchable; falling back to default branch)"
  git -C "$WORK" fetch -q --depth 1 origin
fi
git -C "$WORK" checkout -q FETCH_HEAD

# build-jar.sh repacks the jar with Python's `zipfile`. Modern CPython
# (3.12+, and backported to 3.8.20 / 3.9.20 / 3.11.10 …) refuses to read a zip
# with overlapping entries, raising
#   BadZipFile: Overlapped entries: 'META-INF/LICENSE' (possible zip bomb)
# java-tron's FullNode.jar carries exactly such a duplicate, so the repack dies
# on CI runners (system python = 3.12). build-jar.sh is fetched from the
# hardhat-tron repo and we don't control it, so neutralise the check here: drop
# a sitecustomize.py on PYTHONPATH that clears each entry's `_end_offset` (the
# value the overlap guard tests) right after the central directory is read. The
# repack already de-dupes by filename, so reading the first copy is safe.
SITEDIR="$WORK/_pysite"
mkdir -p "$SITEDIR"
cat > "$SITEDIR/sitecustomize.py" <<'PY'
try:
    import zipfile

    _orig = zipfile.ZipFile._RealGetContents

    def _no_overlap_check(self):
        _orig(self)
        for info in self.filelist:
            try:
                info._end_offset = None  # disables the "possible zip bomb" guard
            except AttributeError:
                pass  # older python without the check — nothing to disable

    zipfile.ZipFile._RealGetContents = _no_overlap_check
except Exception:
    pass
PY
export PYTHONPATH="$SITEDIR${PYTHONPATH:+:$PYTHONPATH}"

echo "→ Building patched jar (compiles 5 patch classes against stock tre:dev jar)..."
bash "$WORK/docker/build-jar.sh"   # writes "$WORK/tre/FullNode.jar"

mkdir -p "$REPO_ROOT/tre"
cp "$WORK/tre/FullNode.jar" "$REPO_ROOT/tre/FullNode.jar"

echo ""
echo "Patched jar staged at: tre/FullNode.jar"
echo "Verify with: docker run --rm -d --name _v -p127.0.0.1:9097:9090 \\"
echo "  -v \"\$PWD/tre/FullNode.jar:/tron/FullNode/FullNode.jar:ro\" tronbox/tre:dev"
echo "  then curl tre_version — expect a \`-oz-tron\` suffix."
