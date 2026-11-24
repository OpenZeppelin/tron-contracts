#!/usr/bin/env bash
#
# scripts/pin-tre-image.sh
#
# Resolve the TRE image to a fixed digest and retag it locally as
# `tronbox/tre:dev`.
#
# WHY: `tronbox/tre:dev` is a MUTABLE tag. Pinning a digest keeps the TRE
# runtime reproducible; the harness has been bitten by image-dependent
# behaviour (see .changeset/utils-tip26-create2.md on the staticcall OOM).
#
# HOW: pull the pinned digest, then retag it as `tronbox/tre:dev`. Every
# consumer keeps referring to the plain tag and transparently resolves to the
# pin:
#   - docker/build-jar.sh  — the jar patch build (fetched from the hardhat-tron repo)
#   - run-tests-parallel.sh — the per-worker containers
#   - hardhat.config.js     — hardhat-tron's own spawn, via `tre.image`
# None of them passes `--pull always`, so a locally present tag always wins.
#
# Override with TRE_IMAGE=<ref> to run against a different image.
#
set -euo pipefail

# tronbox/tre 2.0 (java-tron 4.8.2), multi-arch digest. A bump also invalidates
# the cached tre/FullNode.jar built against it.
TRE_IMAGE_PIN="${TRE_IMAGE:-tronbox/tre@sha256:f4332e11df12a9f360639a4546fd046593909630fda48af00b30410c144342f0}"

echo "→ Pinning tronbox/tre:dev → ${TRE_IMAGE_PIN}"
docker pull -q "$TRE_IMAGE_PIN" >/dev/null
docker tag "$TRE_IMAGE_PIN" tronbox/tre:dev
