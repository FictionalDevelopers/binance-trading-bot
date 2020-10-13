import { getEmaStream } from '../../indicators/ema';
import indicatorsData from '../indicators-data';
import botState from '../botState';
// import { indicatorsData } from '../../index';

export const runEMAInterval = (indicatorsData, botState) => {
  setInterval(() => {
    console.log(JSON.stringify(botState), '\n');
    console.log(JSON.stringify(indicatorsData), '\n');
    if (!botState.emaStartPoint && indicatorsData.slow1mEMA) {
      botState.emaStartPoint = Number(indicatorsData.slow1mEMA).toFixed(4);
      return;
    }

    if (
      Number(botState.emaStartPoint) >
      +Number(indicatorsData.slow1mEMA).toFixed(4)
    ) {
      botState.emaStartPoint = Number(indicatorsData.slow1mEMA).toFixed(4);
      indicatorsData.emaSignal = 'sell';
    } else if (
      Number(botState.emaStartPoint) <=
      +Number(indicatorsData.slow1mEMA).toFixed(4)
    ) {
      indicatorsData.emaSignal = 'buy';
    }
    console.log(
      'Start Point / Curr: ',
      (botState.emaStartPoint / +Number(indicatorsData.slow1mEMA).toFixed(4)) *
        100,
    );
    console.log('Ema Start Point: ', botState.emaStartPoint);
    console.log('Current: ', indicatorsData.slow1mEMA);
  }, 60000);
};

export const getEMASignal = (symbol, timeFrame, indicatorsData) => {
  getEmaStream({
    symbol: symbol,
    interval: timeFrame,
    period: 7,
  }).subscribe(fastEMA => {
    indicatorsData[`fast${timeFrame}EMA`] = fastEMA;
    if (
      Number(
        (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 - 100,
      ) >= 0.1
    ) {
      botState.rebuy = true;
    }

    if (
      Number(
        (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
      ) >= 0.1
    ) {
      botState.rebuy = false;
    }
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
