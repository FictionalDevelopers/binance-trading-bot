import { HeikinAshi } from 'technicalindicators';
import { from, Observable } from 'rxjs';
import { last } from 'lodash';
import _map from 'lodash/map';
import { map, pluck, switchMap } from 'rxjs/operators';
import { getCandleStreamForInterval, getCandlesList } from '../api/candles';
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

    if (haData.buySignalCount >= buySignalCount) haData.signal = 'buy';
    else if (haData.sellSignalCount >= sellSignalCount) haData.signal = 'sell';
  });
};
