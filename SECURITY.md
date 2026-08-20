# Security Policy

Security vulnerabilities should be disclosed to the project maintainers privately through [GitHub security advisories][new advisory].

[new advisory]: https://github.com/OpenZeppelin/tron-contracts/security/advisories/new

## Security Patches

Security vulnerabilities will be patched as soon as responsibly possible, and published as an advisory on this repository (see [advisories]) and on the affected npm packages.

[advisories]: https://github.com/OpenZeppelin/tron-contracts/security/advisories

Projects that build on OpenZeppelin Contracts for Tron are encouraged to clearly state, in their source code and websites, how to be contacted about security issues in the event that a direct notification is considered necessary. We recommend including it in the NatSpec for the contract as `/// @custom:security-contact security@example.com`.

Additionally, we recommend installing the library through npm and setting up vulnerability alerts such as [Dependabot].

[Dependabot]: https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-supply-chain-security#what-is-dependabot

### Supported Versions

Security patches will be released for the latest minor of a given major release. For example, if an issue is found in versions >=5.6.0 and the latest is 5.7.0, the patch will be released only in version 5.7.1.

Only critical severity bug fixes will be backported to past major releases.

| Version | Critical security fixes | Other security fixes |
| ------- | ----------------------- | -------------------- |
| 5.x     | :white_check_mark:      | :white_check_mark:   |

Note as well that the Solidity language itself only guarantees security updates for the latest release.

## Legal

Blockchain is a nascent technology and carries a high level of risk and uncertainty. OpenZeppelin makes certain software available under open source licenses, which disclaim all warranties in relation to the project and which limits the liability of OpenZeppelin. Subject to any particular licensing terms, your use of the project is governed by the terms found at [www.openzeppelin.com/tos](https://www.openzeppelin.com/tos) (the "Terms"). As set out in the Terms, you are solely responsible for any use of the project and you assume all risks associated with any such use. This Security Policy in no way evidences or represents an ongoing duty by any contributor, including OpenZeppelin, to correct any issues or vulnerabilities or alert you to all or any of the risks of utilizing the project.
