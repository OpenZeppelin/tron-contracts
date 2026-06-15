//
// hardhat/tron-artifact-suffix.js
//
// Make the @openzeppelin/hardhat-tron ethers facade resolve the
// transpiler's `Upgradeable` / `UpgradeableWithInit` renames, the same way
// hardhat/env-artifacts.js does for the stock `hre.artifacts.readArtifact`
// path.
//
// WHY a SECOND shim: env-artifacts.js patches `hre.artifacts.readArtifact`,
// which the standard hardhat+ethers deploy path goes through. But hardhat-tron
// REPLACES `hre.ethers` with its own facade whose `deployContract` /
// `getContractFactory` / `getContractAt` resolve artifacts via an INTERNAL
// `loadArtifact()` (a bare-name index over artifacts/contracts +
// artifacts/contracts-exposed) — it never calls `hre.artifacts.readArtifact`.
// So the env-artifacts suffix shim is bypassed on TRE, and the unmodified test
// suite (which deploys e.g. `$TRC20`, `Ownable`, `$EIP712Verifier`) fails with
// "Artifact for contract X not found", because the transpiled artifacts are
// named `$TRC20Upgradeable`, `OwnableUpgradeable`, `$EIP712VerifierUpgradeable`.
//
// This wraps the three facade entry points so a bare contract name is rewritten
// to the first `<name><suffix>` whose artifact actually exists on disk, using
// the SAME suffix precedence as env-artifacts.js. Fully-qualified names
// (`path/to/Foo.sol:Foo`) and names that already resolve are passed through
// untouched.
//
const fs = require('fs');
const path = require('path');
const { extendEnvironment } = require('hardhat/config');

// Matches hardhat/env-artifacts.js. WithInit first (constructor-based deploy
// for non-proxy instances), then the plain Upgradeable rename, then the
// original (peer / stateless wrappers like `$Math` keep their bare name).
const SUFFIXES = ['UpgradeableWithInit', 'Upgradeable', ''];

let nameSet = null;
function availableNames(artifactsDir) {
  if (nameSet) return nameSet;
  nameSet = new Set();
  for (const sub of ['contracts', 'contracts-exposed']) {
    const root = path.join(artifactsDir, sub);
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { recursive: true })) {
      if (typeof entry !== 'string') continue;
      if (!entry.endsWith('.json') || entry.endsWith('.dbg.json')) continue;
      nameSet.add(path.basename(entry, '.json'));
    }
  }
  return nameSet;
}

// Peer-package contracts (e.g. the stateless `ERC7913P256Verifier` imported from
// @openzeppelin/tron-contracts) are compiled under artifacts/<peer-source-path>/
// but the bridge's loadArtifact only does BARE-name lookup in artifacts/contracts
// + artifacts/contracts-exposed — peer contracts are "only addressable via
// fully-qualified name" (ethers-bridge.js _artifactRoots). The unmodified test
// suite deploys some of them by bare name (SignatureChecker.test.js ->
// `ethers.deployContract('ERC7913P256Verifier')`). Index those so we can rewrite
// the bare name to its FQN (`<sourceName>:<Contract>`), which the bridge resolves.
let peerFqn = null;
function peerFqnIndex(artifactsDir) {
  if (peerFqn) return peerFqn;
  peerFqn = new Map();
  if (!fs.existsSync(artifactsDir)) return peerFqn;
  for (const top of fs.readdirSync(artifactsDir)) {
    // Skip the bridge's own search roots and non-source trees.
    if (['contracts', 'contracts-exposed', 'build-info'].includes(top)) continue;
    const root = path.join(artifactsDir, top);
    let stat;
    try {
      stat = fs.statSync(root);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    for (const entry of fs.readdirSync(root, { recursive: true })) {
      if (typeof entry !== 'string') continue;
      if (!entry.endsWith('.json') || entry.endsWith('.dbg.json')) continue;
      const contract = path.basename(entry, '.json');
      const sourceName = path.join(top, path.dirname(entry)); // e.g. @openzeppelin/.../Foo.sol
      const fqn = `${sourceName}:${contract}`;
      // First writer wins; on ambiguity (same bare name in two peer sources) skip
      // so we don't silently pick the wrong one — caller falls back to bare name.
      if (peerFqn.has(contract)) peerFqn.set(contract, null);
      else peerFqn.set(contract, fqn);
    }
  }
  return peerFqn;
}

function resolveName(hre, name) {
  if (typeof name !== 'string' || name.includes(':')) return name; // FQN / non-string
  const dir = hre.config.paths.artifacts;
  const names = availableNames(dir);
  for (const suffix of SUFFIXES) {
    if (names.has(name + suffix)) return name + suffix;
  }
  // Not in the searched roots — try the peer package tree by FQN.
  const fqn = peerFqnIndex(dir).get(name);
  if (fqn) return fqn;
  return name; // let the facade throw its normal not-found error
}

extendEnvironment(hre => {
  // Only relevant when the tron facade is active (it sets these as plain,
  // writable function properties — see ethers-bridge.js extendEnvironment).
  if (!hre.ethers || typeof hre.ethers.deployContract !== 'function') return;

  const wrapFirstArg = orig =>
    function (name, ...rest) {
      return orig.call(this, resolveName(hre, name), ...rest);
    };

  if (typeof hre.ethers.deployContract === 'function') {
    hre.ethers.deployContract = wrapFirstArg(hre.ethers.deployContract);
  }
  if (typeof hre.ethers.getContractFactory === 'function') {
    hre.ethers.getContractFactory = wrapFirstArg(hre.ethers.getContractFactory);
  }
  if (typeof hre.ethers.getContractAt === 'function') {
    hre.ethers.getContractAt = wrapFirstArg(hre.ethers.getContractAt);
  }
});
