# DLC Manager Smart Contract

This smart contract is the interface for creating, closing and otherwise managing DLCs via the DLC.Link infrastructure. Upon close, this version of the contract automatically fills pricing data for the underlying asset (e.g. BTC price) of the DLC. 

The DLC in this contract supports (*coming soon) a binary payout model as well as a numerical payout model, where all the funds locked in the DLC will go to either A or B in the case of a planned contract exit (e.g. loan repayment), or on a more complex payout curve depending on the final price of the underlying asset relative to the given `strike-price` (e.g. for a liquidation process). 

For cases where the DLC does not require market prices of assets, please consider using this simpler version of this contract: [DLC Manager without Price Feeds](https://github.com/DLC-link/dlc-clarity-smart-contract)

After creating / closing the DLC, you can see your DLC *announcement* and *attestation* on our dashboard by going here and choosing Open DLCs: https://app.dlc.link/

Learn more about [DLCs](https://github.com/DLC-link/dlc-redstone-smart-contract#What-Are-DLCs) and [DLC.Link](https://github.com/DLC-link/dlc-redstone-smart-contract#About-DLC-Link) below.

# Overview

A DLC requires an oracle to attest to a specific outcome among the predefined set of outcomes. That means trust.

This contract acts to feed the outcome of the DLC. By using a smart contract for this task, the implementation of the logic, as well as the data being used, is stamped on the chain, and is visible and reviewable by everyone.

# How to interact with this contract

## Clarity Traits
The following Clarity Traits must be implemented to interact with this contract.
### Post Create DLC Callback
Used to callback into the calling/protocol contract to provide the uuid of the created DCL, which will be used to reference the DLC going forward.

Params
uuid:string - UUID of the DLC

### Post Close DLC Callback
Used to callback into the calling/protocol contract to notify when a liquidation event occurred and the corresponding price, or simply for reference when a DLC is closed in the normal path.

Params
uuid:string - UUID of the DLC
liquidate:boolean
price:float

## Function to call
### Register contract

This must be run first by a DLC.Link admin. This authorizes your contract to interact with our DLC Manager contract and to be listened to by our listeners. This happens once, and should happen first before anything else.

Parameters:
contract-address:Principal

### Unregister Contract
Used to unregister a contract from the list of authorized contracts

Parameters
contract-address:Principal

### Opening a DLC

When you register a DLC with this contract using the `create-dlc` function, a DLC is opened on our DLC server with the associated outcomes (CETs) and using the provided asset (e.g. BTC) as a price value to be used within the DLC. A list of asset symbols that can be used with Redstone is available here: https://github.com/redstone-finance/redstone-api/blob/main/docs/ALL_SUPPORTED_TOKENS.md

The DLC *announcement hash*, which needed to fund the DLC, is available on the website (https://app.dlc.link/ - click Open DLCs), and eventually via an API call, and eventually on-chain as well.

See the comments in the contract for further information about using this function.

Parameters:
* liquidation-price:float
* payout-formula:format - TBD
* post-create-dlc-handler:function - Used to callback into the calling/protocol contract to provide the uuid of the created DCL, which will be used to reference the DLC going forward. See the traits section of this document for more information on this function. 
* post-close-dlc-handler:function - Used to callback into the calling/protocol contract to notify when a liquidation event occurred and the corresponding price, or simply for reference when a DLC is closed in the normal path. See the traits section of this document for more information on this function. 

### Closing the DLC

The DLC will be closed in one of two ways.
1. The `principal` who opened the contract chooses to close it by calling the `close-dlc` function, either from their smart contract, or via an off-chain script. In this case, the end user entering into the DLC gets fully repayed their BTC. 

Parameters:
uuid:string

or

2. When the *public* contract function `early-close-dlc` is called by anyone (including third-parties such as liquidators), with the intention of having the DLC.Link system check the underlying price and potentially trigger a liquidation process.

Parameters:
uuid:string


In either case, the contract connects to the Redstone oracle network through the DLC Oracles, to pull the price of the associated asset. This will trigger the calling of the private `close-dlc-internal` function. The DLC.Link backend system catches this event and closes the DLC in the DLC oracle with the associated outcome data. An _attestation hash_ is now created and like the announcement hash, can be acquired via the website or API (or eventually smart contract).

The attestation hash is what will be used by the participants (user, protocol, etc.) to unlock the funds in the DLC.

# Contributing

We are happy to have support and contribution from the community. Please find us on Discord and see below for developer details.

For reference, a sample of this deployed contract can be found here: [dlc-manager-pricefeed-v1-02](https://explorer.stacks.co/txid/ST12S2DB1PKRM1BJ1G5BQS0AB0QPKHRVHWXDBJ27R.dlc-manager-pricefeed-v1-02?chain=testnet)

# Setup Development Environment

Create a `.env` file with the following fields:

```js
NODE_ENV=[ENV]
PRIVATE_KEY=[PRIVATE_KEY]
PROTOCOL_PRIVATE_KEY=[PROTOCOL_PRIVATE_KEY]
MNEMONIC=[MNEMONIC]
```

`ENV`: 'mocknet' | 'testnet' | 'mainnet'

`PRIVATE_KEY`: your private key on the given chain (can be extracted with pk-extractor.js)

`PROTOCOL_PRIVATE_KEY`: the private key used to deploy a sample protocol contract (see examples/protocol-contract-contract.clar)

`MNEMONIC`: your mnenomic seed phrase (only required for the pk-extractor.js)


## redstone-verify.clar

The Redstone data-package verification contract is included in the `contracts/external/` folder for the purposes of deploying it during Mocknet testing. In production and testnet, the on-chain contracts are used, which can be found here: 

[redstone-verify on Testnet](https://explorer.stacks.co/txid/0x35952be366691c79243cc0fc43cfcf90ae71ed66a9b6d9578b167c28965bbf7e?chain=testnet)

[redstone-verify on Mainnet](https://explorer.stacks.co/txid/0x8de1fb0a41d6a8a962c8016c3a5178176fc51c206afa72f71f5747a6246a37bb?chain=mainnet)

## Deploying to Mocknet

Fully testing the contract requires running instances of the DLC oracles and the backend service, which is not yet open-sourced. However, steps of a deployment to a local integration mocknet is still provided here for posterity:

1. Update `.env` with the proper information (NODE_ENV=mocknet for mocknet setup)
2. In `Clarinet.toml`: comment out the `project.requirements` lines (4-5)
3. In `Clarinet.toml`: uncomment the 3 lines about the dev contracts (14-28)
4. In the `dlc-manager-pricefeed.clar` file, update the redstone-verify contract's principal address to the mocknet deployer's: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM`
5. If you changed anything else in the contract, regenerate the deployment plan:
   1. `$ clarinet deployments generate --devnet`
6. Launch the integration blockchain (docker must be running):
   1. `$ clarinet integrate`


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

- create dlc (emits an event)
- create-dlc-internal (called by the oracle)
- close dlc (emits an event)
- early close dlc (admin only, testing purposes)
- close-dlc-internal (the function to actually close a dlc on-chain with oracle data)
- get dlc
- get all open dlc
- event-listening
- set oracle

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
      "asset_identifier": "ST31H4TTX6TVMEE86TYV6PN6XPQ6J7NCS2DD0XFW0.discreet-log-storage-v5::open-dlc",
      "value": {
        "hex": "0x02000000057575696431",
        "repr": "0x7575696431"
      },
      "tx_id": "0x3985fbed42431257013699e189e261c1253d4067e66a9d9323b3463130839baa"
    },
    {
      "asset_identifier": "ST31H4TTX6TVMEE86TYV6PN6XPQ6J7NCS2DD0XFW0.discreet-log-storage-v5::open-dlc",
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

The same user/protocol that created the DLC can call the `close-dlc` function, by providing the necessary UUID. Behind the scenes the DLC.Link infrastructure will use the `close-dlc-internal` function and generate the DLC closing hash, and send it back to the protocol / user to be used to close the DLC in their wallets. (You can see an example of what's happening behind the scenes in the [close-dlc-internal.ts](scripts/close-dlc-internal.ts) file.)

The close is handled in two steps because much of the information required/provided by the Redstone oracle system (`timestamp`, `data package`, `signature`) can be generated automatically, thus we can save the user/protocol the hassle of doing so. The resulting data package is verified on-chain in the second step, eliminating any trust in the DLC oracle system.

For reference about what's happening on our oracle system, check the close-dlc-internal.ts script. You can run it with (if you are the contract-deployer):

```console
npx ts-node scripts/close-dlc-internal.ts
```

**_NOTE:_** To close a DLC successfully you have to set a trusted oracle first (the oracle used in the deployed contract and scripts is already set on Testnet)

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

- [Open new DLC](https://explorer.stacks.co/txid/0xbfdfa6d97f588da7741c78909aacdbc03812cf159537086728b77a95396ab3e4?chain=testnet)
- [Close DLC](https://explorer.stacks.co/txid/0xffd3d1c00ae69fbcfcdef5935d205b500b3f8838896df3267aea1e7ca756dd55?chain=testnet)

# About Redstone Oracle and how it is used

- [Intro article](https://stacks.org/redstone)
- [Reference implementation](https://github.com/Clarity-Innovation-Lab/redstone-clarity-connector)

**_NOTE:_** the integration so this implementation as well depends on [micro-stacks](https://github.com/fungible-systems/micro-stacks) which is in alpha state and not audited, so use this in production with caution.

Flow of the Redstone oracle requests:

1. submit trusted oracle (node public keys can be found [here](https://github.com/redstone-finance/redstone-node/blob/main/src/config/nodes.json), this repo uses `redstone`)
2. when trying to close a DLC, submit a `timestamp`, `data package` and a `signature` as well with the UUID, which can be obtained from the [redstone-api-extended](https://www.npmjs.com/package/redstone-api-extended) module. For reference check the `close-dlc-internal.ts` script.

# Notes

closing-price comming from the oracle is not scaled eg.: BTC price: 3036091214130 needs to be divided by 10 \*\* 8 on the client side

# Scripts

The scripts directory includes an example of how to call each of the functions via JS. These can be used to learn about the functionality of the contract, as well as for calling/protocol to the contract.

# What Are DLCs

[Discreet Log Contracts](https://dci.mit.edu/smart-contracts) (DLCs) facilitate conditional payments on Bitcoin between two or more parties. By creating a Discreet Log Contract, two parties can form a monetary contract redistributing their funds to each other without revealing any details to the blockchain. Its appearance on the Bitcoin blockchain will be no different than an ordinary multi-signature output, so no external observer can learn its existence or details from the public ledger. A DLC is similar to a 2-of-3 multisig transaction where the third participant is an “oracle”. An oracle is a 3rd party source of data or information that the parties to the DLC trust as the source of truth for the contract. The oracle is incentivized to be a fair arbiter of the contract.

# About DLC Link

DLC.Link is building infrastructure to empower decentralized applications and smart contract developers to easily leverage the power of DLCs. We provide companies and applications with a traditional REST API and a smart contract interface to create and manage DLCs for their use cases.

DLCs require an oracle to attest to a specific outcome among the predefined set of outcomes. That means trust.

Why power DLC oracles with smart contracts? By using a smart contract for this task, the implementation of the logic, as well as the data being used, is stamped on the chain, and is _visible and reviewable_ by everyone.

Unlike other DLC Oracle server solutions, DLC.link allows the DLCs to be configured with a simple interface, API or via smart contract, and to act on a wide-set of events and data sources through our decentralized infrastructure.

There are two types of events / data sources supported by DLC.link.

1. Off-chain pricing data, such as the current price of BTC, ETH, etc. In fact, any numeric data from Redstone Oracle Network is supported.

2. On-chain events, such as a completed transaction, a function call, etc. (Also, because Stacks can read the state of the BTC blockchain, actions can be taken directly on Stacks in response to funding transactions of DLCs on BTC. \*This is continuing to be researched, and may be dependent on this project: https://grants.stacks.org/dashboard/grants/235)
