import { Observable } from 'rxjs';
import { bufferCount, map } from 'rxjs/operators';

import { getRsiStream } from '../../indicators/rsi';
import { BUY, IDLE, SELL } from '../signals';
import { Action, Signal } from '../types';

import { RsiSignal, RsiToolConfig, RsiPair } from './types';

export function makeRsiToolStream(
  rsiToolConfig?: RsiToolConfig,
): Observable<RsiSignal> {
  return getRsiStream({
    interval: rsiToolConfig.interval,
    period: rsiToolConfig.period,
    symbol: rsiToolConfig.symbol,
    exchange: rsiToolConfig.exchange,
  }).pipe(
    bufferCount(2, 1),
    map(
      (rsi: number[]): RsiPair => {
        const [previous, latest] = rsi;

        return { previous, latest };
      },
    ),
    map(
      getRsiSignal({
        overbought: rsiToolConfig.overboughtThresholds,
        oversold: rsiToolConfig.oversoldThresholds,
      }),
    ),
  );
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
