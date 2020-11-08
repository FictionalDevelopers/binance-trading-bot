import { TRIX } from 'technicalindicators';
import { from, Observable } from 'rxjs';
import { last } from 'lodash';
import _map from 'lodash/map';
import { map, pluck, switchMap } from 'rxjs/operators';
import { getCandleStreamForInterval, getCandlesList } from '../api/candles';

type TrixStreamConfig = {
  symbol: string;
  interval: string;
  period: number;
};

export const getTrixStream = (config: TrixStreamConfig): Observable<number> =>
  getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(_ => from(getCandlesList(config))),
    map(
      candles =>
        new TRIX({
          values: _map(candles, 'close'),
          period: config.period,
        }),
    ),
    pluck('result'),
    map(last),
  );
