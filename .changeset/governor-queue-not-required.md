---
'openzeppelin-tron-solidity': minor
---

`Governor`: Revert with `GovernorProposalQueueingNotRequired` when `queue` is called on a proposal that does not require queueing, preventing it from being pushed into a `Queued` state that `execute` would then reject. Replaces the `GovernorQueueNotImplemented` error with `GovernorProposalQueueingNotRequired` and `GovernorProposalQueueingFailed`.
