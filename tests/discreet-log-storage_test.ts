// deno-lint-ignore-file require-await no-explicit-any prefer-const
// @ts-ignore
import { Clarinet, Tx, Chain, Account, types, assertEquals, pricePackageToCV, assertStringIncludes, hex2ascii, shiftPriceValue } from "./deps.ts";
// @ts-ignore
import type { PricePackage, Block } from "./deps.ts";

// Unfortunately it is not straightforward to import "../src/stacks-redstone.ts"
// in Clarinet test files. Values are therefore generated by the helper scripts
// found in the ./scripts directory. The parameters used to generate the data
// is provided in comments.

const BTChex = "BTC";
const UUID = "fakeuuid";
const nftAssetContract = "open-dlc";
const dlcManagerContract = "dlc-manager-pricefeed-v2-01";
const callbackContract = "callback-contract";

const contractPrincipal = (deployer: Account, contract: string) => `${deployer.address}.${contract}`;

const trustedOraclePubkey = "0x035ca791fed34bf9e9d54c0ce4b9626e1382cf13daa46aa58b657389c24a751cc6";
const untrustedOraclePubkey = "0x03cd2cfdbd2ad9332828a7a13ef62cb999e063421c708e863a7ffed71fb61c88c9";

const pricePackage: PricePackage = {
  timestamp: 1647332581,
  prices: [{ symbol: "BTC", value: 23501.669932 }]
}

const pricePackageForLiquidation: PricePackage = {
  timestamp: 1647332581,
  prices: [{ symbol: "BTC", value: 13588.669932 }]
}

const packageCV = pricePackageToCV(pricePackage);
const packageCVForLiquidation = pricePackageToCV(pricePackageForLiquidation);

const signature = "0x4ee83f2bdc6d67619e13c5786c42aa66a899cc63229310400247bac0dd22e99454cec834a98b56a5042bcec5e709a76e90d072569e5db855e58e4381d0adb0c201";

const signatureForLiquidation = "0x3256910f5d0788ee308baecd3787a36ab2e3a8ff3fb4d0fc4638c84ba48957b82876b71eb58751366dd7a8a6ae1f2040120706742676ddc2187170932bb344e901";

function setTrustedOracle(chain: Chain, senderAddress: string): Block {
  return chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "set-trusted-oracle", [trustedOraclePubkey, types.bool(true)], senderAddress),
  ]);
}

function createNewDLC(chain: Chain, deployer: Account, callbackContract: string, loanParams: {vaultAmount: number, btcDeposit: number, liquidationRatio: number, liquidationFee: number } = {vaultAmount: 1000000, btcDeposit: 1, liquidationRatio: 14000, liquidationFee: 1000 }) {

  const block = chain.mineBlock([
    Tx.contractCall(dlcManagerContract, "create-dlc-internal", [types.buff(UUID), types.uint(loanParams.vaultAmount), types.uint(shiftPriceValue(loanParams.btcDeposit)), types.uint(loanParams.liquidationRatio), types.uint(loanParams.liquidationFee), types.uint(10), types.principal(callbackContract), types.principal(callbackContract), types.uint(1)], deployer.address)
  ]);

  block.receipts[0].result.expectOk().expectBool(true);
  const createDLCInternalPrintEvent = block.receipts[0].events[0];
  const callbackPrintEvent = block.receipts[0].events[1];
  const mintEvent = block.receipts[0].events[2];
  return { createDLCInternalPrintEvent, callbackPrintEvent, mintEvent };
}

Clarinet.test({
  name: "Contract owner can set trusted oracle",
  async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get("deployer")!;
      const block = setTrustedOracle(chain, deployer.address);
      const [receipt] = block.receipts;
      receipt.result.expectOk().expectBool(true);
      const trusted = chain.callReadOnlyFn(dlcManagerContract, "is-trusted-oracle", [trustedOraclePubkey], deployer.address);
      const untrusted = chain.callReadOnlyFn(dlcManagerContract, "is-trusted-oracle", [untrustedOraclePubkey], deployer.address);
      trusted.result.expectBool(true);
      untrusted.result.expectBool(false);
  },
});

Clarinet.test({
  name: "create-dlc called from a protocol-contract emits a dlclink event",
  async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer_2 = accounts.get('deployer_2')!;

      let block = chain.mineBlock([
          Tx.contractCall(contractPrincipal(deployer_2, callbackContract), "create-dlc-request", [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)], deployer_2.address)
      ]);

      block.receipts[0].result.expectOk().expectBool(true);
      const event = block.receipts[0].events[0];

      assertEquals(typeof event, 'object');
      assertEquals(event.type, 'contract_event');
      assertEquals(event.contract_event.topic, "print");
      assertStringIncludes(event.contract_event.value, "btc-deposit: u100000000");
      assertStringIncludes(event.contract_event.value, "creator: " + contractPrincipal(deployer_2, callbackContract));
      assertStringIncludes(event.contract_event.value, 'event-source: "dlclink:create-dlc:v2"');
  },
});


Clarinet.test({
  name: "create-dlc-internal creates a new dlc, prints an event, calls the callback-function and mints an open-dlc nft",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const deployer_2 = accounts.get('deployer_2')!;

    const { createDLCInternalPrintEvent, callbackPrintEvent, mintEvent } = createNewDLC(chain, deployer, contractPrincipal(deployer_2, callbackContract));

    let block = chain.mineBlock([
        Tx.contractCall(dlcManagerContract, "get-dlc", [types.buff(UUID)], deployer.address)
    ]);

    assertEquals(typeof createDLCInternalPrintEvent, 'object');
    assertEquals(createDLCInternalPrintEvent.type, 'contract_event');
    assertEquals(createDLCInternalPrintEvent.contract_event.topic, "print");
    assertStringIncludes(createDLCInternalPrintEvent.contract_event.value, 'btc-deposit: u100000000, creator: STNHKEPYEPJ8ET55ZZ0M5A34J0R3N5FM2CMMMAZ6.callback-contract, emergency-refund-time: u10, event-source: "dlclink:create-dlc-internal:v2", liquidation-fee: u1000, liquidation-ratio: u14000, uuid: 0x66616b6575756964, vault-loan-amount: u1000000')

    assertEquals(typeof callbackPrintEvent, 'object');
    assertEquals(callbackPrintEvent.type, 'contract_event');
    assertEquals(callbackPrintEvent.contract_event.topic, "print");
    assertStringIncludes(callbackPrintEvent.contract_event.value, 'event-source: "callback-mock-post-create", nonce: u1, uuid: 0x66616b6575756964')

    assertEquals(typeof mintEvent, 'object');
    assertEquals(mintEvent.type, 'nft_mint_event');
    assertEquals(mintEvent.nft_mint_event.asset_identifier.split("::")[1], nftAssetContract);
    assertEquals(mintEvent.nft_mint_event.recipient.split(".")[1], dlcManagerContract);

    const dlc: any = block.receipts[0].result.expectSome().expectTuple();

    assertEquals(hex2ascii(dlc.uuid), "fakeuuid");
    assertEquals(dlc["closing-price"], "none");
    assertEquals(dlc.creator, "STNHKEPYEPJ8ET55ZZ0M5A34J0R3N5FM2CMMMAZ6.callback-contract");
  },
});

Clarinet.test({
  name: "only contract owner can add DLC",
  async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer_2 = accounts.get('deployer_2')!;
      const wallet_1 = accounts.get('wallet_1')!;

      let block = chain.mineBlock([
          Tx.contractCall(dlcManagerContract, "create-dlc-internal", [types.buff(UUID), types.uint(1000000), types.uint(100000000), types.uint(14000), types.uint(1000), types.uint(10), types.principal(contractPrincipal(deployer_2, callbackContract)), types.principal(contractPrincipal(deployer_2, callbackContract)), types.uint(1)], wallet_1.address),
      ]);

      const err = block.receipts[0].result.expectErr();
      assertEquals(err, "u2001"); // err-unauthorised
  },
});

Clarinet.test({
  name: "check-liquidation returns correct liquidation status for given price",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const deployer_2 = accounts.get('deployer_2')!;

    createNewDLC(chain, deployer, contractPrincipal(deployer_2, callbackContract));

    let block = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "check-liquidation", [types.buff(UUID), types.uint(shiftPriceValue(14500))], deployer.address),
      Tx.contractCall(dlcManagerContract, "check-liquidation", [types.buff(UUID), types.uint(shiftPriceValue(14000))], deployer.address)
    ]);

    block.receipts[0].result.expectOk().expectBool(false);
    block.receipts[1].result.expectOk().expectBool(true);
 }
})

Clarinet.test({
  name: "get-payout-ratio returns the correct amount for given BTC price (example values)",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const deployer_2 = accounts.get('deployer_2')!;

    createNewDLC(chain, deployer, contractPrincipal(deployer_2, callbackContract));

    let block = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "get-payout-ratio", [types.buff(UUID), types.uint(shiftPriceValue(14000))], deployer.address),

      Tx.contractCall(dlcManagerContract, "get-payout-ratio", [types.buff(UUID), types.uint(shiftPriceValue(20000))], deployer.address),

      Tx.contractCall(dlcManagerContract, "get-payout-ratio", [types.buff(UUID), types.uint(shiftPriceValue(9000))], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectUint(78571428571);
    block.receipts[1].result.expectOk().expectUint(0);
    block.receipts[2].result.expectOk().expectUint(100000000000);
 }
})

Clarinet.test({
  name: "get-payout-ratio returns the correct amount for given BTC price",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const deployer_2 = accounts.get('deployer_2')!;

    createNewDLC(chain, deployer, contractPrincipal(deployer_2, callbackContract), {vaultAmount: 1500000, btcDeposit: 2, liquidationRatio: 14000, liquidationFee: 1000 });

    let block = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "get-payout-ratio", [types.buff(UUID), types.uint(shiftPriceValue(10400))], deployer.address),
      Tx.contractCall(dlcManagerContract, "get-payout-ratio", [types.buff(UUID), types.uint(shiftPriceValue(11000))], deployer.address),

    ]);

    block.receipts[0].result.expectOk().expectUint(79326923076);
    block.receipts[1].result.expectOk().expectUint(0);
 }
})

Clarinet.test({
  name: "close-dlc emits an event",
  async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get('deployer')!;
      const deployer_2 = accounts.get('deployer_2')!;

      createNewDLC(chain, deployer, contractPrincipal(deployer_2, callbackContract));

      let block = chain.mineBlock([
          Tx.contractCall(dlcManagerContract, "close-dlc", [types.buff(UUID)], deployer.address),
      ]);

      block.receipts[0].result.expectOk().expectBool(true);
      const event = block.receipts[0].events[0];

      assertEquals(typeof event, 'object');
      assertEquals(event.type, 'contract_event');
      assertEquals(event.contract_event.topic, "print");
      assertStringIncludes(event.contract_event.value, "uuid: 0x66616b6575756964");
      assertStringIncludes(event.contract_event.value, 'event-source: "dlclink:close-dlc:v2"');
  },
});

Clarinet.test({
  name: "close-dlc-liquidate emits an event",
  async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get('deployer')!;
      const deployer_2 = accounts.get('deployer_2')!;

      createNewDLC(chain, deployer, contractPrincipal(deployer_2, callbackContract));

      let block = chain.mineBlock([
          Tx.contractCall(dlcManagerContract, "close-dlc-liquidate", [types.buff(UUID)], deployer.address),
      ]);

      block.receipts[0].result.expectOk().expectBool(true);
      const event = block.receipts[0].events[0];

      assertEquals(typeof event, 'object');
      assertEquals(event.type, 'contract_event');
      assertEquals(event.contract_event.topic, "print");
      assertStringIncludes(event.contract_event.value, "uuid: 0x66616b6575756964");
      assertStringIncludes(event.contract_event.value, 'event-source: "dlclink:close-dlc-liquidate:v2"');
  },
});

Clarinet.test({
  name: "close-dlc-liquidate-internal throws error if there is no need to liquidate",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const deployer_2 = accounts.get('deployer_2')!;

    createNewDLC(chain, deployer, contractPrincipal(deployer_2, callbackContract));
    setTrustedOracle(chain, deployer.address);

    let block = chain.mineBlock([
        Tx.contractCall(dlcManagerContract, "close-dlc-liquidate-internal", [types.buff(UUID), packageCV.timestamp, packageCV.prices, signature, types.principal(contractPrincipal(deployer_2, callbackContract))], deployer.address)
    ]);

    const err = block.receipts[0].result.expectErr();
    assertEquals(err, "u3000"); // err-does-not-need-liquidation

  }
})

Clarinet.test({
    name: "close-dlc-liquidate-internal prints payout-ratio, updates closing-price and actual-closing-time, calls the callback-contract and burns the corresponding nft",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const deployer_2 = accounts.get('deployer_2')!;
  
        createNewDLC(chain, deployer, contractPrincipal(deployer_2, callbackContract));
        setTrustedOracle(chain, deployer.address);

        let block = chain.mineBlock([
            Tx.contractCall(dlcManagerContract, "close-dlc-liquidate-internal", [types.buff(UUID), packageCVForLiquidation.timestamp, packageCVForLiquidation.prices, signatureForLiquidation, types.principal(contractPrincipal(deployer_2, callbackContract))], deployer.address),
            Tx.contractCall(dlcManagerContract, "get-dlc", [types.buff(UUID)], deployer.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        const printEvent2 = block.receipts[0].events[0];

        assertEquals(typeof printEvent2, 'object');
        assertEquals(printEvent2.type, 'contract_event');
        assertEquals(printEvent2.contract_event.topic, "print");
        assertStringIncludes(printEvent2.contract_event.value, 'actual-closing-time: u1647332, closing-price: u1358866993200, event-source: "dlclink:close-dlc-liquidate-internal:v2", payout-ratio: (ok u80953782749), uuid: 0x66616b6575756964')

        const contractEvent = block.receipts[0].events[1];

        assertEquals(typeof contractEvent, 'object');
        assertEquals(contractEvent.type, 'contract_event');
        assertEquals(contractEvent.contract_event.topic, "print");
        assertStringIncludes(contractEvent.contract_event.value, 'closing-price: (some u1358866993200), event-source: "callback-mock-post-close", uuid: 0x66616b6575756964')
      
        const burnEvent = block.receipts[0].events[2];

        assertEquals(typeof burnEvent, 'object');
        assertEquals(burnEvent.type, 'nft_burn_event');
        assertEquals(burnEvent.nft_burn_event.asset_identifier.split("::")[1], nftAssetContract);
        assertEquals(burnEvent.nft_burn_event.sender.split(".")[1], dlcManagerContract);

        const dlc: any = block.receipts[1].result.expectSome().expectTuple();
        assertEquals(dlc['closing-price'], "(some u1358866993200)")
    },
});

Clarinet.test({
  name: "can't request close on a closed dlc",
  async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get('deployer')!;
      const deployer_2 = accounts.get('deployer_2')!;

      createNewDLC(chain, deployer, contractPrincipal(deployer_2, callbackContract));
      setTrustedOracle(chain, deployer.address);

      let block = chain.mineBlock([
          Tx.contractCall(dlcManagerContract, "close-dlc-internal", [types.buff(UUID), types.principal(contractPrincipal(deployer_2, callbackContract))], deployer.address),
          Tx.contractCall(dlcManagerContract, "close-dlc", [types.buff(UUID)], deployer.address),
      ]);

      const err = block.receipts[1].result.expectErr();
      assertEquals(err, "u2005"); // err-already-closed
  },
});


Clarinet.test({
  name: "can't request close-liquidate on a closed-liquidated dlc",
  async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get('deployer')!;
      const deployer_2 = accounts.get('deployer_2')!;

      createNewDLC(chain, deployer, contractPrincipal(deployer_2, callbackContract));
      setTrustedOracle(chain, deployer.address);

      let block = chain.mineBlock([
          Tx.contractCall(dlcManagerContract, "close-dlc-liquidate-internal", [types.buff(UUID), packageCVForLiquidation.timestamp, packageCVForLiquidation.prices, signatureForLiquidation, types.principal(contractPrincipal(deployer_2, callbackContract))], deployer.address),
          Tx.contractCall(dlcManagerContract, "close-dlc-liquidate", [types.buff(UUID)], deployer.address),
      ]);

      const err = block.receipts[1].result.expectErr();
      assertEquals(err, "u2005"); // err-already-closed
  },
});

Clarinet.test({
  name: "only authorized wallets can request close-dlc",
  async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get('deployer')!;
      const wallet_1 = accounts.get('wallet_1')!;
      const deployer_2 = accounts.get('deployer_2')!;

      createNewDLC(chain, deployer, contractPrincipal(deployer_2, callbackContract));
      setTrustedOracle(chain, deployer.address);

      let block = chain.mineBlock([
          Tx.contractCall(dlcManagerContract, "close-dlc", [types.buff(UUID)], wallet_1.address),
      ]);

      const err = block.receipts[0].result.expectErr();
      assertEquals(err, "u2001"); // err-unauthorized
  },
});


Clarinet.test({
  name: "only contract-owner can register contracts",
  async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get('deployer')!;
      const deployer_2 = accounts.get('deployer_2')!;

      let block = chain.mineBlock([
          Tx.contractCall(dlcManagerContract, "register-contract", [types.principal(contractPrincipal(deployer_2, callbackContract))], deployer_2.address),
      ]);

      const err = block.receipts[0].result.expectErr();
      assertEquals(err, "u100"); // err-not-contract-owner
  },
});

Clarinet.test({
  name: "is-contract-registered returns true for registered contract",
  async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get('deployer')!;
      const deployer_2 = accounts.get('deployer_2')!;

      let block = chain.mineBlock([
          Tx.contractCall(dlcManagerContract, "register-contract", [types.principal(contractPrincipal(deployer_2, callbackContract))], deployer.address),
          Tx.contractCall(dlcManagerContract, "is-contract-registered", [types.principal(contractPrincipal(deployer_2, callbackContract))], deployer_2.address)
      ]);

      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectBool(true);
  },
});

Clarinet.test({
  name: "is-contract-registered returns false for unregistered contract",
  async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get('deployer')!;
      const deployer_2 = accounts.get('deployer_2')!;

      let block = chain.mineBlock([
          Tx.contractCall(dlcManagerContract, "register-contract", [types.principal(contractPrincipal(deployer_2, callbackContract))], deployer.address),
          Tx.contractCall(dlcManagerContract, "unregister-contract", [types.principal(contractPrincipal(deployer_2, callbackContract))], deployer.address),
          Tx.contractCall(dlcManagerContract, "is-contract-registered", [types.principal(contractPrincipal(deployer_2, callbackContract))], deployer_2.address)
      ]);

      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);
      block.receipts[2].result.expectBool(false);
  },
});
