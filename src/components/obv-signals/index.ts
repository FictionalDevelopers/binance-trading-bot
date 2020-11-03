import { getObvStream } from '../../indicators/obv';

export const getObvSignal = (symbol, timeFrame, indicatorsData) => {
  getObvStream({
    symbol: symbol,
    interval: timeFrame,
  }).subscribe(obv => {
    if (obv) {
      if (!indicatorsData.obv) {
        indicatorsData.obv = obv;
        return;
      }
      if (indicatorsData.obv < obv) indicatorsData.obvSignal = 'buy';
      if (indicatorsData.obv > obv) indicatorsData.obvSignal = 'sell';
      indicatorsData.obv = obv;
      console.log(obv);
    }
  });
};
