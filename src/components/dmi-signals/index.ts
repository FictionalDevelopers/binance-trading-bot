import { getDmiStream } from '../../indicators/dmi';

export const getDMISignal = (symbol, timeFrame, indicatorsData) => {
  getDmiStream({
    symbol: symbol,
    interval: timeFrame,
    period: 14,
  }).subscribe(dmi => {
    if (!indicatorsData.prevDmi) {
      indicatorsData.prevDmi = dmi;
      indicatorsData.prevDiff =
        Number(dmi.pdi).toPrecision(4) / Number(dmi.mdi).toPrecision(4);
      return;
    }
    indicatorsData.adx = dmi.adx;
    // if ((dmi.adx / dmi.pdi) * 100 - 100 >= 2.5) indicatorsData.adxSignal = -1;
    // if ((dmi.pdi / dmi.adx) * 100 - 100 >= 2.5) indicatorsData.adxSignal = 1;
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
    if (indicatorsData.adxSellSignalVolume > 0)
      indicatorsData.willPriceGrow = false;
    // console.log(dmi.adx);
    if ((dmi.adx / indicatorsData.prevDmi.adx) * 100 - 100 >= 0.5)
      indicatorsData.adxSignal = 'buy';
    if ((indicatorsData.prevDmi.adx / dmi.adx) * 100 - 100 >= 0.5)
      indicatorsData.adxSignal = 'sell';
    if (
      (Number(dmi.pdi).toPrecision(4) /
        Number(dmi.mdi).toPrecision(4) /
        indicatorsData.prevDiff) *
        100 -
        100 >=
      0.5
    ) {
      indicatorsData.signal = 'BUY';
      indicatorsData.buySignalCount++;
      indicatorsData.sellSignalCount = 0;
      console.log('BUY ' + indicatorsData.buySignalCount);
      console.log(
        'Value: ' +
          Number(dmi.pdi).toPrecision(4) / Number(dmi.mdi).toPrecision(4) +
          '\n',
      );
      if (indicatorsData.buySignalCount > 0) indicatorsData.signal = 'BUY';
    } else if (
      (Number(dmi.pdi).toPrecision(4) /
        Number(dmi.mdi).toPrecision(4) /
        indicatorsData.prevDiff) *
        100 -
        100 <=
      -0.25
    ) {
      indicatorsData.signal = 'SELL';
      indicatorsData.sellSignalCount++;
      indicatorsData.buySignalCount = 0;
      console.log('SELL ' + indicatorsData.sellSignalCount);
      console.log(
        'Value: ' +
          Number(dmi.pdi).toPrecision(4) / Number(dmi.mdi).toPrecision(4) +
          '\n',
      );
      if (indicatorsData.sellSignalCount > 0) indicatorsData.signal = 'SELL';
    }

    console.log(
      'PDI/MDI Diff: ' +
        ((Number(dmi.pdi).toPrecision(4) /
          Number(dmi.mdi).toPrecision(4) /
          indicatorsData.prevDiff) *
          100 -
          100) +
        '%',
    );
    console.log(
      'ADX Diff: ' +
        ((Number(dmi.adx).toPrecision(4) /
          Number(indicatorsData.prevDmi.adx).toPrecision(4)) *
          100 -
          100) +
        '%' +
        '\n',
    );
    indicatorsData.prevDmi = dmi;
    indicatorsData.prevDiff =
      Number(dmi.pdi).toPrecision(4) / Number(dmi.mdi).toPrecision(4);
  });
};
