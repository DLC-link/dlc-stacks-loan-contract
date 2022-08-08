import { makeContractDeploy, broadcastTransaction, AnchorMode } from '@stacks/transactions';
import { StacksTestnet, StacksMainnet } from '@stacks/network';
import { readFileSync } from 'fs';
import { protocolPrivateKey } from './common';

// for mainnet, use `StacksMainnet()`
const network = new StacksTestnet();

const txOptions = {
  contractName: 'sample-protocol-contract',
  codeBody: readFileSync('example/sample-protocol-contract.clar').toString(),
  senderKey: protocolPrivateKey,
  network,
  anchorMode: AnchorMode.Any,
};
(async () => {
const transaction = await makeContractDeploy(txOptions);
console.log(transaction)

const broadcastResponse = await broadcastTransaction(transaction, network);
console.log("Broadcast response:", broadcastResponse)
const txId = broadcastResponse.txid;})()
