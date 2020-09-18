import { getEmaStream } from '../../indicators/ema';
import { indicatorsData } from '../../index';

// const timer = setInterval(() => {
//   if (!indicatorsData.ema25Prev) {
//     indicatorsData.ema25Prev = Number(indicatorsData.slow1mEMA).toFixed(4);
//     return;
//   }
//
//   if (
//     (Number(indicatorsData.slow1mEMA).toFixed(4) / indicatorsData.ema25Prev) *
//       100 >=
//     0.4
//   ) {
//     indicatorsData.emaBuySignal = true;
//     indicatorsData.emaSellSignal = false;
//   } else if (
//     (indicatorsData.ema25Prev / Number(indicatorsData.slow1mEMA).toFixed(4)) *
//       100 >=
//     0.4
//   ) {
//     indicatorsData.emaSellSignal = true;
//     indicatorsData.emaBuySignal = false;
//   }
//   console.log('Prev: ' + indicatorsData.ema25Prev);
//   indicatorsData.ema25Prev = Number(indicatorsData.slow1mEMA).toFixed(4);
//
//   console.log('Current: ' + indicatorsData.slow1mEMA);
// }, 60000);

export const getEMASignal = (symbol, timeFrame, indicatorsData) => {
  getEmaStream({
    symbol: symbol,
    interval: timeFrame,
    period: 7,
  }).subscribe(fastEMA => {
    indicatorsData[`fast${timeFrame}EMA`] = fastEMA;
  });

  getEmaStream({
    symbol: symbol,
    interval: timeFrame,
    period: 25,
  }).subscribe(middleEMA => {
    indicatorsData[`middle${timeFrame}EMA`] = middleEMA;
    console.log(middleEMA);
  });

  getEmaStream({
    symbol: symbol,
    interval: timeFrame,
    period: 99,
  }).subscribe(slowEMA => {
    indicatorsData[`slow${timeFrame}EMA`] = slowEMA;
  });
};
