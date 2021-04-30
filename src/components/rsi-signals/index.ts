import * as service from './service';
import { getRsiStream } from '../../indicators/rsi';
import _throttle from 'lodash/throttle';

export const getRSISignal = (symbol, timeFrame, indicatorsData) => {
  getRsiStream({
    symbol: symbol,
    period: 14,
    interval: timeFrame,
  }).subscribe(
    _throttle(rsi => {
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

      // console.log(`RSI:${rsi} ${indicatorsData.sellNow}`);
      indicatorsData.prevRsi = rsi;
    }, 500),
  );
};

export { service };
