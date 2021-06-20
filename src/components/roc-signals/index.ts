import { getRocStream } from '../../indicators/roc';

export const getRocSignal = (
  symbol,
  timeFrame,
  rocData,
  buySens,
  sellSens,
  buySignalCount,
  sellSignalCount,
) => {
  getRocStream({
    symbol: symbol,
    interval: timeFrame,
    period: 9,
  }).subscribe(roc => {
    if (!rocData.prevValue) {
      rocData.prevValue = roc;
      return;
    }

    rocData.diff = (roc / rocData.prevValue) * 100 - 100;

    // if (rocData.prevValue > roc) {
    //   rocData.buySignalCount = 0;
    //   rocData.sellSignalCount++;
    // } else if (rocData.prevValue < roc) {
    //   rocData.sellSignalCount = 0;
    //   rocData.buySignalCount++;
    // } else if (rocData.prevValue === roc) {
    //   rocData.sellSignalCount = 0;
    //   rocData.buySignalCount = 0;
    //   rocData.signal = null;
    // }

    if (rocData.diff <= sellSens) {
      rocData.buySignalCount = 0;
      rocData.sellSignalCount++;
    } else if (rocData.diff >= buySens) {
      rocData.sellSignalCount = 0;
      rocData.buySignalCount++;
    } else if (rocData.diff === 0) {
      rocData.sellSignalCount = 0;
      rocData.buySignalCount = 0;
      rocData.signal = null;
    }

    // if (rocData.buySignalCount >= buySignalCount) rocData.signal = 'buy';
    // else if (rocData.sellSignalCount >= sellSignalCount)
    //   rocData.signal = 'sell';

    rocData.prevValue = roc;
  });
};
