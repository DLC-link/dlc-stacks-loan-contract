import { network, senderKey, contractAddress, contractName, UUID, testCreatorKey } from './common'
import { makeContractCall, broadcastTransaction, bufferCVFromString, uintCV } from "@stacks/transactions";

const functionName = "close-dlc";

function populateTxOptions() {
  return {
    contractAddress: contractAddress,
    contractName: "sample-protocol-contract",
    functionName: functionName,
    functionArgs: [
      uintCV(1)
    ],
    senderKey: senderKey,
    validateWithAbi: true,
    network,
    fee: 100000, //0.1STX
    anchorMode: 1,
  }
}

async function main() {
  const transaction = await makeContractCall(populateTxOptions());
  console.log(transaction);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log("2: ", broadcastResponse);
}

main()
