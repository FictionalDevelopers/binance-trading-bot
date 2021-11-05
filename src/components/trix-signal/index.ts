import { getTrixStream } from '../../indicators/trix';

export const runTrixInterval = trixData => {
  setInterval(async () => {
    if (!trixData.prev && trixData.value) {
      trixData.prev = trixData.value;
      return;
    }

    if (trixData.prev > trixData.value) {
      trixData.sellSignalCount++;
      trixData.buySignalCount = 0;
      // trixData.signal = 'sell';
      // console.log('sell');
    }
    if (trixData.prev < trixData.value) {
      trixData.buySignalCount++;
      trixData.sellSignalCount = 0;
      // trixData.signal = 'buy';
      // console.log('buy');
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
    // console.log('Current: ' + trixData.value);
    // console.log('Prev: ' + trixData.prev + '\n');

    trixData.prev = trixData.value;
  }, 1000);
};

export const getTrixSignal = (symbol, timeFrame, trixData) => {
  getTrixStream({
    symbol: symbol,
    interval: timeFrame,
    period: 6,
  }).subscribe(trix => {
    if (trix) trixData.value = trix;
  });
};
