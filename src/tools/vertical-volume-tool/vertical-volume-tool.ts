import { isNil } from 'lodash';
import { combineLatest, Observable } from 'rxjs';
import { filter, map, scan } from 'rxjs/operators';

import {
  CandleDetails,
  CandleListConfig,
  getClosedCandlesStream,
  getLiveDetailsCandleStream,
  PreviousClosedCandles,
} from '../../api/candles';
import { getPercentageDifference } from '../../utils/percentageDifference';
import { Action, Signal } from '../types';
import { BUY, IDLE, SELL } from '../signals';

type VerticalVolumeSignalOptions = {
  minimalPercentageIncrease: number;
  minimalLatestCandleVolume?: number;
};

function isCandlePriceDropped(candle: CandleDetails): boolean {
  return candle.openPrice > candle.closePrice;
}

function getStartingAction(
  previousCandles: PreviousClosedCandles,
  options: VerticalVolumeSignalOptions,
): Action {
  const [oneBeforeLatestCandle, latestClosedCandle] = previousCandles;

  if (
    !isNil(options.minimalLatestCandleVolume) &&
    latestClosedCandle.volume < options.minimalLatestCandleVolume
  ) {
    return IDLE;
  }

  const isVolumeIncreased =
    latestClosedCandle.volume > oneBeforeLatestCandle.volume;

  if (!isVolumeIncreased) {
    return IDLE;
  }

  const percentageDifference = getPercentageDifference(
    oneBeforeLatestCandle.volume,
    latestClosedCandle.volume,
  );

  if (percentageDifference < options.minimalPercentageIncrease) {
    return IDLE;
  }

  const isPriceDropped = isCandlePriceDropped(latestClosedCandle);

  return isPriceDropped ? BUY : SELL;
}

function getPotentialAction(options: VerticalVolumeSignalOptions) {
  return (
    previousAction: Action,
    closedCandles: PreviousClosedCandles,
  ): Action => {
    if (previousAction === IDLE) {
      return getStartingAction(closedCandles, options);
    }

    const [, latestClosedCandle] = closedCandles;
    const isPriceDropped = isCandlePriceDropped(latestClosedCandle);

    if (previousAction === BUY && !isPriceDropped) {
      return IDLE;
    }

    if (previousAction === SELL && isPriceDropped) {
      return IDLE;
    }

    return previousAction;
  };
}

export function makeVerticalVolumeToolStream(
  candleConfig: CandleListConfig,
  options: VerticalVolumeSignalOptions,
): Observable<Signal> {
  const closedCandles$ = getClosedCandlesStream(candleConfig, {
    closedCandlesNumber: 2,
  });

  const potentialAction$ = closedCandles$.pipe(
    scan(getPotentialAction(options), IDLE),
  );

  const liveCandle$ = getLiveDetailsCandleStream(candleConfig);

  return combineLatest(potentialAction$, liveCandle$).pipe(
    filter(([, liveCandle]) => !liveCandle.isClosed),
    filter(([potentialAction]) => potentialAction !== IDLE),
    filter(([, liveCandle]) => {
      const totalTime = liveCandle.closeTime - liveCandle.openTime;
      const elapsed = Date.now() - liveCandle.openTime;

      return elapsed > totalTime * 0.25; // @TODO think over this
    }),
    filter(([potentialAction, liveCandle]) => {
      const isPriceDropping = isCandlePriceDropped(liveCandle);

      return (
        (potentialAction === SELL && isPriceDropping) ||
        (potentialAction === BUY && !isPriceDropping)
      );
    }),
    map(([potentialAction, liveCandle]) => {
      return buildSignal(potentialAction, {
        liveCandle,
      });
    }),
  );
}

const TYPE = 'VERTICAL_VOLUME';

function buildSignal(action: Action, meta = {}): Signal {
  return {
    action,
    type: TYPE,
    meta: meta,
  };
}
