import { ROC } from 'technicalindicators';
import { from, Observable } from 'rxjs';
import { last } from 'lodash';
import _map from 'lodash/map';
import { map, pluck, switchMap } from 'rxjs/operators';
import { getCandleStreamForInterval, getCandlesList } from '../api/candles';

type RocStreamConfig = {
  symbol: string;
  interval: string;
  period: number;
};

export const getRocStream = (config: RocStreamConfig): Observable<number> =>
  getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(_ => from(getCandlesList(config))),
    map(
      candles =>
        new ROC({
          values: _map(candles, 'close').map(value => Number(value)),
          period: config.period,
        }),
    ),
    pluck('result'),
    map(last),
  );
