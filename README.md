# DLC Manager Smart Contract

This smart contract is the interface for creating and closing DLCs via the DLC.Link infrastructure. Upon close, this version of the contract automatically fills pricing data for the underlying asset (e.g. BTC price) of the DLC. For cases where the DLC does not require market prices of assets, please consider using this simpler version of this contract: [DLC Manager without Price Feeds](https://github.com/DLC-link/dlc-clarity-smart-contract)

Learn more about [DLCs](https://github.com/DLC-link/dlc-redstone-smart-contract#What-Are-DLCs) and [DLC.Link](https://github.com/DLC-link/dlc-redstone-smart-contract#About-DLC-Link) below.

# Overview
A DLC requires an oracle to attest to a specific outcome among the predefined set of outcomes. That means trust.

This contract acts to feed the outcome of the DLC. By using a smart contract for this task, the implementation of the logic, as well as the data being used, is stamped on the chain, and is visible and reviewable by everyone. 

# How to interact with this contract 

## Opening a DLC
When you register a DLC with this contract using the `open-new-dlc` function, a DLC is opened on our DLC server with the associated outcomes (CETs). The DLC *announcement hash*, which needed to fund the DLC, is available on the website, and eventually via an API call and on-chain.

*(TBD How does the UUID or handle come back to the caller?)*

The creation of a DLC can also be triggered with a traditional JSON API call (*coming soon TBD*)

*Todo: add info about the DLC oracle server*
*Todo: add info about the overall architecture*

With the announcement hash, you are now able to set up the DLC between the two participants (users, user/protocol, etc.)

## Closing the DLC
The DLC will be closed when the `principal` who opened the contract chooses to close it. When the contract function is called, the contract connects to the Redstone oracle network to pull the price of the associated asset. The DLC.Link backend system catches this event and closes the DLC in the DLC oracle with the associated outcome data. An *attestation hash* is now created and like the announcement hash, can be acquired via the website or API (or eventually smart contract).

The attestation hash is what will be used by the participants (user, protocol, etc.) to unlock the funds in the DLC.

# Contributing
We are happy to have support and contribution from the community. Please find us on Discord and see below for developer details.

For reference, a sample of this deployed contract can be found here: [discreet-log-storage-v3](https://explorer.stacks.co/txid/ST31H4TTX6TVMEE86TYV6PN6XPQ6J7NCS2DD0XFW0.discreet-log-storage-v3?chain=testnet)

# Setup
Add `secrets.js` file with the following fields:

```js
export const publicKey = '';
export const privateKey = '';
export const mnemonic = '';
```
`publicKey`: your wallet public key

`privateKey`: your private key corresponds to the public key (can be extracted with pk-extractor.js)

`mnemonic`: your menomic seed phrase

# Tests
Run
```console
clarinet test
```
For test coverage run
```console
clarinet test --coverage
```
And install lcov
```console
brew install lcov
genhtml coverage.lcov
open index.html
```

 
## Usage

Under scripts folder there are predefined scripts to:
* create dlc (emits an event)
* open new dlc
* close dlc
* early close dlc
* get dlc
* get all open dlc
* event-listening
* set oracle

These can be used as an example for later reference.

# Get all open DLCs UUID
Since Clarity has some limitations to store data in a dynamic way (lists has a pre defined length) also there is no way to create loops, we can't store or structure the required open dlc's uuids. 

As a workaround to achieve the above mentioned functionality the contract mints an NFT with each DLC open and burns it when it is closed, so we can easily poll the specific NFT balance of the contract to get the open UUIDs. This is very convenient since NFTs are first class citizens in Clarity and easy to work with them. See `get-all-open-dlc.js` for an example.

[Api docs for the call](https://docs.hiro.so/api?_gl=1*itpyo4*_ga*NzQwMjIzMDMxLjE2NDk4MzYyODk.*_ga_NB2VBT0KY2*MTY1MTIxNDk1NC41LjAuMTY1MTIxNDk1NC4w#operation/get_nft_holdings)

```json
{
    "limit": 50,
    "offset": 0,
    "total": 2,
    "results": [
        {
            "asset_identifier": "ST31H4TTX6TVMEE86TYV6PN6XPQ6J7NCS2DD0XFW0.discreet-log-storage-v3::open-dlc",
            "value": {
                "hex": "0x02000000057575696431",
                "repr": "0x7575696431"
            },
            "tx_id": "0x3985fbed42431257013699e189e261c1253d4067e66a9d9323b3463130839baa"
        },
        {
            "asset_identifier": "ST31H4TTX6TVMEE86TYV6PN6XPQ6J7NCS2DD0XFW0.discreet-log-storage-v3::open-dlc",
            "value": {
                "hex": "0x02000000057575696432",
                "repr": "0x7575696432"
            },
            "tx_id": "0xacf460c36ac1f5c90b14382265382b8e2e49b59dc2b17b84900cbdae4376932e"
        }
    ]
}
```
The response looks like this where the UUID is the `repr` key in a hex format.

# Close DLC
To close a dlc (both normal and early) a `timestamp`, `data package` and a `signature` needs to be submitted along with the `UUID`.

For reference check the close-dlc.ts script. You can run it with:
```console
npx ts-node scripts/close-dlc.ts 
```
**_NOTE:_** To close a DLC successfully you have to set a trusted oracle first (the oracle used in the contract and scripts is already set)
```console
npx ts-node scripts/set_oracle.ts  
```

# Error codes

```
not-contract-owner           u100
untrusted-oracle             u101
err-stale-data               u102
unauthorised                 u2001
dlc-already-added            u2002
unknown-dlc                  u2003
not-reached-closing-time     u2004
already-closed               u2005
already-passed-closing-time  u2006
not-closed                   u2007
err-not-the-same-assets      u2008
```

## Example calls
Refresh the page if it says not found.
* [Open new DLC](https://explorer.stacks.co/txid/0xbfdfa6d97f588da7741c78909aacdbc03812cf159537086728b77a95396ab3e4?chain=testnet)
* [Close DLC](https://explorer.stacks.co/txid/0xffd3d1c00ae69fbcfcdef5935d205b500b3f8838896df3267aea1e7ca756dd55?chain=testnet)


# About Redstone Oracle and how it is used
* [Intro article](https://stacks.org/redstone)
* [Reference implementation](https://github.com/Clarity-Innovation-Lab/redstone-clarity-connector)

**_NOTE:_** the integration so this implementation as well depends on [micro-stacks](https://github.com/fungible-systems/micro-stacks) which is in alpha state and not audited, so use this in production with caution.

Flow of the oracle requests:

1. submit trusted oracle (node public keys can be found [here](https://github.com/redstone-finance/redstone-node/blob/main/src/config/nodes.json), this repo uses `redstone`) 
2. when trying to close a DLC, submit a `timestamp`, `data package` and a `signature` as well with the UUID, which can be obtained from the [redstone-api-extended](https://www.npmjs.com/package/redstone-api-extended) module. For reference check the `close-dlc.ts` script.

# Notes
closing-price comming from the oracle is not scaled eg.: BTC price: 3036091214130 needs to be divided by 10 ** 8 on the client side

# Scripts
The scripts directory includes an example of how to call each of the functions via JS. These can be used to learn about the functionality of the contract, as well as for calling to the contract. 

# What Are DLCs
[Discreet Log Contracts](https://dci.mit.edu/smart-contracts) (DLCs) facilitate conditional payments on Bitcoin between two or more parties. By creating a Discreet Log Contract, two parties can form a monetary contract redistributing their funds to each other without revealing any details to the blockchain. Its appearance on the Bitcoin blockchain will be no different than an ordinary multi-signature output, so no external observer can learn its existence or details from the public ledger. A DLC is similar to a 2-of-3 multisig transaction where the third participant is an “oracle”.  An oracle is a 3rd party source of data or information that the parties to the DLC trust as the source of truth for the contract. The oracle is incentivized to be a fair arbiter of the contract.

# About DLC Link
DLC.Link is building infrastructure to empower decentralized applications and smart contract developers to easily leverage the power of DLCs. We provide companies and applications with a traditional REST API and a smart contract interface to create and manage DLCs for their use cases.

DLCs require an oracle to attest to a specific outcome among the predefined set of outcomes. That means trust.

Why power DLC oracles with smart contracts? By using a smart contract for this task, the implementation of the logic, as well as the data being used, is stamped on the chain, and is *visible and reviewable* by everyone. 

Unlike other DLC Oracle server solutions, DLC.link allows the DLCs to be configured with a simple interface, API or via smart contract, and to act on a wide-set of events and data sources through our decentralized infrastructure. 

There are two types of events / data sources supported by DLC.link.

1. Off-chain pricing data, such as the current price of BTC, ETH, etc. In fact, any numeric data from Redstone Oracle Network is supported.

2. On-chain events, such as a completed transaction, a function call, etc. (Also, because Stacks can read the state of the BTC blockchain, actions can be taken directly on Stacks in response to funding transactions of DLCs on BTC. *This is continuing to be researched, and may be dependent on this project: https://grants.stacks.org/dashboard/grants/235)
