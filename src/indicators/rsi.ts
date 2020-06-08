import last from 'lodash/last';
import { from, Observable, defer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { rsi } from 'trading-indicator';
import { getCandleStreamForInterval } from '../api/candles';
import { RSI_LIST_SYMBOLS } from '../constants';

type RsiStreamConfig = {
  symbol: string;
  interval: string;
  period: number;
  exchange?: string;
  inputSource?: 'open' | 'high' | 'low' | 'close';
};

export function getRsiStream(config: RsiStreamConfig): Observable<number> {
  const { inputSource = 'close', exchange = 'binance' } = config;

  return getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(() =>
      from(
        rsi(
          config.period,
          inputSource,
          exchange,
          RSI_LIST_SYMBOLS[config.symbol],
          config.interval,
        ),
      ),
    ),
    map(last),
  );
}
