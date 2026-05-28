const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { getAddressInSlot, ImplementationSlot } = require('../../helpers/storage');

async function fixture() {
  const [admin, other] = await ethers.getSigners();

  const v1 = await ethers.deployContract('DummyImplementation');
  const v2 = await ethers.deployContract('DummyImplementationV2');

  // Capture the deployment tx so we can extract the inner ProxyAdmin's
  // address from its internal_transactions below. On EVM,
  // `ethers.getCreateAddress({from: proxy.target, nonce: 1n})` works
  // because EVM derives CREATE addresses from `(sender, nonce)`. TVM
  // uses `sha3(txHash || sender)` instead, so the inner ProxyAdmin
  // address can't be predicted from the proxy's address + nonce — it
  // depends on the TVM tx hash of the TransparentUpgradeableProxy
  // deploy. The deploy itself records the inner CREATE in the
  // receipt's internal_transactions; that's the source of truth.
  const proxyDeployTx = ethers.deployContract('TransparentUpgradeableProxy', [
    v1,
    admin,
    v1.interface.encodeFunctionData('initializeNonPayable'),
  ]);
  const proxyContract = await proxyDeployTx;
  const proxy = await ethers.getContractAt('ITransparentUpgradeableProxy', proxyContract);

  // Pull the inner ProxyAdmin address from the deployment receipt. The
  // TransparentUpgradeableProxy constructor synchronously deploys a
  // ProxyAdmin via CREATE; that inner CREATE is the first (and only)
  // entry in internal_transactions. transferTo_address is TVM-format
  // hex (21 bytes, `41` prefix + 20-byte body).
  const deployReceipt = await proxyContract.deploymentTransaction().wait();
  const innerCreate = (deployReceipt.internalTransactions || []).find(
    itx => !itx.rejected && /63726561/.test(itx.note || ''), // "crea" in hex
  );
  if (!innerCreate || !innerCreate.transferTo_address) {
    throw new Error('ProxyAdmin fixture: inner CREATE for ProxyAdmin not found in proxy deploy receipt');
  }
  const proxyAdmin = await ethers.getContractAt(
    'ProxyAdmin',
    '0x' + innerCreate.transferTo_address.slice(2),
  );

  return { admin, other, v1, v2, proxy, proxyAdmin };
}

describe('ProxyAdmin', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  it('has an owner', async function () {
    expect(await this.proxyAdmin.owner()).to.equal(this.admin);
  });

  it('has an interface version', async function () {
    expect(await this.proxyAdmin.UPGRADE_INTERFACE_VERSION()).to.equal('5.0.0');
  });

  describe('without data', function () {
    describe('with unauthorized account', function () {
      it('fails to upgrade', async function () {
        await expect(this.proxyAdmin.connect(this.other).upgradeAndCall(this.proxy, this.v2, '0x'))
          .to.be.revertedWithCustomError(this.proxyAdmin, 'OwnableUnauthorizedAccount')
          .withArgs(this.other);
      });
    });

    describe('with authorized account', function () {
      it('upgrades implementation', async function () {
        await this.proxyAdmin.connect(this.admin).upgradeAndCall(this.proxy, this.v2, '0x');
        expect(await getAddressInSlot(this.proxy, ImplementationSlot)).to.equal(this.v2);
      });
    });
  });

  describe('with data', function () {
    describe('with unauthorized account', function () {
      it('fails to upgrade', async function () {
        const data = this.v1.interface.encodeFunctionData('initializeNonPayableWithValue', [1337n]);
        await expect(this.proxyAdmin.connect(this.other).upgradeAndCall(this.proxy, this.v2, data))
          .to.be.revertedWithCustomError(this.proxyAdmin, 'OwnableUnauthorizedAccount')
          .withArgs(this.other);
      });
    });

    describe('with authorized account', function () {
      describe('with invalid callData', function () {
        it('fails to upgrade', async function () {
          const data = '0x12345678';
          await expect(this.proxyAdmin.connect(this.admin).upgradeAndCall(this.proxy, this.v2, data)).to.be.reverted;
        });
      });

      describe('with valid callData', function () {
        it('upgrades implementation', async function () {
          const data = this.v2.interface.encodeFunctionData('initializeNonPayableWithValue', [1337n]);
          await this.proxyAdmin.connect(this.admin).upgradeAndCall(this.proxy, this.v2, data);
          expect(await getAddressInSlot(this.proxy, ImplementationSlot)).to.equal(this.v2);
        });
      });
    });
  });
});
