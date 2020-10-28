import * as service from './service';
import { getStochRsiStream } from '../../indicators/stochRSI';

export const getStochRSISignal = (symbol, timeFrame, indicatorsData) => {
  getStochRsiStream({
    symbol: symbol,
    interval: timeFrame,
  }).subscribe(rsi => {
    console.log(`StochRSI:${JSON.stringify(rsi)}`);
  });
};

export { service };
