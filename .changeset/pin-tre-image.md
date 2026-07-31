---
---

ci: pin the `tronbox/tre:dev` image to a known-good digest. The tag is mutable and was republished without a JDK, so `scripts/build-tre-fork.sh` failed with `javac: not found` — the jar patch is compiled inside a throwaway container built from that image, using its toolchain. `scripts/pin-tre-image.sh` resolves the digest and retags it locally, so the jar build, the parallel test runner's per-worker containers and hardhat-tron's own spawn all use the same image without any of them having to reference the digest directly (`docker/build-jar.sh` is fetched from the hardhat-tron repo and hardcodes the plain tag). Overridable with `TRE_IMAGE=<ref>`.
