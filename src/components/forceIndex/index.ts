// import * as service from './service';
import { getForceIndexStream } from '../../indicators/forceIndex';

export const runEFIInterval = efi => {};

export const getForceIndexSignal = (
  symbol,
  timeFrame,
  period,
  efiData,
  doubleSignalConfirmation,
) => {
  getForceIndexStream({
    symbol: symbol,
    interval: timeFrame,
    period: period,
  }).subscribe(efi => {
    if (!efiData.prevEfi) {
      efiData.prevEfi = efi;
      return;
    }
    if (efiData.prevEfi < efi) {
      efiData.efiBuySignalCount++;
      efiData.efiSellSignalCount = 0;
    } else if (efiData.prevEfi > efi) {
      efiData.efiSellSignalCount++;
      efiData.efiBuySignalCount = 0;
    } else {
      if (doubleSignalConfirmation) {
        efiData.efiSellSignalCount = 0;
        efiData.efiBuySignalCount = 0;
      }
    }
    efiData.prevEfi = efi;
  });
};
