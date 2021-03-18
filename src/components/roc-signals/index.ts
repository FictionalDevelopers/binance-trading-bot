import { getRocStream } from '../../indicators/roc';

export const getRocSignal = (symbol, timeFrame, data) => {
  getRocStream({
    symbol: symbol,
    interval: timeFrame,
    period: 9,
  }).subscribe(roc => {
    data.roc5m = roc;
    // console.log(roc);
  });
};
