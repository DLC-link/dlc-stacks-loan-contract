import { network, contractAddress, contractName} from './common'
import {
  bufferCVFromString,
  callReadOnlyFunction,
  cvToValue,
  uintCV
} from "@stacks/transactions";

const functionName = "check-liquidation";

const txOptions = {
  contractAddress: contractAddress,
  contractName: contractName,
  functionName: functionName,
  functionArgs: [
    bufferCVFromString('rwiJuiUS'), // uuid
    uintCV(1400000000000) // btc-price (shifted)
  ],
  senderAddress: contractAddress,
  network,
};

async function main(){
  const transaction: any = await callReadOnlyFunction(txOptions);
  console.log(cvToValue(transaction));
}

main();
