import {
  network,
  senderKey,
  contractAddress,
  contractName,
  exampleContractAddress,
  exampleContractName
} from "./common";

import {
  makeContractCall,
  broadcastTransaction,
  contractPrincipalCV,
  NonFungibleConditionCode,
  bufferCVFromString,
  createAssetInfo,
  makeContractNonFungiblePostCondition,
} from "@stacks/transactions";

const nftName = "registered-contract";
const functionName = "unregister-contract";

const postConditionCode = NonFungibleConditionCode.DoesNotOwn;
const tokenAssetName = contractPrincipalCV(exampleContractAddress, exampleContractName);
const nonFungibleAssetInfo = createAssetInfo(contractAddress, contractName, nftName);

const contractNonFungiblePostCondition = makeContractNonFungiblePostCondition(
  contractAddress,
  contractName,
  postConditionCode,
  nonFungibleAssetInfo,
  tokenAssetName
);

const txOptions = {
  contractAddress: contractAddress,
  contractName: contractName,
  functionName: functionName,
  functionArgs: [
    contractPrincipalCV(exampleContractAddress, exampleContractName)
  ],
  postConditions: [contractNonFungiblePostCondition],
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
