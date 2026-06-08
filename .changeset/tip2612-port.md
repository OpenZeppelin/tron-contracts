---
'openzeppelin-tron-solidity': major
---

Port ERC-2612 to TIP-2612.

- Rename the `IERC2612` interface alias to `ITIP2612` (file and `interfaces/README.adoc` references). 2612's TRON-side standard is TIP-2612 (https://github.com/tronprotocol/tips/blob/master/tip-2612.md), the analogue of EIP-2612.
- Naming-only port of the leftover numbered alias. The permit implementation (`TRC20Permit`) and its interface (`ITRC20Permit`) were already ported and cite TIP-2612; `ITIP2612` remains a thin alias of `ITRC20Permit`.
