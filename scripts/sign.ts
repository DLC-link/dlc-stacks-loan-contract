import fs from "fs";
import EvmPriceSigner from "redstone-node/dist/src/signers/EvmPriceSigner";
import { bytesToHex } from "micro-stacks/common";
import { compressRedstonePubkey, hexToBytes, liteDataHash, liteDataHashPersonalSign, liteSignatureToStacksSignature, liteSignatureToBufferCV } from './lib/stacks-redstone';

// this script is used to create signed data for the tests

function readJsonFileSync(file: string) {
	const content = fs.readFileSync(file, "utf-8");
	return JSON.parse(content);
}

if (process.argv.length !== 4) {
	console.log(`Usage: ${process.argv0} <price_package.json file> <wallet.json file>`);
	process.exit(0);
}

const signer = new EvmPriceSigner();
const wallet = readJsonFileSync(process.argv[3]);
const privateKey = `0x${wallet.keyInfo.privateKey.substring(0, 64)}`;
const pricePackage = readJsonFileSync(process.argv[2]);

const serializedPriceData = signer.serializeToMessage(pricePackage);
const liteByteString = signer.getLiteDataBytesString(serializedPriceData);
const hashToSign = liteDataHash(hexToBytes(liteByteString));
const signaturePackage = signer.signPricePackage(pricePackage, privateKey);
const signatureCV = liteSignatureToStacksSignature(hexToBytes(signaturePackage.liteSignature));

console.log("serializedPriceData", serializedPriceData);
console.log("liteByteString", liteByteString);
console.log("hashToSign PrePersonalSign", `0x${bytesToHex(hashToSign)}`);
console.log("hashToSign PersonalSign", `0x${bytesToHex(liteDataHashPersonalSign(hashToSign))}`);
console.log("signer pubkey uncompressed", signaturePackage.signerPublicKey);
console.log("signer pubkey compressed", `0x${bytesToHex(compressRedstonePubkey(hexToBytes(signaturePackage.signerPublicKey)))}`);
console.log("liteSignature", signaturePackage.liteSignature);
//console.log("liteSignatureToBufferCV", liteSignatureToBufferCV(signaturePackage.liteSignature));
console.log("signatureCV", `0x${bytesToHex(signatureCV)}`);
console.log(signer.verifyLiteSignature(signaturePackage));

//console.log('litesig: ', liteSignatureToBufferCV("0x33d879666a3794b915c1da13ecc3b4d7d413fa746f3fe5d12a3ea597907f6aaa43ca4abfe5d62e0183fd5d24eef36c03fffee507c0fe921556b0f624ca72a7a31c"));

