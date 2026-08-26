#!/usr/bin/env node
// Activates ALLOW_TVM_OSAKA (chain parameter 96, TIP-7951 secp256r1
// precompile at address(0x100)) on a fresh TRE node.
//
// java-tron has no committee-config mapping for this parameter, so the
// only activation path is a real on-chain proposal: create it from the
// genesis witness, approve it, then produce blocks until the maintenance
// period that tallies it has passed. TRE instamines (a block per
// transaction, no background production), so the block production is
// forced with 1-sun transfers from the witness.
//
// P256.verify falls back to its Solidity implementation when the precompile
// is absent, so activation is best-effort: it lets the tests exercise the
// native path. A node that rejects the proposal (java-tron < 4.8.2) makes
// this script exit non-zero; the test runner treats that as a warning.
//
// Env: TRE_HTTP - node HTTP base URL (default http://127.0.0.1:9090).
'use strict';

const { SigningKey, getBytes } = require('ethers');

const URL = process.env.TRE_HTTP || 'http://127.0.0.1:9090';
// The TRE genesis witness (fullnode.conf `localwitness`): private key 0x...01.
const WITNESS_PK = '0x0000000000000000000000000000000000000000000000000000000000000001';
const WITNESS = '417e5f4552091a69125d5dfcb7b8c2659029395bdf';
const PARAM_KEY = 96; // ALLOW_TVM_OSAKA

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

const signAndBroadcast = async tx => {
  if (!tx.txID) throw new Error('transaction build failed: ' + JSON.stringify(tx).slice(0, 200));
  const sig = new SigningKey(WITNESS_PK).sign(getBytes('0x' + tx.txID));
  tx.signature = [(sig.r + sig.s.slice(2) + (sig.v === 27 ? '00' : '01')).slice(2)];
  const res = await post('/wallet/broadcasttransaction', tx);
  if (!res.result) throw new Error('broadcast failed: ' + JSON.stringify(res).slice(0, 200));
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const paramValue = async () =>
  (await post('/wallet/getchainparameters', {})).chainParameter.find(p => p.key === 'getAllowTvmOsaka')?.value ?? 0;

// Instamine one block (1-sun transfer from the witness to the burn address).
const kickBlock = () =>
  post('/wallet/createtransaction', {
    owner_address: WITNESS,
    to_address: '410000000000000000000000000000000000000001',
    amount: 1,
  }).then(signAndBroadcast);

(async () => {
  if ((await paramValue()) === 1) {
    console.log('ALLOW_TVM_OSAKA already active');
    return;
  }

  const created = await post('/wallet/proposalcreate', {
    owner_address: WITNESS,
    parameters: [{ key: PARAM_KEY, value: 1 }],
  });
  if (!created.txID) {
    throw new Error(
      'proposalcreate rejected (java-tron >= 4.8.2 with TIP-7951 support is required): ' +
        JSON.stringify(created).slice(0, 200),
    );
  }
  await signAndBroadcast(created);
  await sleep(3000); // the proposal must be in a block before it can be approved

  const proposals = (await post('/wallet/listproposals', {})).proposals || [];
  const id = Math.max(...proposals.map(p => p.proposal_id));
  await signAndBroadcast(
    await post('/wallet/proposalapprove', { owner_address: WITNESS, proposal_id: id, is_add_approval: true }),
  );

  // Produce blocks until the maintenance period tallies the proposal.
  // With the fast-proposal conf (30 s intervals) this takes <= ~70 s.
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    await kickBlock();
    if ((await paramValue()) === 1) {
      console.log(`ALLOW_TVM_OSAKA activated (proposal ${id})`);
      return;
    }
    await sleep(2000);
  }
  throw new Error('timed out waiting for ALLOW_TVM_OSAKA activation');
})().catch(e => {
  console.error(`tre-activate-osaka: ${e.message}`);
  process.exit(1);
});
