import {
  network,
  senderAddress,
  senderKey,
  contractAddress,
  contractName,
  UUID,
  unixTimeStamp,
} from "./common";
import {
  makeContractCall,
  broadcastTransaction,
  bufferCVFromString,
  uintCV,
  standardPrincipalCV,
} from "@stacks/transactions";

const functionName = "open-new-dlc";

const txOptions = {
  contractAddress: contractAddress,
  contractName: contractName,
  functionName: functionName,
  functionArgs: [
    bufferCVFromString(UUID), // uuid
    bufferCVFromString("ETH"), // asset
    uintCV(unixTimeStamp), // closing-time
    uintCV(unixTimeStamp), // emergency-refund-time
    standardPrincipalCV("STWYKHG01H1RPXB4Z74SM3CMGB3SGCWVYV9YEHHZ"), // creator
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
