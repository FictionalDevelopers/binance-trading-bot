import { ATR } from 'technicalindicators';
import { from, Observable } from 'rxjs';
import { last } from 'lodash';
import _map from 'lodash/map';
import { map, pluck, switchMap } from 'rxjs/operators';
import { getCandleStreamForInterval, getCandlesList } from '../api/candles';

type ATRStreamConfig = {
  symbol: string;
  interval: string;
  period: number;
};

export const getATRStream = (config: ATRStreamConfig): Observable<number> =>
  getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(_ => from(getCandlesList(config))),
    map(
      candles =>
        new ATR({
          close: _map(candles, 'close').map(value => Number(value)),
          high: _map(candles, 'high').map(value => Number(value)),
          low: _map(candles, 'low').map(value => Number(value)),
          period: config.period,
        }),
    ),
    pluck('result'),
    map(last),
  );
