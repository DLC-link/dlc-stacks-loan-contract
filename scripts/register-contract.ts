import {
  network,
  senderKey,
  contractAddress,
  contractName,
  exampleContractName,
  exampleContractAddress
} from "./common";

import {
  makeContractCall,
  broadcastTransaction,
  contractPrincipalCV,
} from "@stacks/transactions";

// Replace this with the options required for your contract.
const txOptions = {
  contractAddress: contractAddress,
  contractName: contractName,
  functionName: "register-contract",
  functionArgs: [
    contractPrincipalCV(exampleContractAddress, exampleContractName)
  ],
  senderKey: senderKey,
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
