---
'openzeppelin-tron-solidity': patch
---

`tron-contracts-upgradeable`: Fix the generated peer imports to match the published `@openzeppelin/tron-contracts` package layout (no `contracts/` directory segment), so the upgradeable package compiles against the npm release without remappings.
