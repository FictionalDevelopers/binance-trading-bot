import { CCI } from 'technicalindicators';
import { from, Observable } from 'rxjs';
import { last } from 'lodash';
import _map from 'lodash/map';
import { map, pluck, switchMap } from 'rxjs/operators';
import { getCandleStreamForInterval, getCandlesList } from '../api/candles';

type CCIStreamConfig = {
  symbol: string;
  interval: string;
  period: number;
};

export const getCCIStream = (config: CCIStreamConfig): Observable<number> =>
  getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(_ => from(getCandlesList(config))),
    map(
      candles =>
        new CCI({
          close: _map(candles, 'close').map(value => Number(value)),
          high: _map(candles, 'high').map(value => Number(value)),
          low: _map(candles, 'low').map(value => Number(value)),
          period: config.period,
        }),
    ),
    pluck('result'),
    map(last),
  );
