import { getEmaStream } from '../../indicators/ema';
// import { indicatorsData } from '../../index';

export const runEMAInterval = indicatorsData => {
  setInterval(() => {
    if (!indicatorsData.emaStartPoint && indicatorsData.middle15mEMA) {
      indicatorsData.emaStartPoint = Number(
        indicatorsData.middle15mEMA,
      ).toFixed(4);
      return;
    }

    if (
      indicatorsData.emaStartPoint >
      Number(indicatorsData.middle15mEMA).toFixed(4)
    ) {
      indicatorsData.emaStartPoint = Number(
        indicatorsData.middle15mEMA,
      ).toFixed(4);
      indicatorsData.emaSignal = 'sell';
    } else if (
      indicatorsData.emaStartPoint <
      Number(indicatorsData.middle15mEMA).toFixed(4)
    ) {
      indicatorsData.emaSignal = 'buy';
    }
    console.log(
      'Prev / Curr: ',
      (indicatorsData.emaStartPoint /
        Number(indicatorsData.middle15mEMA).toFixed(4)) *
        100,
    );
    console.log('Ema Start Point: ', indicatorsData.emaStartPoint);
    console.log(indicatorsData.middle15mEMA);
  }, 1000);
};

export const getEMASignal = (symbol, timeFrame, indicatorsData) => {
  getEmaStream({
    symbol: symbol,
    interval: timeFrame,
    period: 7,
  }).subscribe(fastEMA => {
    indicatorsData[`fast${timeFrame}EMA`] = fastEMA;
    // console.log(fastEMA);
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
