import { isNil } from 'lodash';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  CandleListConfig,
  getClosedLiveCandlesPairStream,
} from '../../api/candles';
import { getPercentageDifference } from '../../utils/percentageDifference';
import { Action, Signal } from '../types';
import { BUY, IDLE, SELL } from '../signals';

type VerticalVolumeSignalOptions = {
  minimalPercentageIncrease: number;
  minimalLatestCandleVolume?: number;
};

export function makeVerticalVolumeSignal(
  candleConfig: CandleListConfig,
  options: VerticalVolumeSignalOptions,
): Observable<Signal> {
  const closedLiveCandlePair$ = getClosedLiveCandlesPairStream(candleConfig, {
    closedCandlesNumber: 2,
  });

  return closedLiveCandlePair$.pipe(
    map(([previousCandles, currentCandle]) => {
      const [oneBeforeLatestCandle, latestClosedCandle] = previousCandles;

      if (
        !isNil(options.minimalLatestCandleVolume) &&
        latestClosedCandle.volume < options.minimalLatestCandleVolume
      ) {
        return buildSignal(IDLE);
      }

      const isVolumeIncreased =
        latestClosedCandle.volume > oneBeforeLatestCandle.volume;

      if (!isVolumeIncreased) {
        return buildSignal(IDLE);
      }

      const percentageDifference = getPercentageDifference(
        oneBeforeLatestCandle.volume,
        latestClosedCandle.volume,
      );

      if (percentageDifference < options.minimalPercentageIncrease) {
        return buildSignal(IDLE);
      }

      const isPriceDropped =
        latestClosedCandle.openPrice > latestClosedCandle.closePrice;

      return buildSignal(isPriceDropped ? BUY : SELL, {
        oneBeforeLatestCandle,
        latestClosedCandle,
        currentCandle,
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
