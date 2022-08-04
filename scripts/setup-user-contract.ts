import {
  network,
  senderKey,
  contractAddress,
  contractName,
  assetName,
  unixTimeStamp,
  strikePrice,
  testCreatorKey
} from "./common";

import {
  makeContractCall,
  broadcastTransaction,
  bufferCVFromString,
  uintCV,
} from "@stacks/transactions";

const functionName = "setup-user-contract";

// Replace this with the options required for your contract.
const txOptions = {
  contractAddress: contractAddress,
  contractName: "sample-protocol-contract",
  functionName: functionName,
  functionArgs: [
    bufferCVFromString(assetName), // asset
    uintCV(strikePrice),
    uintCV(unixTimeStamp), // closing-time
    uintCV(unixTimeStamp), // emergency-refund-time
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
