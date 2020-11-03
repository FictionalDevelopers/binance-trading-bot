import { getObvStream } from '../../indicators/obv';

export const getObvSignal = (symbol, timeFrame, indicatorsData) => {
  getObvStream({
    symbol: symbol,
    interval: timeFrame,
  }).subscribe(obv => {
    if (!indicatorsData.obv) {
      indicatorsData.obv = obv;
      return;
    }
    if (indicatorsData.obv < obv) console.log('BUY');
    if (indicatorsData.obv > obv) console.log('SELL');
    indicatorsData.obv = obv;
    console.log(obv);
  });
};
