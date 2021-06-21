import { getObvStream } from '../../indicators/obv';
import { sendToRecipients } from '../../services/telegram';

// export const runObvInterval = indicatorsData => {
//   setInterval(async () => {
//     if (!indicatorsData.prevObv && indicatorsData.obv) {
//       indicatorsData.prevObv = indicatorsData.obv;
//       return;
//     }
//
//     if (indicatorsData.prevObv > indicatorsData.obv) {
//       indicatorsData.obvSellSignalCount++;
//       indicatorsData.obvBuySignalCount = 0;
//     }
//     if (indicatorsData.prevObv < indicatorsData.obv) {
//       indicatorsData.obvBuySignalCount++;
//       indicatorsData.obvSellSignalCount = 0;
//     }
//
//     if (indicatorsData.obvBuySignalCount >= 2) {
//       indicatorsData.obvSignal = 'buy';
//     }
//     if (indicatorsData.obvSellSignalCount >= 2) {
//       indicatorsData.obvSignal = 'sell';
//     }
//
//     console.log('Curr: ' + indicatorsData.obv);
//     console.log('Prev: ' + indicatorsData.prevObv);
//     console.log('Buy signal: ' + indicatorsData.obvBuySignalCount);
//     console.log('Sell signal: ' + indicatorsData.obvSellSignalCount + '\n');
//
//     indicatorsData.prevObv = indicatorsData.obv;
//   }, 60000);
// };

export const getObvSignal = (
  symbol,
  timeFrame,
  indicatorsData,
  buySignalCount,
  sellSignalCount,
) => {
  getObvStream({
    symbol: symbol,
    interval: timeFrame,
  }).subscribe(obv => {
    if (obv) {
      if (!indicatorsData.prevObv) {
        indicatorsData.prevObv = obv;
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

      if (indicatorsData.prevObv > obv) {
        const obvDiff = Math.abs((indicatorsData.prevObv / obv) * 100 - 100);
        if (obvDiff >= 10) indicatorsData.obvDiff = obvDiff;
        else indicatorsData.obvDiff = null;
        indicatorsData.buySignalCount = 0;
        indicatorsData.sellSignalCount++;
      } else if (indicatorsData.prevObv < obv) {
        const obvDiff = Math.abs((obv / indicatorsData.prevObv) * 100 - 100);
        if (obvDiff >= 10) indicatorsData.obvDiff = obvDiff;
        else indicatorsData.obvDiff = null;
        indicatorsData.sellSignalCount = 0;
        indicatorsData.buySignalCount++;
      } else if (indicatorsData.prevObv === obv) {
        // indicatorsData.sellSignalCount = 0;
        // indicatorsData.buySignalCount = 0;
        // indicatorsData.signal = null;
      }

      if (indicatorsData.buySignalCount >= buySignalCount)
        indicatorsData.signal = 'buy';
      else if (indicatorsData.sellSignalCount >= sellSignalCount)
        indicatorsData.signal = 'sell';
      indicatorsData.prevObv = obv;
    }
  });
};
