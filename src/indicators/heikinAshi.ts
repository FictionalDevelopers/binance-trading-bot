import { HeikinAshi } from 'technicalindicators';
import { from, Observable } from 'rxjs';
import { last } from 'lodash';
import _map from 'lodash/map';
import { map, pluck, switchMap } from 'rxjs/operators';
import {
  getCandleStreamForInterval,
  getCandlesList,
  getLastClosedCandles,
} from '../api/candles';
import { getForceIndexStream } from './forceIndex';

type HeikinAshiStreamConfig = {
  symbol: string;
  interval: string;
};

export const getHeikinAshiStream = (
  config: HeikinAshiStreamConfig,
): Observable<object> =>
  getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(_ => from(getCandlesList(config))),
    map(
      candles =>
        new HeikinAshi({
          low: _map(candles, candle => Number(candle.low)),
          open: _map(candles, candle => Number(candle.open)),
          high: _map(candles, candle => Number(candle.high)),
          close: _map(candles, candle => Number(candle.close)),
          volume: _map(candles, 'volume'),
          timestamp: _map(candles, 'time'),
        }),
    ),
    pluck('result'),
    map(item => ({
      open: last(item.open),
      close: last(item.close),
      low: last(item.low),
      high: last(item.high),
    })),
  );

export const getHeikinAshiStreamForTheLastCandles = (
  config: HeikinAshiStreamConfig,
): Observable<object> =>
  getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(_ => from(getLastClosedCandles(config))),
    map(
      candles =>
        new HeikinAshi({
          low: _map(candles, candle => Number(candle.low)),
          open: _map(candles, candle => Number(candle.open)),
          high: _map(candles, candle => Number(candle.high)),
          close: _map(candles, candle => Number(candle.close)),
          volume: _map(candles, 'volume'),
          timestamp: _map(candles, 'time'),
        }),
    ),
    pluck('result'),
    // map(item => ({
    //   open: last(item.open),
    //   close: last(item.close),
    //   low: last(item.low),
    //   high: last(item.high),
    // })),
  );

export const getHeikinAshiSignal = (
  symbol,
  interval,
  buySignalCount,
  sellSignalCount,
  haData,
) => {
  getHeikinAshiStream({
    symbol,
    interval,
  }).subscribe(haCandle => {
    const { open, close, high, low } = haCandle;
    haData.open = open;
    haData.close = close;
    haData.high = high;
    haData.low = low;

    if (close > open) {
      haData.buySignalCount++;
      haData.sellSignalCount = 0;
    } else if (close < open) {
      haData.sellSignalCount++;
      haData.buySignalCount = 0;
    }
    if (haData.open === haData.low) haData.shadowSignal = 'buy';
    else if (haData.open === haData.high) haData.shadowSignal = 'sell';

    if (haData.buySignalCount >= buySignalCount) haData.signal = 'buy';
    else if (haData.sellSignalCount >= sellSignalCount) haData.signal = 'sell';
  });
};
export const getHeikinAshiSignalForTheLastCandles = (
  symbol,
  interval,
  buySignalCount,
  sellSignalCount,
  haData,
) => {
  getHeikinAshiStreamForTheLastCandles({
    symbol,
    interval,
  }).subscribe(haCandle => {
    haData.prevCandle.open = haCandle.open[haCandle.open.length - 2];
    haData.prevCandle.close = haCandle.close[haCandle.close.length - 2];
    haData.prevCandle.high = haCandle.high[haCandle.high.length - 2];
    haData.prevCandle.low = haCandle.low[haCandle.low.length - 2];

    haData.currentCandle.open = haCandle.open[haCandle.open.length - 1];
    haData.currentCandle.close = haCandle.close[haCandle.close.length - 1];
    haData.currentCandle.high = haCandle.high[haCandle.high.length - 1];
    haData.currentCandle.low = haCandle.low[haCandle.low.length - 1];

    if (
      haData.prevCandle.open === haData.prevCandle.low &&
      haData.prevCandle.close > haData.prevCandle.open
    )
      haData.prevCandle.signal === 'buy';
    else if (
      haData.prevCandle.open === haData.prevCandle.high &&
      haData.prevCandle.close < haData.prevCandle.open
    )
      haData.prevCandle.signal === 'sell';
    // console.log(haCandle.close[haCandle.close.length - 1]);
    // console.log(haCandle.close[haCandle.close.length - 2]);
    // const { open, close, high, low } = haCandle;
    // haData.open = open;
    // haData.close = close;
    // haData.high = high;
    // haData.low = low;
    //
    if (haData.currentCandle.close > haData.currentCandle.open) {
      haData.buySignalCount++;
      haData.sellSignalCount = 0;
    } else if (haData.currentCandle.close < haData.currentCandle.open) {
      haData.sellSignalCount++;
      haData.buySignalCount = 0;
    }
    // if (haData.open === haData.low) haData.shadowSignal = 'buy';
    // else if (haData.open === haData.high) haData.shadowSignal = 'sell';
    //
    if (haData.buySignalCount >= buySignalCount) haData.signal = 'buy';
    else if (haData.sellSignalCount >= sellSignalCount) haData.signal = 'sell';
  });
};
