import * as service from './service';
import { getStochRsiStream } from '../../indicators/stochRSI';
import _throttle from 'lodash/throttle';

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
  buySignalCount,
  sellSignalCount,
) => {
  getStochRsiStream({
    symbol: symbol,
    interval: timeFrame,
  }).subscribe(stochRsi => {
    stochRsiData.data = stochRsi;

    if (
      Number(stochRsi.k) - Number(stochRsi.d) >= buySens ||
      Number(stochRsi.k).toFixed() >= Number(100)
    ) {
      stochRsiData.buySignalCount++;
      stochRsiData.sellSignalCount = 0;
    } else if (
      Number(stochRsi.d) - Number(stochRsi.k) >= sellSens ||
      Number(stochRsi.k).toFixed() <= Number(0)
    ) {
      stochRsiData.sellSignalCount++;
      stochRsiData.buySignalCount = 0;
    }
    if (stochRsiData.buySignalCount >= buySignalCount)
      stochRsiData.signal = 'buy';
    else if (stochRsiData.sellSignalCount >= sellSignalCount)
      stochRsiData.signal = 'sell';

    stochRsiData.value = stochRsi.k;
    // console.log(stochRsiData.value);
    // console.log(`StochRSI:${JSON.stringify(stochRsi)}`);
    // console.log(`Signal: ${indicatorsData.stochRsiSignal}`);
    // console.log(`Diff: ${Number(stochRsi.k) - Number(stochRsi.d)} \n`);
  });
};

export { service };
