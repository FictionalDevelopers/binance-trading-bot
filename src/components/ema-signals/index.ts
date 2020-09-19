import { getEmaStream } from '../../indicators/ema';
// import { indicatorsData } from '../../index';

export const runEMAInterval = indicatorsData => {
  setInterval(() => {
    if (indicatorsData.emaPoints.length === 0) {
      indicatorsData.emaCanIBuy = true;
      indicatorsData.emaPoints.push([
        Number(indicatorsData.fast1mEMA).toFixed(4),
        Number(indicatorsData.middle1mEMA).toFixed(4),
      ]);
      // indicatorsData.ema25Prev = Number(indicatorsData.slow1mEMA).toFixed(4);
      return;
    }

    if (indicatorsData.emaPoints.length < 3) {
      indicatorsData.emaPoints.push([
        Number(indicatorsData.fast1mEMA).toFixed(4),
        Number(indicatorsData.middle1mEMA).toFixed(4),
      ]);
    } else {
      indicatorsData.emaPoints.length = 0;
      indicatorsData.emaPoints.push([
        Number(indicatorsData.fast1mEMA).toFixed(4),
        Number(indicatorsData.middle1mEMA).toFixed(4),
      ]);
    }

    if (
      indicatorsData.emaPoints.length === 3 &&
      indicatorsData.emaPoints[1][0] > indicatorsData.emaPoints[0][0] &&
      indicatorsData.emaPoints[2][0] > indicatorsData.emaPoints[1][0] &&
      indicatorsData.emaPoints[1][1] > indicatorsData.emaPoints[0][1] &&
      indicatorsData.emaPoints[2][1] > indicatorsData.emaPoints[1][1]
    ) {
      indicatorsData.emaSignal = 'buy';
      indicatorsData.emaBuyPoint = Number(indicatorsData.fast1mEMA).toFixed(4);
    }

    if (
      indicatorsData.emaPoints.length === 3 &&
      indicatorsData.emaPoints[2][0] < indicatorsData.emaPoints[1][0] &&
      indicatorsData.emaPoints[1][0] < indicatorsData.emaPoints[0][0] &&
      indicatorsData.emaPoints[2][1] < indicatorsData.emaPoints[1][1] &&
      indicatorsData.emaPoints[1][1] < indicatorsData.emaPoints[0][1]
    ) {
      indicatorsData.emaSignal = 'sell';
      indicatorsData.emaCanIBuy = true;
    }

    if (
      (Number(indicatorsData.fast1mEMA).toFixed(4) /
        indicatorsData.emaBuyPoint) *
        100 -
        100 >=
      0.4
    ) {
      indicatorsData.isUpTrend = true;
    } else {
      indicatorsData.isUpTrend = false;
    }

    // else if (
    //   (indicatorsData.ema25Prev / Number(indicatorsData.slow1mEMA).toFixed(4)) *
    //     100 -
    //     100 >=
    //   0.4
    // ) {
    //   indicatorsData.emaSellSignal = true;
    //   indicatorsData.emaBuySignal = false;
    // }
    // console.log('Prev: ' + indicatorsData.ema25Prev);
    // indicatorsData.ema25Prev = Number(indicatorsData.slow1mEMA).toFixed(4);
    // console.log('Current: ' + indicatorsData.slow1mEMA);
    console.log(indicatorsData.emaPoints);
    console.log(
      'Curr/ Prev',
      (Number(indicatorsData.fast1mEMA).toFixed(4) /
        indicatorsData.emaPoints[0]) *
        100 -
        100,
    );
  }, 60000);
};

export const getEMASignal = (symbol, timeFrame, indicatorsData) => {
  getEmaStream({
    symbol: symbol,
    interval: timeFrame,
    period: 7,
  }).subscribe(fastEMA => {
    indicatorsData[`fast${timeFrame}EMA`] = fastEMA;
    console.log(fastEMA);
  });

  getEmaStream({
    symbol: symbol,
    interval: timeFrame,
    period: 25,
  }).subscribe(middleEMA => {
    indicatorsData[`middle${timeFrame}EMA`] = middleEMA;
    // console.log(middleEMA);
  });

  getEmaStream({
    symbol: symbol,
    interval: timeFrame,
    period: 99,
  }).subscribe(slowEMA => {
    indicatorsData[`slow${timeFrame}EMA`] = slowEMA;
  });
};
