const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { shouldBehaveLikeTRC721, shouldBehaveLikeTRC721Metadata } = require('./TRC721.behavior');

const name = 'Non Fungible Token';
const symbol = 'NFT';

async function fixture() {
  return {
    accounts: await ethers.getSigners(),
    token: await ethers.deployContract('$TRC721', [name, symbol]),
  };
}

describe('TRC721', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  shouldBehaveLikeTRC721();
  shouldBehaveLikeTRC721Metadata(name, symbol);
});
