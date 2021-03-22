import { getRocStream } from '../../indicators/roc';

export const getRocSignal = (symbol, timeFrame, rocData) => {
  getRocStream({
    symbol: symbol,
    interval: timeFrame,
    period: 9,
  }).subscribe(roc => {
    rocData.value = roc;
    // console.log(roc);
  });
};
