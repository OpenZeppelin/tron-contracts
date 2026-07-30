#!/usr/bin/env bash
#
# scripts/pin-tre-image.sh
#
# Resolve the TRE image to a fixed digest and retag it locally as
# `tronbox/tre:dev`.
#
# WHY: `tronbox/tre:dev` is a MUTABLE tag. Upstream republished it on
# 2026-07-30 without a JDK, and scripts/build-tre-fork.sh started failing with
# `javac: not found` — the jar patch is compiled inside a throwaway container
# built from that image, using ITS toolchain (OpenJDK 8 + the stock FullNode.jar
# as classpath). Nothing on our side had changed. Pinning also keeps the TRE
# RUNTIME reproducible; the harness has already been bitten by image-dependent
# behaviour (see .changeset/utils-tip26-create2.md on the staticcall OOM).
#
# HOW: pull the pinned digest, then retag it as `tronbox/tre:dev`. Every
# consumer keeps referring to the plain tag and transparently resolves to the
# pin:
#   - docker/build-jar.sh  — fetched from the hardhat-tron repo, where the image
#                            is hardcoded and NOT parameterized, so retagging is
#                            the only way to steer it from here
#   - run-tests-parallel.sh — the per-worker containers
#   - hardhat.config.js     — hardhat-tron's own spawn, via `tre.image`
# None of them passes `--pull always`, so a locally present tag always wins.
#
# Override with TRE_IMAGE=<ref> to run against a different image.
#
set -euo pipefail

# Multi-arch OCI index (linux/amd64 + linux/arm64), verified to ship OpenJDK 8
# including javac. Bump deliberately: re-verify javac is present with
#   docker run --rm --entrypoint sh <ref> -c 'command -v javac'
# and note that the patched jar is built against THIS image's FullNode.jar, so a
# bump also invalidates the cached tre/FullNode.jar.
TRE_IMAGE_PIN="${TRE_IMAGE:-tronbox/tre@sha256:e57deeb0d8201498549dbec28e7c329d8647ef0976b547cfbb6fa6a41a10f491}"

echo "→ Pinning tronbox/tre:dev → ${TRE_IMAGE_PIN}"
docker pull -q "$TRE_IMAGE_PIN" >/dev/null
docker tag "$TRE_IMAGE_PIN" tronbox/tre:dev
