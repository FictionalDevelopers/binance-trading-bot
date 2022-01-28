import last from 'lodash/last';
import { from, Observable, defer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { mfi } from 'trading-indicator';
import { getCandleStreamForInterval } from '../api/candles';
import { INDICATORS_LIST_SYMBOLS } from '../constants';

type MfiStreamConfig = {
  symbol: string;
  interval: string;
  period: number;
};

export function getMfiStream(config: MfiStreamConfig): Observable<number> {
  return getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(() =>
      from(
        mfi(
          config.period,
          'binance',
          INDICATORS_LIST_SYMBOLS[config.symbol],
          config.interval,
          false,
        ),
      ),
    ),
    map(last),
  );
}
