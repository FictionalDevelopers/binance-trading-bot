import { getObvStream } from '../../indicators/obv';
import { sendToRecipients } from '../../services/telegram';

export const runObvInterval = indicatorsData => {
  setInterval(async () => {
    if (!indicatorsData.prevObv && indicatorsData.obv) {
      indicatorsData.prevObv = indicatorsData.obv;
      return;
    }

    if (indicatorsData.prevObv > indicatorsData.obv) {
      indicatorsData.obvSellSignalCount++;
      indicatorsData.obvBuySignalCount = 0;
    }
    if (indicatorsData.prevObv < indicatorsData.obv) {
      indicatorsData.obvBuySignalCount++;
      indicatorsData.obvSellSignalCount = 0;
    }

    if (indicatorsData.obvBuySignalCount >= 2) {
      indicatorsData.obvSignal = 'buy';
    }
    if (indicatorsData.obvSellSignalCount >= 2) {
      indicatorsData.obvSignal = 'sell';
    }

    console.log('Curr: ' + indicatorsData.obv);
    console.log('Prev: ' + indicatorsData.prevObv);
    console.log('Buy signal: ' + indicatorsData.obvBuySignalCount);
    console.log('Sell signal: ' + indicatorsData.obvSellSignalCount + '\n');

    indicatorsData.prevObv = indicatorsData.obv;
  }, 60000);
};

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
      // if (indicatorsData.prevObv > obv) console.log('SELL');
      // if (indicatorsData.prevObv < obv) console.log('BUY');
      console.log((obv / indicatorsData.prevObv) * 100 - 100);
      indicatorsData.prevObv = obv;
    }
  });
};
