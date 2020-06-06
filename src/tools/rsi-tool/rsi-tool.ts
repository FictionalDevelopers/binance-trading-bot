import { Observable } from 'rxjs';
import { bufferCount, map } from 'rxjs/operators';

import { BUY, IDLE, SELL } from '../signals';
import { Action, Signal } from '../types';

import { RsiPair, RsiSignal } from './types';

export function transformRsiToSignal(thresholds: {
  overbought: number[];
  oversold: number[];
}) {
  return (source: Observable<number>): Observable<RsiSignal> =>
    new Observable<RsiSignal>(observer => {
      return source
        .pipe(
          bufferCount(2, 1),
          map(
            (rsi: number[]): RsiPair => {
              const [previous, latest] = rsi;

              return { previous, latest };
            },
          ),
          map(getRsiSignal(thresholds)),
        )
        .subscribe({
          error(err) {
            observer.error(err);
          },
          complete() {
            observer.complete();
          },
          next(value) {
            observer.next(value);
          },
        });
    });
}

function getRsiSignal(thresholds: {
  overbought: number[];
  oversold: number[];
}) {
  return (rsi: RsiPair): RsiSignal => {
    const meta = { rsi };

    if (shouldSell(rsi, thresholds.overbought)) {
      return buildRsiSignal(SELL, meta);
    }

    if (shouldBuy(rsi, thresholds.oversold)) {
      return buildRsiSignal(BUY, meta);
    }

    return buildRsiSignal(IDLE, meta);
  };
}

function shouldSell(rsi: RsiPair, overboughtThresholds: number[]): boolean {
  return overboughtThresholds.some(
    threshold =>
      rsi.previous > rsi.latest &&
      rsi.previous >= threshold &&
      threshold >= rsi.latest,
  );
}

function shouldBuy(rsi: RsiPair, oversoldThresholds: number[]): boolean {
  return oversoldThresholds.some(
    threshold =>
      rsi.previous < rsi.latest &&
      rsi.previous <= threshold &&
      threshold <= rsi.latest,
  );
}

function buildRsiSignal(action: Action, meta?): Signal {
  return {
    action,
    type: 'RSI',
    meta,
  };
}
