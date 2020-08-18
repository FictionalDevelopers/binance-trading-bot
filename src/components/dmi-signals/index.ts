import { getDmiStream } from '../../indicators/dmi';

export const getDMISignal = (symbol, timeFrame, indicatorsData) => {
  getDmiStream({
    symbol: symbol,
    interval: timeFrame,
    period: 14,
  }).subscribe(dmi => {
    if (!indicatorsData.prevDmi) {
      indicatorsData.prevDmi = dmi;
      return;
    }
    if (dmi.adx > dmi.pdi) indicatorsData.adxSignal = -1;
    if (dmi.pdi > dmi.adx) indicatorsData.adxSignal = 1;
    if (dmi.mdi > dmi.pdi) {
      if (indicatorsData.trend === 'UP') {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
      indicatorsData.mdiSignal = -1;
      indicatorsData.trend = 'DOWN';
    }
    if (dmi.pdi > dmi.mdi) {
      if (indicatorsData.trend === 'DOWN') {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
      indicatorsData.mdiSignal = 1;
      indicatorsData.trend = 'UP';
    }

    if (indicatorsData.trend === 'DOWN') {
      if (indicatorsData.prevDmi.adx > dmi.adx) {
        indicatorsData.adxBuySignalVolume++;
        indicatorsData.adxSellSignalVolume = 0;
      }
      if (indicatorsData.prevDmi.adx < dmi.adx) {
        indicatorsData.adxSellSignalVolume++;
        indicatorsData.adxBuySignalVolume = 0;
      }
      if (indicatorsData.prevDmi.adx === dmi.adx) {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
    }
    if (indicatorsData.trend === 'UP') {
      if (indicatorsData.prevDmi.adx > dmi.adx) {
        indicatorsData.adxSellSignalVolume++;
        indicatorsData.adxBuySignalVolume = 0;
      }
      if (indicatorsData.prevDmi.adx < dmi.adx) {
        indicatorsData.adxBuySignalVolume++;
        indicatorsData.adxSellSignalVolume = 0;
      }
      if (indicatorsData.prevDmi.adx === dmi.adx) {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
    }
    if (indicatorsData.adxBuySignalVolume >= 2)
      indicatorsData.willPriceGrow = true;
    if (indicatorsData.adxSellSignalVolume >= 2)
      indicatorsData.willPriceGrow = false;
    indicatorsData.prevDmi = dmi;
  });
};
