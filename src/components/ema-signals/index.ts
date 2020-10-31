import { getEmaStream } from '../../indicators/ema';
import indicatorsData from '../indicators-data';
import botState from '../botState';
import { sendToRecipients } from '../../services/telegram';
// import { indicatorsData } from '../../index';

export const runEMAInterval = (indicatorsData, botState) => {
  setInterval(async () => {
    // console.log(JSON.stringify(botState), '\n');
    // console.log(JSON.stringify(indicatorsData), '\n');
    if (!botState.emaStartPoint && indicatorsData.slow1mEMA) {
      botState.emaStartPoint = Number(indicatorsData.slow1mEMA).toFixed(4);
      return;
    }

    if (
      Number(botState.emaStartPoint) >
      +Number(indicatorsData.slow1mEMA).toFixed(4)
    ) {
      botState.emaStartPoint = Number(indicatorsData.slow1mEMA).toFixed(4);
      if (indicatorsData.emaSignal === 'buy') await sendToRecipients(`DOWN`);
      indicatorsData.emaSignal = 'sell';
    } else if (
      Number(botState.emaStartPoint) <=
      +Number(indicatorsData.slow1mEMA).toFixed(4)
    ) {
      if (indicatorsData.emaSignal === 'sell') await sendToRecipients(`UP`);
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
        (indicatorsData.fast15mEMA / indicatorsData.middle15mEMA) * 100 - 100,
      ) >= 0.1
    ) {
      if (!indicatorsData.priceGrowArea) indicatorsData.priceGrowArea = true;
    }

    if (
      Number(
        (indicatorsData.middle15mEMA / indicatorsData.fast15mEMA) * 100 - 100,
      ) >= 0.05
    ) {
      if (indicatorsData.priceGrowArea) indicatorsData.priceGrowArea = false;
    }
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
