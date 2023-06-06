import { getATRStream } from '../../indicators/atr';

export const getATRSignal = (symbol, timeframe, period, indicatorsData) => {
  getATRStream({ symbol, interval: timeframe, period }).subscribe(atr => {
    if (atr) {
      if (!indicatorsData.prevAtr) {
        indicatorsData.prevAtr = atr;
        return;
      }

      if (indicatorsData.prevAtr > atr) {
        indicatorsData.buySignalCount = 0;
        indicatorsData.sellSignalCount++;
      } else if (indicatorsData.prevAtr < atr) {
        indicatorsData.sellSignalCount = 0;
        indicatorsData.buySignalCount++;
      } else if (indicatorsData.prevAtr === atr) {
        // indicatorsData.sellSignalCount = 0;
        // indicatorsData.buySignalCount = 0;
        // indicatorsData.signal = null;
      }

      indicatorsData.prevAtr = atr;
    }
  });
};
