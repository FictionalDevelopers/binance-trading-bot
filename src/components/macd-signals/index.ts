import { getMACDStream } from '../../indicators/macd';
import _throttle from 'lodash/throttle';

export const getMACDSignal = (symbol, timeFrame, indicatorsData) => {
  getMACDStream({
    symbol: symbol,
    interval: timeFrame,
  }).subscribe(macd => {
    if (!indicatorsData.prevHistogram) {
      indicatorsData.prevHistogram = macd.histogram;
      return;
    }
    if (indicatorsData.prevHistogram > macd.histogram) {
      indicatorsData.sellSignalCount++;
      indicatorsData.buySignalCount = 0;
    } else if (indicatorsData.prevHistogram < macd.histogram) {
      indicatorsData.buySignalCount++;
      indicatorsData.sellSignalCount = 0;
    }
    indicatorsData.prevHistogram = macd.histogram;
  });
};
