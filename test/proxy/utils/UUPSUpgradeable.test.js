const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { getAddressInSlot, ImplementationSlot } = require('../../helpers/storage');

async function fixture() {
  const implInitial = await ethers.deployContract('UUPSUpgradeableMock');
  const implUpgradeOk = await ethers.deployContract('UUPSUpgradeableMock');
  const implUpgradeUnsafe = await ethers.deployContract('UUPSUpgradeableUnsafeMock');
  const implUpgradeNonUUPS = await ethers.deployContract('NonUpgradeableMock');
  const implUnsupportedUUID = await ethers.deployContract('UUPSUnsupportedProxiableUUIDMock');
  // Used for testing non ERC1967 compliant proxies (clones are proxies that don't use the ERC1967 implementation slot)
  const cloneFactory = await ethers.deployContract('$Clones');

  const instance = await ethers
    .deployContract('ERC1967ProxyUnsafe', [implInitial, '0x'])
    .then(proxy => implInitial.attach(proxy.target));

  return {
    implInitial,
    implUpgradeOk,
    implUpgradeUnsafe,
    implUpgradeNonUUPS,
    implUnsupportedUUID,
    cloneFactory,
    instance,
  };
}

describe('UUPSUpgradeable', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  it('has an interface version', async function () {
    expect(await this.instance.UPGRADE_INTERFACE_VERSION()).to.equal('5.0.0');
  });

  it('upgrade to upgradeable implementation', async function () {
    await expect(this.instance.upgradeToAndCall(this.implUpgradeOk, '0x'))
      .to.emit(this.instance, 'Upgraded')
      .withArgs(this.implUpgradeOk);

    expect(await getAddressInSlot(this.instance, ImplementationSlot)).to.equal(this.implUpgradeOk);
  });

  it('upgrade to upgradeable implementation with call', async function () {
    expect(await this.instance.current()).to.equal(0n);

    await expect(
      this.instance.upgradeToAndCall(this.implUpgradeOk, this.implUpgradeOk.interface.encodeFunctionData('increment')),
    )
      .to.emit(this.instance, 'Upgraded')
      .withArgs(this.implUpgradeOk);

    expect(await getAddressInSlot(this.instance, ImplementationSlot)).to.equal(this.implUpgradeOk);

    expect(await this.instance.current()).to.equal(1n);
  });

  it('calling upgradeTo on the implementation reverts', async function () {
    await expect(this.implInitial.upgradeToAndCall(this.implUpgradeOk, '0x')).to.be.revertedWithCustomError(
      this.implInitial,
      'UUPSUnauthorizedCallContext',
    );
  });

  it('calling upgradeToAndCall on the implementation reverts', async function () {
    await expect(
      this.implInitial.upgradeToAndCall(
        this.implUpgradeOk,
        this.implUpgradeOk.interface.encodeFunctionData('increment'),
      ),
    ).to.be.revertedWithCustomError(this.implUpgradeOk, 'UUPSUnauthorizedCallContext');
  });

  it('calling upgradeToAndCall from a contract that is not an ERC1967 proxy (with the right implementation) reverts', async function () {
    // TVM CREATE addresses derive from `sha3(txHash || sender)`, not
    // `(sender, nonce)` like EVM — so `cloneFactory.$clone.staticCall(impl)`
    // returns a different address than the subsequent real
    // `$clone(impl)` deploy. Deploy first, then extract the clone's
    // address from the receipt's `internal_transactions` (the
    // TVM-recorded CREATE result). See test/proxy/Clones.test.js
    // newClone for the same pattern with rationale.
    const tx = await this.cloneFactory.$clone(this.implUpgradeOk);
    const receipt = await tx.wait();
    const internalTx = receipt.internalTransactions && receipt.internalTransactions[0];
    if (!internalTx || !internalTx.transferTo_address) {
      throw new Error('clone address not found in receipt.internalTransactions');
    }
    const instance = this.implInitial.attach('0x' + internalTx.transferTo_address.slice(2));

    await expect(instance.upgradeToAndCall(this.implUpgradeUnsafe, '0x')).to.be.revertedWithCustomError(
      instance,
      'UUPSUnauthorizedCallContext',
    );
  });

  it('rejects upgrading to an unsupported UUID', async function () {
    await expect(this.instance.upgradeToAndCall(this.implUnsupportedUUID, '0x'))
      .to.be.revertedWithCustomError(this.instance, 'UUPSUnsupportedProxiableUUID')
      .withArgs(ethers.id('invalid UUID'));
  });

  it('upgrade to and unsafe upgradeable implementation', async function () {
    await expect(this.instance.upgradeToAndCall(this.implUpgradeUnsafe, '0x'))
      .to.emit(this.instance, 'Upgraded')
      .withArgs(this.implUpgradeUnsafe);

    expect(await getAddressInSlot(this.instance, ImplementationSlot)).to.equal(this.implUpgradeUnsafe);
  });

  // delegate to a non existing upgradeTo function causes a low level revert
  it('reject upgrade to non uups implementation', async function () {
    await expect(this.instance.upgradeToAndCall(this.implUpgradeNonUUPS, '0x'))
      .to.be.revertedWithCustomError(this.instance, 'ERC1967InvalidImplementation')
      .withArgs(this.implUpgradeNonUUPS);
  });

  it('reject proxy address as implementation', async function () {
    const otherInstance = await ethers
      .deployContract('ERC1967ProxyUnsafe', [this.implInitial, '0x'])
      .then(proxy => this.implInitial.attach(proxy.target));

    await expect(this.instance.upgradeToAndCall(otherInstance, '0x'))
      .to.be.revertedWithCustomError(this.instance, 'ERC1967InvalidImplementation')
      .withArgs(otherInstance);
  });
});
