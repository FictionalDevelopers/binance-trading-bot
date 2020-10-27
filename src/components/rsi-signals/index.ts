import * as service from './service';
import { getRsiStream } from '../../indicators/rsi';

export const getRSISignal = (symbol, timeFrame, indicatorsData) => {
  getRsiStream({
    symbol: symbol,
    period: 14,
    interval: timeFrame,
  }).subscribe(rsi => {
    if (!indicatorsData.prevRsi) {
      indicatorsData.prevRsi = rsi;
      return;
    }
    indicatorsData.rsiValue = rsi;
    if (indicatorsData.prevRsi > rsi) {
      indicatorsData.sellNow = true;
      indicatorsData.buyNow = false;
    }
    if (indicatorsData.prevRsi < rsi) {
      indicatorsData.sellNow = false;
      indicatorsData.buyNow = true;
    }

    // if (
    //   indicatorsData.rsi1m.rsiValue !== null &&
    //   indicatorsData.rsi1m.rsiValue < 39 &&
    //   indicatorsData.rsi5m.rsiValue !== null &&
    //   indicatorsData.rsi5m.rsiValue < 39
    // )
    //   indicatorsData.rsiRebuy.value = true;
    // if (
    //   indicatorsData.rsi1m.rsiValue >= 41 &&
    //   indicatorsData.rsi5m.rsiValue >= 41
    // )
    //   indicatorsData.rsiRebuy.value = false;

    // console.log(`RSI:${rsi} ${indicatorsData.sellNow}`);
    indicatorsData.prevRsi = rsi;
  });
};

export { service };
