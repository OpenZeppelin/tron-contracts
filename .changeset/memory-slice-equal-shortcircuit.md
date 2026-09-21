---
'openzeppelin-tron-solidity': patch
---

`Memory`: Return early from `Slice` equality when the two slices have different lengths, skipping the `keccak256` comparison.
