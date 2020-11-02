import last from 'lodash/last';
import { from, Observable, defer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { forceIndex } from 'trading-indicator';
import { getCandleStreamForInterval } from '../api/candles';
import { INDICATORS_LIST_SYMBOLS } from '../constants';

type forceIndexStreamConfig = {
  symbol: string;
  interval: string;
};

export function getForceIndexStream(
  config: forceIndexStreamConfig,
): Observable<number> {
  return getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(() =>
      from(
        forceIndex(
          25,
          13,
          'close',
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
