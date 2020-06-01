import { Observable } from 'rxjs';
import { bufferCount, map } from 'rxjs/operators';

import { getRsiAlertStream } from '../../indicators/rsi';

import { BUY, STOP_BUY, SELL, STOP_SELL, IDLE } from '../signals';
import { Signal } from '../types';

import { RsiSignalConfig, RsiAlert, RsiSignal } from './types';
import { Trend } from './Trend';

export function makeRsiSignalStream(
  rsiSignalConfig?: RsiSignalConfig,
): Observable<RsiSignal> {
  return getRsiAlertStream(rsiSignalConfig).pipe(
    bufferCount(2, 1),
    map(getRsiSignal),
  );
}

function getRsiSignal(alerts: RsiAlert[]): RsiSignal {
  const [previous, latest] = alerts;
  const trend = latest.rsi > previous.rsi ? Trend.Ascending : Trend.Descending;

  if (previous.overbought !== latest.overbought && trend === Trend.Ascending) {
    return {
      signal: SELL,
      rsi: latest.rsi,
    };
  }

  if (previous.overbought !== latest.overbought && trend === Trend.Descending) {
    return {
      signal: STOP_SELL,
      rsi: latest.rsi,
    };
  }

  if (previous.oversold !== latest.oversold && trend === Trend.Descending) {
    return {
      signal: BUY,
      rsi: latest.rsi,
    };
  }

  if (previous.oversold !== latest.oversold && trend === Trend.Ascending) {
    return {
      signal: STOP_BUY,
      rsi: latest.rsi,
    };
  }

  return {
    signal: IDLE,
    rsi: latest.rsi,
  };
}
