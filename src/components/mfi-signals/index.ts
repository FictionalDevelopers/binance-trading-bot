import { getMfiStream } from '../../indicators/mfi';

export const getMfiSignal = (
  symbol,
  timeFrame,
  period,
  indicatorsData,
  buySignalCount,
  sellSignalCount,
) => {
  getMfiStream({
    symbol: symbol,
    interval: timeFrame,
    period: period,
  }).subscribe(mfi => {
    if (mfi) {
      if (!indicatorsData.prevMfi) {
        indicatorsData.prevMfi = mfi;
        return;
      }

      // indicatorsData.obvDiff = (obv / indicatorsData.prevObv) * 100 - 100;
      //
      // if (indicatorsData.obvDiff > 0) {
      //   indicatorsData.buySignalCount = 0;
      //   indicatorsData.sellSignalCount++;
      // } else if (indicatorsData.obvDiff < 0) {
      //   indicatorsData.sellSignalCount = 0;
      //   indicatorsData.buySignalCount++;
      // } else if (indicatorsData.obvDiff === 0) {
      //   indicatorsData.sellSignalCount = 0;
      //   indicatorsData.buySignalCount = 0;
      //   indicatorsData.signal = null;
      // }
      indicatorsData.mfi = mfi;

      if (indicatorsData.prevMfi > mfi) {
        indicatorsData.buySignalCount = 0;
        indicatorsData.sellSignalCount++;
      } else if (indicatorsData.prevMfi < mfi) {
        indicatorsData.sellSignalCount = 0;
        indicatorsData.buySignalCount++;
      } else if (indicatorsData.prevMfi === mfi) {
        // indicatorsData.sellSignalCount = 0;
        // indicatorsData.buySignalCount = 0;
        // indicatorsData.signal = null;
      }

      if (indicatorsData.buySignalCount >= buySignalCount)
        indicatorsData.signal = 'buy';
      else if (indicatorsData.sellSignalCount >= sellSignalCount)
        indicatorsData.signal = 'sell';

      indicatorsData.prevMfi = mfi;
    }
  });
};
