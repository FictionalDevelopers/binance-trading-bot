import { combineLatest, merge, Observable } from 'rxjs';
import { map, distinctUntilKeyChanged } from 'rxjs/operators';

import { BUY, IDLE, SELL } from '../tools/signals';
import { Action, Signal } from '../tools/types';

type StrategySignal = Signal & {
  signals: Signal[];
};

export function makeStrategy(tools: {
  buyTools: Observable<Signal>[];
  sellTools: Observable<Signal>[];
}): Observable<StrategySignal> {
  const buyToolsSignals$ = combineLatest(...tools.buyTools).pipe(
    map((signals: Signal[]) => {
      if (signals.every(({ action }) => action === BUY)) {
        return buildStrategySignal(BUY, signals);
      }

      return buildStrategySignal(IDLE, signals);
    }),
  );

  const sellToolsSignals$ = combineLatest(...tools.sellTools).pipe(
    map((signals: Signal[]) => {
      if (signals.every(({ action }) => action === SELL)) {
        return buildStrategySignal(SELL, signals);
      }

      return buildStrategySignal(IDLE, signals);
    }),
  );

  return merge(buyToolsSignals$, sellToolsSignals$).pipe(
    distinctUntilKeyChanged('action'),
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
