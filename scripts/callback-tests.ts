import {
  network,
  exampleContractAddress,
  exampleContractName,
  protocolPrivateKey
} from "./common";

import {
  makeContractCall,
  broadcastTransaction,
  contractPrincipalCV,
} from "@stacks/transactions";

// Replace this with the options required for your contract.
const txOptions = {
  contractAddress: exampleContractAddress,
  contractName: exampleContractName,
  functionName: "setup-user-contract",
  functionArgs: [
    contractPrincipalCV(exampleContractAddress, exampleContractName)
  ],
  senderKey: protocolPrivateKey,
  validateWithAbi: true,
  network,
  fee: 100000,
  anchorMode: 1,
};

async function main() {
  const transaction = await makeContractCall(txOptions);
  console.log(transaction);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log("2: ", broadcastResponse);
}

main();
