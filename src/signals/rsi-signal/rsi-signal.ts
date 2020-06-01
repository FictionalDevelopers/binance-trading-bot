import { Observable } from 'rxjs';
import { bufferCount, map } from 'rxjs/operators';

import { getRsiAlertStream } from '../../indicators/rsi';

import { BUY, STOP_BUY, SELL, STOP_SELL, IDLE } from '../signals';
import { Signal, Action } from '../types';

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
  const meta = { rsi: latest.rsi };

  if (previous.overbought !== latest.overbought && trend === Trend.Ascending) {
    return buildRsiSignal(SELL, meta);
  }

  if (previous.overbought !== latest.overbought && trend === Trend.Descending) {
    return buildRsiSignal(STOP_SELL, meta);
  }

  if (previous.oversold !== latest.oversold && trend === Trend.Descending) {
    return buildRsiSignal(BUY, meta);
  }

  if (previous.oversold !== latest.oversold && trend === Trend.Ascending) {
    return buildRsiSignal(STOP_BUY, meta);
  }

  return buildRsiSignal(IDLE, meta);
}

function buildRsiSignal(action: Action, meta?): Signal {
  return {
    action,
    type: 'RSI',
    meta,
  };
}
