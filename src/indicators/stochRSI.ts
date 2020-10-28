import last from 'lodash/last';
import { from, Observable, defer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { stochasticRSI } from 'trading-indicator';
import { getCandleStreamForInterval } from '../api/candles';
import { INDICATORS_LIST_SYMBOLS } from '../constants';

type stochRsiStreamConfig = {
  symbol: string;
  interval: string;
};

export function getStochRsiStream(
  config: stochRsiStreamConfig,
): Observable<number> {
  return getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(() =>
      from(
        stochasticRSI(
          3,
          3,
          14,
          14,
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
