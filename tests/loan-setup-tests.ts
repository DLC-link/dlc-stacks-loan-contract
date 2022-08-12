function toPrecision(x: number, precision: number): number {
  return parseFloat(x.toPrecision(precision));
}

class DLC {
  vaultLoanAmount: number;
  BTCDeposit: number;
  liquidationRatio: number;
  liquidationFee: number;
  strikePrice: number;

  constructor(vaultLoanAmount: number, BTCDeposit: number, liquidationRatio: number, liquidationFee: number) {
    this.vaultLoanAmount = vaultLoanAmount;
    this.BTCDeposit = BTCDeposit;
    this.liquidationRatio = liquidationRatio;
    this.liquidationFee = liquidationFee;

    this.strikePrice = vaultLoanAmount * liquidationRatio / 100; // stays fixed. If collateralUSD drops below this, liquidate
  }

  calculateLTV(BTCPrice: number): number {
    return this.vaultLoanAmount / this.calculateCollateralValue(BTCPrice) * 100;
  }

  calculateCollateralValue(BTCPrice: number): number {
    return BTCPrice * this.BTCDeposit;
  }

  checkLiquidation(BTCPrice: number): boolean {
    return this.calculateCollateralValue(BTCPrice) <= this.strikePrice;
  }

  getPayouts(BTCPrice: number, precision: number): { payoutForm: number, toUserBTC: number, totalToProtocolBTC: number } {
    const sellToLiquidatorsRatio = this.vaultLoanAmount / this.calculateCollateralValue(BTCPrice);
    const toProtocolBTC = (sellToLiquidatorsRatio * this.BTCDeposit);  
    let totalToProtocolBTC = toProtocolBTC + toProtocolBTC / 100 * this.liquidationFee;
    let toUserBTC = this.BTCDeposit - totalToProtocolBTC;

    return {
      payoutForm: toPrecision(sellToLiquidatorsRatio * (100 + this.liquidationFee), precision),
      toUserBTC: toUserBTC,
      totalToProtocolBTC: totalToProtocolBTC
    }
  }
}

let initialPrecision = 2;
let BTCInitialPrice = 30000;
const BTCBottomPrice = 10000;

const maxLTV = 50; // set by Arkadiko

const BTCDeposit = 2;
const liquidationRatio = 140;
const liquidationFee = 10;
const vaultLoanAmount = 20000;

let dlc = new DLC(vaultLoanAmount, BTCDeposit, liquidationRatio, liquidationFee);
if (dlc.calculateLTV(BTCInitialPrice) > maxLTV) throw "LTV exceeds maximum amount, quitting"; 

console.log(`Initial LTV: ${dlc.calculateLTV(BTCInitialPrice)}`);

for (let BTCPrice = BTCInitialPrice; BTCPrice > BTCBottomPrice; BTCPrice -= 500) {
  console.log(`BTC Price: ${BTCPrice}`);

  if (dlc.checkLiquidation(BTCPrice)) {
    let data: Array<{ precision: number, difference: number, USDDiff: number }> = [];
    for(let p = initialPrecision; p < 6; p++) {
      const payouts = dlc.getPayouts(BTCPrice, p);
      console.log(`Liquidating @ ${BTCPrice}. Precision: ${p}, PayoutCurveValue: ${payouts.payoutForm}, totalToProtocolBTC: ${payouts.totalToProtocolBTC}, toUserBTC: ${payouts.toUserBTC}`);
      let protocolPayoutDifference = payouts.totalToProtocolBTC - (BTCDeposit / 100 * payouts.payoutForm);
      data.push({precision: p, difference: protocolPayoutDifference, USDDiff: protocolPayoutDifference * BTCPrice });
    }
    console.table(data);

    break;
  }
}
