// import * as service from './service';
import { getForceIndexStream } from '../../indicators/forceIndex';

export const getForceIndexSignal = (symbol, timeFrame) => {
  getForceIndexStream({
    symbol: symbol,
    interval: timeFrame,
  }).subscribe(forceIndex => {
    console.log(forceIndex);
  });
};
