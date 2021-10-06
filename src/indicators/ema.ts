import last from 'lodash/last';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ema } from 'trading-indicator';
import { getCandleStreamForInterval } from '../api/candles';
import { INDICATORS_LIST_SYMBOLS } from '../constants';

type EMAStreamConfig = {
  symbol: string;
  interval: string;
  period: number;
  exchange?: string;
  inputSource?: 'open' | 'high' | 'low' | 'close';
};

export function getEmaStream(config: EMAStreamConfig): Observable<number> {
  const { inputSource = 'close', exchange = 'binance' } = config;

  return getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(() =>
      from(
        ema(
          config.period,
          inputSource,
          exchange,
          INDICATORS_LIST_SYMBOLS[config.symbol],
          config.interval,
        ),
      ),
    ),
    map(last),
  );
}
