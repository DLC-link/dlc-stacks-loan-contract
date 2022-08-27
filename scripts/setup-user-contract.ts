import {
  network,
  unixTimeStamp,
  protocolPrivateKey,
  exampleContractAddress,
  exampleContractName
} from "./common";

import {
  makeContractCall,
  broadcastTransaction,
  uintCV,
} from "@stacks/transactions";

const functionName = "setup-user-contract";

const txOptions = {
  contractAddress: exampleContractAddress,
  contractName: exampleContractName,
  functionName: functionName,
  functionArgs: [
    uintCV(1000000),       // loan amount in pennies
    uintCV(100000000),     // btc-deposit in Sats
    uintCV(14000),         // liquidation-ratio, two decimals precison
    uintCV(1000),          // liquidation-fee, two decimals precision
    uintCV(unixTimeStamp), // emergency-refund-time
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
