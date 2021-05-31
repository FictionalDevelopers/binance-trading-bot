import { HeikinAshi } from 'technicalindicators';
import { from, Observable } from 'rxjs';
import { last } from 'lodash';
import _map from 'lodash/map';
import { map, pluck, switchMap } from 'rxjs/operators';
import { getCandleStreamForInterval, getCandlesList } from '../api/candles';

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

(async function() {
  await getHeikinAshiStream({ symbol: 'linkusdt', interval: '1m' }).subscribe(
    data => console.log('data', data) || data,
  );
})();
