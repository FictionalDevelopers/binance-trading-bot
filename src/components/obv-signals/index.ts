import { getObvStream } from '../../indicators/obv';
import { sendToRecipients } from '../../services/telegram';

export const runObvInterval = indicatorsData => {
  setInterval(async () => {
    if (!indicatorsData.prevObv && indicatorsData.obv) {
      indicatorsData.prevObv = indicatorsData.obv;
      return;
    }

    if (indicatorsData.prevObv > indicatorsData.obv)
      indicatorsData.obvSellSignalCount++;
    if (indicatorsData.prevObv < indicatorsData.obv)
      indicatorsData.obvBuySignalCount++;

    if (indicatorsData.obvBuySignalCount >= 2) {
      indicatorsData.obvSignal = 'buy';
    }
    if (indicatorsData.obvSellSignalCount >= 2) {
      indicatorsData.obvSignal = 'sell';
    }

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
      indicatorsData.obv = obv;
      console.log(obv);
    }
  });
};
