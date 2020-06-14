import { ADX } from 'technicalindicators';
import { from, Observable } from 'rxjs';
import { last } from 'lodash';
import _map from 'lodash/map';
import { map, pluck, switchMap } from 'rxjs/operators';
import { getCandleStreamForInterval, getCandlesList } from '../api/candles';

type DmiStreamConfig = {
  symbol: string;
  interval: string;
  period: number;
};

export const getDmiStream = (config: DmiStreamConfig): Observable<number> =>
  getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(_ => from(getCandlesList(config))),
    map(
      candles =>
        new ADX({
          close: _map(candles, 'close'),
          high: _map(candles, 'high'),
          low: _map(candles, 'low'),
          period: config.period,
        }),
    ),
    pluck('result'),
    map(last),
  );
