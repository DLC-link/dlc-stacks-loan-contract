import { compressRedstonePubkey, hexToBytes, liteDataHash, liteDataHashPersonalSign, liteSignatureToStacksSignature } from './lib/stacks-redstone';
import { bytesToHex } from "micro-stacks/common";

// publick keys for nodes can be found here https://github.com/redstone-finance/redstone-node/blob/main/src/config/nodes.json
const pubKey = "0x04009dd87eb41d96ce8ad94aa22ea8b0ba4ac20c45e42f71726d6b180f93c3f298e333ae7591fe1c9d88234575639be9e81e35ba2fe5ad2c2260f07db49ccb9d0d";

console.log("signer pubkey compressed", `0x${bytesToHex(compressRedstonePubkey(hexToBytes(pubKey)))}`);

