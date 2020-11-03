import last from 'lodash/last';
import { from, Observable, defer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { obv } from 'trading-indicator';
import { getCandleStreamForInterval } from '../api/candles';
import { INDICATORS_LIST_SYMBOLS } from '../constants';

type ObvStreamConfig = {
  symbol: string;
  interval: string;
};

export function getObvStream(config: ObvStreamConfig): Observable<number> {
  return getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(() =>
      from(
        obv(
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
