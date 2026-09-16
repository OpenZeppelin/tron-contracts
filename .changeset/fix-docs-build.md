---
'openzeppelin-tron-solidity': patch
---

Fix the API docs build: run `hardhat docgen` under the stock-solc pipeline (the batched tron-solc corpus exhausts the wasm memory in one pass) and target `@openzeppelin/tron-contracts` in the generated imports and source links.
