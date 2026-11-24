#!/usr/bin/env node

// This script removes the build artifacts of ignored contracts.

const fs = require('fs');
const path = require('path');
const match = require('micromatch');

function readJSON(path) {
  return JSON.parse(fs.readFileSync(path));
}

const pkgFiles = readJSON('package.json').files;

// Get only negated patterns.
const ignorePatterns = pkgFiles
  .filter(pat => pat.startsWith('!'))
  // Remove the negation part. Makes micromatch usage more intuitive.
  .map(pat => pat.slice(1));

const ignorePatternsSubtrees = ignorePatterns
  // Add **/* to ignore all files contained in the directories.
  .concat(ignorePatterns.map(pat => path.join(pat, '**/*')))
  .map(p => p.replace(/^\//, ''));

const artifactsDir = 'contracts/build/contracts';
const buildinfo = 'artifacts/build-info';
const filenames = fs.readdirSync(buildinfo);

let n = 0;

for (const filename of filenames) {
  const solcOutput = readJSON(path.join(buildinfo, filename)).output;
  for (const sourcePath in solcOutput.contracts) {
    const ignore = match.any(sourcePath, ignorePatternsSubtrees);
    if (ignore) {
      for (const contract in solcOutput.contracts[sourcePath]) {
        // The batched compile produces one build-info per batch, so a shared source can appear in
        // several of them and its artifact may already have been removed by an earlier iteration.
        const artifact = path.join(artifactsDir, contract + '.json');
        if (fs.existsSync(artifact)) {
          fs.unlinkSync(artifact);
          n += 1;
        }
      }
    }
  }
}

console.error(`Removed ${n} mock artifacts`);
