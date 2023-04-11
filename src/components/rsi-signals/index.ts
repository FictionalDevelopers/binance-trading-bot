import * as service from './service';
import { getRsiStream } from '../../indicators/rsi';
import _throttle from 'lodash/throttle';

export const getRSISignal = (symbol, timeFrame, period, indicatorsData) => {
  getRsiStream({
    symbol: symbol,
    period,
    interval: timeFrame,
  }).subscribe(rsi => {
    if (!indicatorsData.prevRsi) {
      indicatorsData.prevRsi = rsi;
      return;
    }
    indicatorsData.rsiValue = rsi;
    if (indicatorsData.rsiValue > 60) {
      indicatorsData.downCount = 0;
      indicatorsData.growCount++;
    } else if (indicatorsData.rsiValue < 40) {
      indicatorsData.growCount = 0;
      indicatorsData.downCount++;
    } else {
      indicatorsData.growCount = 0;
      indicatorsData.downCount = 0;
    }
    if (indicatorsData.growCount >= 3) indicatorsData.signal = 'buy';
    else if (indicatorsData.downCount >= 3) indicatorsData.signal = 'sell';

    // console.log(`RSI:${rsi} ${indicatorsData.sellNow}`);
    indicatorsData.prevRsi = rsi;
  });
};

export { service };
