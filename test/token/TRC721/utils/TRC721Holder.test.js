const { ethers } = require('hardhat');
const { expect } = require('chai');

const name = 'Non Fungible Token';
const symbol = 'NFT';
const tokenId = 1n;

describe('TRC721Holder', function () {
  it('receives an TRC721 token', async function () {
    const [owner] = await ethers.getSigners();

    const token = await ethers.deployContract('$TRC721', [name, symbol]);
    await token.$_mint(owner, tokenId);

    const receiver = await ethers.deployContract('$TRC721Holder');
    await token.connect(owner).safeTransferFrom(owner, receiver, tokenId);

    expect(await token.ownerOf(tokenId)).to.equal(receiver);
  });
});
