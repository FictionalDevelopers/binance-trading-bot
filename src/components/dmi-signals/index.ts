import { getDmiStream } from '../../indicators/dmi';

export const getDMISignal = (symbol, timeFrame, indicatorsData) => {
  getDmiStream({
    symbol: symbol,
    interval: timeFrame,
    period: 14,
  }).subscribe(dmi => {
    if (!indicatorsData.prev1mDmi) {
      indicatorsData.prev1mDmi = dmi;
      return;
    }
    if (dmi.adx > dmi.pdi) indicatorsData.adx1mSignal = -1;
    if (dmi.pdi > dmi.adx) indicatorsData.adx1mSignal = 1;
    if (dmi.mdi > dmi.pdi) {
      if (indicatorsData.trend === 'UP') {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
      indicatorsData.mdi1mSignal = -1;
      indicatorsData.trend = 'DOWN';
    }
    if (dmi.pdi > dmi.mdi) {
      if (indicatorsData.trend === 'DOWN') {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
      indicatorsData.mdi1mSignal = 1;
      indicatorsData.trend = 'UP';
    }

    if (indicatorsData.trend === 'DOWN') {
      if (indicatorsData.prev1mDmi.adx > dmi.adx) {
        indicatorsData.adxBuySignalVolume++;
        indicatorsData.adxSellSignalVolume = 0;
      }
      if (indicatorsData.prev1mDmi.adx < dmi.adx) {
        indicatorsData.adxSellSignalVolume++;
        indicatorsData.adxBuySignalVolume = 0;
      }
      if (indicatorsData.prev1mDmi.adx === dmi.adx) {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
    }
    if (indicatorsData.trend === 'UP') {
      if (indicatorsData.prev1mDmi.adx > dmi.adx) {
        indicatorsData.adxSellSignalVolume++;
        indicatorsData.adxBuySignalVolume = 0;
      }
      if (indicatorsData.prev1mDmi.adx < dmi.adx) {
        indicatorsData.adxBuySignalVolume++;
        indicatorsData.adxSellSignalVolume = 0;
      }
      if (indicatorsData.prev1mDmi.adx === dmi.adx) {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
    }
    if (indicatorsData.adxBuySignalVolume > 0)
      indicatorsData.willPriceGrow = true;
    if (indicatorsData.adxSellSignalVolume > 0)
      indicatorsData.willPriceGrow = false;
    indicatorsData.prev1mDmi = dmi;
  });
};
