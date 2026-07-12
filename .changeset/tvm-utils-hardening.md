---
'openzeppelin-tron-solidity': patch
---

Harden deterministic deployment, signature, and token utilities, and correct related docs.

- `Create2.deploy` and `Clones.cloneDeterministic` now reject a colliding (already-deployed)
  target address with a cheap code-presence check before invoking `create2`, avoiding the
  near-full energy burn a TVM `create2` collision otherwise incurs. `Create2.deploy` also now
  reverts if `create2` returns an address with no runtime code.
- `TRC7913P256Verifier.verify` now requires the signature to be exactly `0x40` bytes, rejecting
  non-canonical encodings with trailing bytes that previously verified identically.
- `draft-TRC7739`'s nested typed-data verification now rejects a zero `structHash` produced by a
  malformed `contentsDescr`, keeping the verified digest bound to the contents and account domain.
- `WebAuthn`, `SafeTRC20`, and `TIP712` gain documentation clarifying, respectively, that high-`s`
  ES256 assertions must be normalized off-chain, that `SafeTRC20` is not a token-authenticity check
  and `trySafeTransfer` may report `false` for false-on-success tokens, and that long `name`/`version`
  values are unreliable behind proxies/clones.
- `Blockhash` documentation now reflects the opcode-only (256-block) behavior rather than EIP-2935
  extended history, which is not yet active on TRON mainnet (specified for the TVM by TIP-2935).
