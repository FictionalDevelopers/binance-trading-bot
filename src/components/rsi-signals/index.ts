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
    if (indicatorsData.prevRsi > rsi) {
      indicatorsData.sellNow = true;
      indicatorsData.buyNow = false;
    }
    if (indicatorsData.prevRsi < rsi) {
      indicatorsData.sellNow = false;
      indicatorsData.buyNow = true;
    }
    console.log(`RSI:${rsi} ${indicatorsData.sellNow}`);
    indicatorsData.rsiValue = rsi;
  });
};

export { service };
