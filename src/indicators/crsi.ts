import { CCI } from 'technicalindicators';
import { from, Observable } from 'rxjs';
import { last } from 'lodash';
import _map from 'lodash/map';
import * as dataForge from 'data-forge';
import 'data-forge-fs'; // Add file system functions to Data-Forge.
import 'data-forge-plot'; // Add chart plotting functions to Data-Forge.
import 'data-forge-indicators'; // Add financial indicator functions to Data-Forge.
import { map, pluck, switchMap, bufferCount } from 'rxjs/operators';
import {
  getCandleStreamForInterval,
  getCandlesList,
  getLastClosedCandles,
} from '../api/candles';
import { cRSI as CRSI } from '@debut/indicators';
import Binance from 'node-binance-api';
const binance = new Binance();

type CRSIStreamConfig = {
  symbol: string;
  interval: string;
};

// export const getCRSIStream = (config: CRSIStreamConfig) =>
//   getCandleStreamForInterval(config.symbol, config.interval)
//     .pipe(bufferCount(1, 1))
//     .subscribe(async candle => {
//       const klines = await getLastClosedCandles({
//         symbol: config.symbol,
//         interval: config.interval,
//       });
//       const mergedKlines = [
//         ...klines,
//         { ...candle[0], close: candle[0].closePrice },
//       ].map(({ close }, ind, arr) => {
//         arr[ind].close = +Number(close).toPrecision(4);
//         return arr[ind];
//       });
//       console.log(mergedKlines.map(({ close }) => close));
//       const inputSeries = new dataForge.DataFrame(mergedKlines);
//       const crsi = inputSeries.deflate(row => +row.close).sma(30);
//       // .crsi(3, 2, 100);
//       console.log(crsi.toArray());
//       // console.log(crsi.nextValue(Number(candle[0].closePrice)));
//       // console.log(crsi.momentValue(Number(candle[0].closePrice)));
//     });
const closePrices = [];
const connorsRSIValues = [];

export const getCRSIStream = (config: CRSIStreamConfig, indicatorsData) =>
  getCandleStreamForInterval(config.symbol, config.interval)
    .pipe(bufferCount(1, 1))
    .subscribe(async candle => {
      const klines = await getLastClosedCandles({
        symbol: config.symbol,
        interval: config.interval,
      });
      const crsi = new CRSI(3, 2, 100);

      const mergedKlines = [
        ...klines,
        { ...candle[0], close: candle[0].closePrice },
      ]
        .map(({ close }, ind, arr) => {
          arr[ind].close = +Number(close);
          return arr[ind];
        })
        .map(({ close }) => close);
      mergedKlines.forEach((tick, index) => {
        indicatorsData.values.push({
          index,
          tick,
          moment: crsi.momentValue(tick),
          next: crsi.nextValue(tick),
        });
      });
      indicatorsData.crsi =
        indicatorsData.values[indicatorsData.values.length - 1].moment;
      indicatorsData.values.length = 0;

      // mergedKlines.forEach(item => {
      //   console.log(crsi.nextValue(item));
      // });

      // console.log(mergedKlines.map(({ close }) => close));
      // const inputSeries = new dataForge.DataFrame(mergedKlines);
      // const crsi = inputSeries.deflate(row => +row.close).sma(30);
      // .crsi(3, 2, 100);
      // console.log(crsi.toArray());
      // console.log(crsi.nextValue(Number(candle[0].closePrice)));
      // console.log(crsi.momentValue(Number(candle[0].closePrice)));
    });

export const getCRSIStream2 = (
  config: CRSIStreamConfig,
  // timeframe,
  indicatorsData,
) => {
  const crsi = new CRSI(3, 2, 100);

  binance.websockets.candlesticks(
    config.symbol,
    config.interval,
    candlesticks => {
      const closePrice = parseFloat(candlesticks.k.c);
      closePrices.push(closePrice);

      if (closePrices.length > 14) {
        closePrices.shift(); // Удаляем самый старый элемент
      }

      const crsiValue = crsi.momentValue(closePrice);
      indicatorsData.crsi = crsiValue;
    },
  );
};

//     .pipe(
//   switchMap(_ => from(getCandlesList(config))),
//   // eslint-disable-next-line new-cap
//   map(candles => ({
//     result: new cRSI(3, 2, 100).nextValue(
//       _map(candles, 'close').map(value => Number(value)),
//     ),
//   })),
//   pluck('result'),
//   map(last),
// );

// binance.websockets.candlesticks(symbol, '1m', candlesticks => {
//   const closePrice = parseFloat(candlesticks.k.c);
//   closePrices.push(closePrice);
//
//   if (closePrices.length > period) {
//     closePrices.shift(); // Удаляем самый старый элемент
//   }
//
//   calculateConnorsRSI();
// });
