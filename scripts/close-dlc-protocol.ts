import { network, protocolPrivateKey, exampleContractName, exampleContractAddress } from './common'
import { makeContractCall, broadcastTransaction, uintCV } from "@stacks/transactions";

const functionName = "close-dlc";

function populateTxOptions() {
  return {
    contractAddress: exampleContractAddress,
    contractName: exampleContractName,
    functionName: functionName,
    functionArgs: [
      uintCV(2)
    ],
    senderKey: protocolPrivateKey,
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
