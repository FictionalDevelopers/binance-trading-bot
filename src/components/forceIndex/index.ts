// import * as service from './service';
import { getForceIndexStream } from '../../indicators/forceIndex';

export const runEFIInterval = ({ efi }) => {
  setInterval(async () => {
    if (!efi.prevAv && efi.av) {
      efi.prevAv = efi.av;
      return;
    }

    if (efi.prevAv > efi.av) {
      efi.efiSellSignalCount++;
      efi.efiBuySignalCount = 0;
      efi.efiSignal = 'sell';
    }
    if (efi.prevAv < efi.av) {
      efi.efiBuySignalCount++;
      efi.efiSellSignalCount = 0;
      efi.efiSignal = 'buy';
    }

    // if (efi.efiBuySignalCount >= 2) {
    //   efi.efiSignal = 'buy';
    // }
    // if (efi.efiSellSignalCount >= 2) {
    //   efi.efiSignal = 'sell';
    // }

    // console.log('Curr: ' + efi.efi);
    // console.log('Prev: ' + efi.prevEfi);
    // console.log('Buy signal: ' + efi.efiBuySignalCount);
    // console.log('Sell signal: ' + efi.efiSellSignalCount + '\n');
    // console.log('Curr/Prev: ', (efi.efi / efi.prevEfi) * 100 - 100 + '%');
    console.log('Av: ' + efi.av);
    console.log('Prev av: ' + efi.prevAv + '\n');

    efi.prevAv = efi.av;
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
      // console.log(
      //   (indicatorsData.efi.efi / indicatorsData.efi.prevEfi) * 100 - 100,
      // );
      // console.log(forceIndex);
    }
  });
};
