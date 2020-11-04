// import * as service from './service';
import { getForceIndexStream } from '../../indicators/forceIndex';

export const runEFIInterval = ({ efi }) => {
  setInterval(async () => {
    if (!efi.prevEfi && efi.efi) {
      efi.prevEfi = efi.efi;
      return;
    }

    if (efi.prevEfi > efi.efi) {
      efi.efiSellSignalCount++;
      efi.efiBuySignalCount = 0;
    }
    if (efi.prevEfi < efi.efi) {
      efi.efiBuySignalCount++;
      efi.efiSellSignalCount = 0;
    }

    if (efi.efiBuySignalCount >= 2) {
      efi.efiSignal = 'buy';
    }
    if (efi.efiSellSignalCount >= 2) {
      efi.efiSignal = 'sell';
    }

    // console.log('Curr: ' + efi.efi);
    // console.log('Prev: ' + efi.prevEfi);
    // console.log('Buy signal: ' + efi.efiBuySignalCount);
    // console.log('Sell signal: ' + efi.efiSellSignalCount + '\n');
    // console.log('Curr/Prev: ', (efi.efi / efi.prevEfi) * 100 - 100 + '%');

    efi.prevEfi = efi.efi;
  }, 60000);
};

export const getForceIndexSignal = (
  symbol,
  timeFrame,
  period,
  indicatorsData,
) => {
  getForceIndexStream({
    symbol: symbol,
    interval: timeFrame,
    period: period,
  }).subscribe(forceIndex => {
    if (forceIndex) {
      if (!indicatorsData.efi) {
        indicatorsData.efi.efi = forceIndex;
        return;
      }
      indicatorsData.efi.efi = forceIndex;
      console.log(
        (indicatorsData.efi.efi / indicatorsData.efi.prevEfi) * 100 - 100,
      );
    }
  });
};
