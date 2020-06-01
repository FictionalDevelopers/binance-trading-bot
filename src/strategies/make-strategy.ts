import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BUY, SELL, IDLE } from '../signals/signals';
import { Signal, Action } from '../signals/types';

type StrategySignal = Signal & {
  signals: Signal[];
};

export function makeStrategy(
  signalStreams: Observable<Signal>[] = [],
): Observable<StrategySignal> {
  return combineLatest(...signalStreams).pipe(
    map((signals: Signal[]) => {
      if (signals.every(({ action }) => action === BUY)) {
        return buildStrategySignal(BUY, signals);
      }

      if (signals.every(({ action }) => action === SELL)) {
        return buildStrategySignal(SELL, signals);
      }

      return buildStrategySignal(IDLE, signals);
    }),
  );
}

function buildStrategySignal(
  action: Action,
  signals: Signal[],
): StrategySignal {
  return {
    action,
    type: 'STRATEGY',
    signals,
    meta: {},
  };
}
