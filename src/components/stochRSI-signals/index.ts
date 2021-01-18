import * as service from './service';
import { getStochRsiStream } from '../../indicators/stochRSI';

export const runStochRsiInterval = stochRsi => {
  setInterval(async () => {
    if (!stochRsi.prevAv && stochRsi.av) {
      stochRsi.prevAv = stochRsi.av;
      return;
    }

    if (stochRsi.prevAv > stochRsi.av) {
      stochRsi.SellSignalCount++;
      stochRsi.BuySignalCount = 0;
      stochRsi.signal = 'sell';
    }
    if (stochRsi.prevAv < stochRsi.av) {
      stochRsi.BuySignalCount++;
      stochRsi.SellSignalCount = 0;
      stochRsi.signal = 'buy';
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
    console.log('Av: ' + stochRsi.av);
    console.log('Prev av: ' + stochRsi.prevAv + '\n');

    stochRsi.prevAv = stochRsi.av;
  }, 60000);
};

export const getStochRSISignal = (
  symbol,
  timeFrame,
  stochRsiData,
  buySens,
  sellSens,
) => {
  getStochRsiStream({
    symbol: symbol,
    interval: timeFrame,
  }).subscribe(stochRsi => {
    if (Number(stochRsi.k) - Number(stochRsi.d) >= buySens) {
      if (
        stochRsiData.signal === 'sell' ||
        stochRsiData.signal === null ||
        Number(stochRsi.k) === 100
      )
        stochRsiData.signal = 'buy';
    }

    if (Number(stochRsi.d) - Number(stochRsi.k) >= sellSens) {
      if (
        stochRsiData.signal === 'buy' ||
        stochRsiData.signal === null ||
        Number(stochRsi.d) === 100
      )
        stochRsiData.signal = 'sell';
    }
    stochRsiData.value = stochRsi.k;
    // console.log(stochRsiData.value);
    // console.log(`StochRSI:${JSON.stringify(stochRsi)}`);
    // console.log(`Signal: ${indicatorsData.stochRsiSignal}`);
    // console.log(`Diff: ${Number(stochRsi.k) - Number(stochRsi.d)} \n`);
  });
};

export { service };
