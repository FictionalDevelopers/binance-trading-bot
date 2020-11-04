import { ForceIndex } from 'technicalindicators';
import { from, Observable } from 'rxjs';
import { last } from 'lodash';
import _map from 'lodash/map';
import { map, pluck, switchMap } from 'rxjs/operators';
import { getCandleStreamForInterval, getCandlesList } from '../api/candles';

type ForceIndexStreamConfig = {
  symbol: string;
  interval: string;
  period: number;
};

export const getForceIndexStream = (
  config: ForceIndexStreamConfig,
): Observable<number> =>
  getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(_ => from(getCandlesList(config))),
    map(
      candles =>
        new ForceIndex({
          close: _map(candles, 'close'),
          volume: _map(candles, 'volume'),
          period: config.period,
        }),
    ),
    pluck('result'),
    map(last),
  );
