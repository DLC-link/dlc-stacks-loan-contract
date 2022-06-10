import fetch from "node-fetch";

const principal =
  "ST31H4TTX6TVMEE86TYV6PN6XPQ6J7NCS2DD0XFW0.discreet-log-storage-v5";
const asset_identifiers =
  "ST31H4TTX6TVMEE86TYV6PN6XPQ6J7NCS2DD0XFW0.discreet-log-storage-v5::open-dlc";

const URLAPI = `https://stacks-node-api.testnet.stacks.co/extended/v1/tokens/nft/holdings?asset_identifiers=${asset_identifiers}&principal=${principal}`;
let data: any = null;

function setData(dt: any) {
  data = dt;
}

function extractUUID(data: any): string {
  return data.value.repr;
}

function hex2ascii(hexx: string) {
  var hex = hexx.toString(); //force conversion
  var str = "";
  for (var i = 2; i < hex.length; i += 2)
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
}

function getOpenUUIDs() {
  fetch(URLAPI)
    .then((response) => response.json())
    .then((json) => setData(json))
    .catch((error) => console.error(error))
    .finally(() => {
      data.results.map((res: any) => console.log(hex2ascii(extractUUID(res))));
    });
}

getOpenUUIDs();
