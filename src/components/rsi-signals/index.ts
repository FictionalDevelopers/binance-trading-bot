import * as service from './service';
import { getRsiStream } from '../../indicators/rsi';

export const getRSISignal = (symbol, timeFrame, indicatorsData) => {
  getRsiStream({
    symbol: symbol,
    period: 14,
    interval: timeFrame,
  }).subscribe(rsi => {
    indicatorsData[`rsi${timeFrame}Value`] = rsi;
  });
};

export { service };
