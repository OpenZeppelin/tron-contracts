---
---

ci: make the transpiled `-upgradeable` output pass CI. The upgradeable repo runs this repo's `checks.yml` / `formal-verification.yml` (they are part of the transpiled tree), but they had never been adapted to the transpiled, peer-dependency layout. Now: the compile jobs (`tests`, `coverage`, `slither`) check out the `lib/tron-contracts` peer submodule when running in the `-upgradeable` repo; `transpile.sh` Prettier-formats the generated sources so `lint` passes; and the source-only jobs (`tests-upgradeable`, `tests-foundry`, `harnesses`, and the `apply-diff` / `verify` / `halmos` formal-verification jobs) are guarded off in the `-upgradeable` repo via `!endsWith(github.repository, '-upgradeable')`. No change to the non-upgradeable CI.
