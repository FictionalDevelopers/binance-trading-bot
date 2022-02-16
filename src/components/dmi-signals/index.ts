import { getDmiStream } from '../../indicators/dmi';
import _throttle from 'lodash/throttle';

export const getDMISignal = (
  symbol,
  timeFrame,
  indicatorsData,
  buyCount,
  // sellCount,
  // pdiMdiBuyDiff,
  // pdiMdiSellDiff,
  adxBuyDiff,
  adxSellDiff,
) => {
  getDmiStream({
    symbol: symbol,
    interval: timeFrame,
    period: 4,
  }).subscribe(dmi => {
    if (!indicatorsData.prevDmi) {
      indicatorsData.prevDmi = dmi;
      indicatorsData.prevDiff =
        Number(dmi.pdi).toPrecision(4) / Number(dmi.mdi).toPrecision(4);
      return;
    }
    indicatorsData.adx = dmi.adx;
    if ((dmi.adx / dmi.pdi) * 100 - 100 >= 2.5) indicatorsData.adxSignal = -1;
    if ((dmi.pdi / dmi.adx) * 100 - 100 >= 2.5) indicatorsData.adxSignal = 1;
    if (dmi.mdi > dmi.pdi) {
      // if (indicatorsData.trend === 'UP') {
      //   indicatorsData.adxBuySignalVolume++;
      //   indicatorsData.adxSellSignalVolume = 0;
      // }
      indicatorsData.mdiSignal = -1;
      indicatorsData.trend = 'DOWN';
    }
    if (dmi.pdi > dmi.mdi) {
      // if (indicatorsData.trend === 'DOWN') {
      //   indicatorsData.adxBuySignalVolume = 0;
      //   indicatorsData.adxSellSignalVolume++;
      // }
      indicatorsData.mdiSignal = 1;
      indicatorsData.trend = 'UP';
    }

    if (indicatorsData.trend === 'DOWN') {
      if (indicatorsData.prevDmi.adx > dmi.adx) {
        indicatorsData.adxBuySignalVolume++;
        indicatorsData.adxSellSignalVolume = 0;
      }
      if (indicatorsData.prevDmi.adx < dmi.adx) {
        indicatorsData.adxSellSignalVolume++;
        indicatorsData.adxBuySignalVolume = 0;
      }
      if (indicatorsData.prevDmi.adx === dmi.adx) {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
    }
    if (indicatorsData.trend === 'UP') {
      if (indicatorsData.prevDmi.adx > dmi.adx) {
        indicatorsData.adxSellSignalVolume++;
        indicatorsData.adxBuySignalVolume = 0;
      }
      if (indicatorsData.prevDmi.adx < dmi.adx) {
        indicatorsData.adxBuySignalVolume++;
        indicatorsData.adxSellSignalVolume = 0;
      }
      if (indicatorsData.prevDmi.adx === dmi.adx) {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
    }
    if (indicatorsData.adxBuySignalVolume >= 2)
      indicatorsData.willPriceGrow = true;
    if (indicatorsData.adxSellSignalVolume > 0)
      indicatorsData.willPriceGrow = false;
    console.log(dmi.adx);
    if ((dmi.adx / indicatorsData.prevDmi.adx) * 100 - 100 >= 0.5)
      indicatorsData.adxSignal = 'buy';
    if ((indicatorsData.prevDmi.adx / dmi.adx) * 100 - 100 >= 0.5)
      indicatorsData.adxSignal = 'sell';

    // if (buyCount) {
    //   if (
    //     // (Number(dmi.pdi).toPrecision(4) /
    //     //   Number(dmi.mdi).toPrecision(4) /
    //     //   indicatorsData.prevDiff) *
    //     //   100 -
    //     //   100 >=
    //     //   pdiMdiBuyDiff &&
    //     (dmi.adx / indicatorsData.prevDmi.adx) * 100 - 100 >
    //     adxBuyDiff
    //   ) {
    //     // indicatorsData.signal = 'BUY';
    //     indicatorsData.adxUpCount++;
    //     indicatorsData.adxDownCount = 0;
    //     indicatorsData.adxDiff =
    //       (dmi.adx / indicatorsData.prevDmi.adx) * 100 - 100;
    //     indicatorsData.adxDirection = 'UP';
    //     // console.log(
    //     //   'UP ' +
    //     //     ((dmi.adx / indicatorsData.prevDmi.adx) * 100 - 100).toString() +
    //     //     ' ' +
    //     //     indicatorsData.adxUpCount +
    //     //     ' Count',
    //     // );
    //     // console.log(
    //     //   'Value: ' +
    //     //     Number(dmi.pdi).toPrecision(4) / Number(dmi.mdi).toPrecision(4) +
    //     //     '\n',
    //     // );
    //     // if (indicatorsData.buySignalCount >= buyCount)
    //     //   indicatorsData.signal = 'BUY';
    //   } else if (
    //     // (Number(dmi.pdi).toPrecision(4) /
    //     //   Number(dmi.mdi).toPrecision(4) /
    //     //   indicatorsData.prevDiff) *
    //     //   100 -
    //     //   100 <=
    //     //   pdiMdiSellDiff &&
    //     (indicatorsData.prevDmi.adx / dmi.adx) * 100 - 100 >
    //     adxSellDiff
    //     // indicatorsData.adxSignal = 'sell'
    //   ) {
    //     // indicatorsData.signal = 'SELL';
    //     indicatorsData.adxDownCount++;
    //     indicatorsData.adxUpCount = 0;
    //     indicatorsData.adxDiff =
    //       (indicatorsData.prevDmi.adx / dmi.adx) * 100 - 100;
    //     indicatorsData.adxDirection = 'DOWN';
    //
    //     // console.log(
    //     //   'DOWN ' +
    //     //     ((indicatorsData.prevDmi.adx / dmi.adx) * 100 - 100).toString() +
    //     //     ' ' +
    //     //     indicatorsData.adxDownCount +
    //     //     ' Count',
    //     // );
    //
    //     // console.log(
    //     //   'Value: ' +
    //     //     Number(dmi.pdi).toPrecision(4) / Number(dmi.mdi).toPrecision(4) +
    //     //     '\n',
    //     // );
    //     // if (indicatorsData.sellSignalCount >= sellCount)
    //     //   indicatorsData.signal = 'SELL';
    //   } else if ((indicatorsData.prevDmi.adx / dmi.adx) * 100 - 100 === 0) {
    //     // indicatorsData.adxDownCount = 0;
    //     // indicatorsData.adxUpCount = 0;
    //   }
    // }

    indicatorsData.prevDmi = dmi;
    indicatorsData.prevDiff =
      Number(dmi.pdi).toPrecision(4) / Number(dmi.mdi).toPrecision(4);
  });
};
