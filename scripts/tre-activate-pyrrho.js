#!/usr/bin/env node
// Activates the java-tron 4.8.2 "Pyrrho" TVM proposals on a fresh TRE node so the test
// chain mirrors TRON mainnet (where both are already active):
//
//   ALLOW_TVM_PRAGUE (chain parameter 95) - TIP-2935 historical block hashes ({Blockhash})
//   ALLOW_TVM_OSAKA  (chain parameter 96) - TIP-7951 secp256r1 precompile at 0x100 ({P256})
//
// Both default to OFF on a fresh node, and java-tron has no committee-config mapping for
// them (the image's `preapprove`/`committee{}` entries are silently ignored on-chain), so
// the only activation path is a real governance proposal: create it from the genesis
// witness, approve it, then cross the maintenance period that tallies it. Rather than wait
// out a real maintenance interval, warp the block clock past the proposal's expiry with the
// TRE cheatcodes (tre_setNextBlockTimestamp + tre_mine, both over the /tre endpoint, ms),
// which is instant and needs no interval reconfiguration.
//
// Best-effort: {P256-verify} and {Blockhash-blockHash} both fall back gracefully when the
// capability is absent, so this only unlocks the native-path assertions (matching mainnet).
// A node that rejects the proposal (java-tron < 4.8.2) makes this exit non-zero; the test
// runner treats that as a warning and the suites stay green on the fallback paths.
//
// Env: TRE_HTTP - node HTTP base URL (default http://127.0.0.1:9090).
'use strict';

const { SigningKey, getBytes } = require('ethers');

const URL = process.env.TRE_HTTP || 'http://127.0.0.1:9090';
// The TRE genesis witness (fullnode.conf `localwitness`): private key 0x...01.
const WITNESS_PK = '0x0000000000000000000000000000000000000000000000000000000000000001';
const WITNESS = '417e5f4552091a69125d5dfcb7b8c2659029395bdf';
const PARAMS = [
  { key: 95, name: 'getAllowTvmPrague' }, // TIP-2935
  { key: 96, name: 'getAllowTvmOsaka' }, // TIP-7951
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const post = async (path, body) => {
  const res = await fetch(URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${path} returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
};

const rpc = (method, params = []) => post('/tre', { jsonrpc: '2.0', id: 1, method, params });
const mine = () => rpc('tre_mine');
const nextMaintenance = async () => (await post('/wallet/getnextmaintenancetime', {})).num;

const signAndBroadcast = async tx => {
  if (!tx.txID) throw new Error('transaction build failed: ' + JSON.stringify(tx).slice(0, 200));
  const sig = new SigningKey(WITNESS_PK).sign(getBytes('0x' + tx.txID));
  tx.signature = [(sig.r + sig.s.slice(2) + (sig.v === 27 ? '00' : '01')).slice(2)];
  const res = await post('/wallet/broadcasttransaction', tx);
  if (!res.result) throw new Error('broadcast failed: ' + JSON.stringify(res).slice(0, 200));
};

const values = async () => {
  const cp = (await post('/wallet/getchainparameters', {})).chainParameter;
  return PARAMS.map(p => cp.find(x => x.key === p.name)?.value ?? 0);
};
const allActive = v => v.every(x => x === 1);

(async () => {
  if (allActive(await values())) {
    console.log('Pyrrho proposals (ALLOW_TVM_PRAGUE + ALLOW_TVM_OSAKA) already active');
    return;
  }

  const created = await post('/wallet/proposalcreate', {
    owner_address: WITNESS,
    parameters: PARAMS.map(p => ({ key: p.key, value: 1 })),
  });
  if (!created.txID) {
    throw new Error(
      'proposalcreate rejected (java-tron >= 4.8.2 with TIP-7951/TIP-2935 support is required): ' +
        JSON.stringify(created).slice(0, 200),
    );
  }
  await signAndBroadcast(created);
  await mine();
  await sleep(1000); // the proposal must be in a block before it can be approved

  const proposals = (await post('/wallet/listproposals', {})).proposals || [];
  const id = Math.max(...proposals.map(p => p.proposal_id));
  await signAndBroadcast(
    await post('/wallet/proposalapprove', { owner_address: WITNESS, proposal_id: id, is_add_approval: true }),
  );
  await mine();
  await sleep(500);

  // Warp the block clock past the maintenance period(s) that tally the approved proposal.
  for (let round = 0; round < 6; round++) {
    await rpc('tre_setNextBlockTimestamp', [(await nextMaintenance()) + 5000]);
    for (let i = 0; i < 3; i++) await mine();
    if (allActive(await values())) {
      console.log(`Pyrrho proposals activated (proposal ${id})`);
      return;
    }
    await sleep(300);
  }
  throw new Error('timed out waiting for activation; chain parameters = ' + JSON.stringify(await values()));
})().catch(e => {
  console.error(`tre-activate-pyrrho: ${e.message}`);
  process.exit(1);
});
