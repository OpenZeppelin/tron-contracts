---
'openzeppelin-tron-solidity': major
---

[BREAKING] `TRC20FlashMint`: Expect the flash-loan callback to return `keccak256("TRC3156FlashBorrower.onFlashLoan")`, the value TIP-3156 mandates, instead of the Ethereum preimage carried over from upstream. Borrowers returning the previous value are now rejected with `TRC3156InvalidReceiver`.
