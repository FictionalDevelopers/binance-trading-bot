import last from 'lodash/last';
import { from, Observable, defer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { macd } from 'trading-indicator';
import { getCandleStreamForInterval } from '../api/candles';
import { INDICATORS_LIST_SYMBOLS } from '../constants';

type macdStreamConfig = {
  symbol: string;
  interval: string;
};

export function getMACDStream(config: macdStreamConfig): Observable<number> {
  return getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(() =>
      from(
        macd(
          12,
          26,
          9,
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
