---
'openzeppelin-tron-solidity': patch
---

Skip ERC2771Forwarder OOG-bubbling tests on TVM where the contract
defence works but the assertion can't observe it.

The four `bubbles out of gas` cases probe `_checkForwardedGas`'s
`invalid()` reaction to an under-funded forward. The defence itself
is robust on TVM — the chain burns all forwarded energy before
returning — but the existing assertions read `gasUsed` from a
mined-but-failed receipt, which is an EVM-only artefact. TVM rejects
under-provisioned txs at the broadcast layer with `OTHER_ERROR`
(verified via `OZ_TRACE_BROADCAST=1`: `usedEnergy[100000]` reported
in the reject message) rather than mining a failed receipt to read
later. The skips are documented rather than faked; the same defence
is still exercised on EVM-targeted runs.
