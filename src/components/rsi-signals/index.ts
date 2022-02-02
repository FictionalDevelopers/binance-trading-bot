import * as service from './service';
import { getRsiStream } from '../../indicators/rsi';
import _throttle from 'lodash/throttle';

export const getRSISignal = (symbol, timeFrame, indicatorsData) => {
  getRsiStream({
    symbol: symbol,
    period: 4,
    interval: timeFrame,
  }).subscribe(rsi => {
    if (!indicatorsData.prevRsi) {
      indicatorsData.prevRsi = rsi;
      return;
    }
    indicatorsData.rsiValue = rsi;
    if (indicatorsData.prevRsi > rsi) {
      indicatorsData.downCount++;
      indicatorsData.growCount = 0;
    }
    if (indicatorsData.prevRsi < rsi) {
      indicatorsData.growCount++;
      indicatorsData.downCount = 0;
    }
    if (indicatorsData.growCount >= 2) indicatorsData.signal = 'buy';
    else if (indicatorsData.downCount >= 2) indicatorsData.signal = 'sell';

    // console.log(`RSI:${rsi} ${indicatorsData.sellNow}`);
    indicatorsData.prevRsi = rsi;
  });
};

export { service };
