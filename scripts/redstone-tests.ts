
import redstone from 'redstone-api';
import redstoneExtended from 'redstone-api-extended';
import { assetName } from './common'

import { unixTimeStamp } from './common';
import { PriceData } from 'redstone-api/lib/types';
import fetch from 'node-fetch';

interface PriceDataWithSig extends PriceData {
  liteEvmSignature: string;
}

(async () => {

  const dataPackageNow = await redstoneExtended.oracle.getFromDataFeed("redstone", assetName);
  console.log("now: ", dataPackageNow);

  const historicalDataExtended = await redstoneExtended.getHistoricalPrice("BTC", {date: unixTimeStamp * 1000}) as PriceDataWithSig;
  console.log("@closing ext: ", historicalDataExtended);

  let dataPackage2 = await redstone.query().symbol(assetName).latest().exec() as PriceDataWithSig;
  console.log("now w query:" , dataPackage2);

  let dataPackage3 = await redstone.query().symbol(assetName).atDate(unixTimeStamp * 1000).exec() as PriceDataWithSig;
  console.log("@closing: ", dataPackage3);

  const dataPackage = await fetch(`https://api.redstone.finance/packages?provider=redstone&symbol=${assetName}&toTimestamp=${unixTimeStamp*1000}`)
    .then(res => res.json())
    .catch(error => console.error(error));
  
  if (!dataPackage || !dataPackage.liteSignature || dataPackage.prices.length === 0) {
    console.error(`Invalid RedStone request for ${assetName} @ ${unixTimeStamp*1000}, skipping...`);
    return;
  }
  console.log("RedStone historic data package:", dataPackage);

})();
