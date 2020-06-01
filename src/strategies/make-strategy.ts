import { combineLatest, Observable } from 'rxjs';
import { map, pluck } from 'rxjs/operators';

import { BUY, SELL, IDLE } from '../signals/signals';
import { Signal } from '../signals/types';

export function makeStrategy(
  signalStreams: Observable<Signal>[] = [],
): Observable<Signal> {
  return combineLatest(...signalStreams).pipe(
    map(signals => signals.map(({ signal }) => signal)),
    map((signals: Array<typeof BUY | typeof SELL>) => {
      console.log('SIGNALS', signals);

      if (signals.every(signal => signal === BUY)) {
        return { signal: BUY };
      }

      if (signals.every(signal => signal === SELL)) {
        return { signal: SELL };
      }

      return { signal: IDLE };
    }),
  );
}
