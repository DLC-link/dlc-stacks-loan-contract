import { makeContractDeploy, broadcastTransaction, AnchorMode } from '@stacks/transactions';
import { readFileSync } from 'fs';
import { exampleContractName, network, protocolPrivateKey } from './common';

const txOptions = {
  contractName: exampleContractName,
  codeBody: readFileSync('example/sample-protocol-contract.clar').toString(),
  senderKey: protocolPrivateKey,
  network,
  anchorMode: 1,
};
(async () => {
const transaction = await makeContractDeploy(txOptions);
console.log(transaction)

const broadcastResponse = await broadcastTransaction(transaction, network);
console.log("Broadcast response:", broadcastResponse)
const txId = broadcastResponse.txid;})()
