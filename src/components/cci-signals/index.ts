import { getCCIStream } from '../../indicators/cci';

export const getCCISignal = (symbol, timeframe, indicatorsData) => {
  getCCIStream({ symbol, interval: timeframe, period: 5 }).subscribe(cci => {
    if (!cci) return;
    if (cci > 100) {
      indicatorsData.buySignalCount++;
      indicatorsData.sellSignalCount = 0;
      indicatorsData.downSignalCount = 0;
      indicatorsData.upSignalCount = 0;
    } else if (cci < -100) {
      indicatorsData.sellSignalCount++;
      indicatorsData.buySignalCount = 0;
      indicatorsData.downSignalCount = 0;
      indicatorsData.upSignalCount = 0;
    } else {
      if (cci < 100 && cci > 0) {
        indicatorsData.downSignalCount++;
        indicatorsData.upSignalCount = 0;
      } else if (cci > -100 && cci < 0) {
        indicatorsData.downSignalCount = 0;
        indicatorsData.upSignalCount++;
      }
      indicatorsData.sellSignalCount = 0;
      indicatorsData.buySignalCount = 0;
    }
    indicatorsData.cci = cci;
  });
};
