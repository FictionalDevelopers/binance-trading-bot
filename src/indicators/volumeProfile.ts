import last from 'lodash/last';
import { from, Observable, defer } from 'rxjs';
import _map from 'lodash/map';
import { map, switchMap, pluck } from 'rxjs/operators';
import { VolumeProfile } from 'technicalindicators';
import { getCandlesList, getCandleStreamForInterval } from '../api/candles';
import { INDICATORS_LIST_SYMBOLS } from '../constants';

type VolumeProfileStreamConfig = {
  symbol: string;
  interval: string;
  pricesRangeCount: number;
  barsCount: number;
};

export function getVolumeProfileStream(
  config: VolumeProfileStreamConfig,
): Observable<number> {
  return getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(_ => from(getCandlesList(config, { limit: config.barsCount }))),
    map(
      candles =>
        new VolumeProfile({
          high: _map(candles, 'high').map(value => Number(value)),
          open: _map(candles, 'open').map(value => Number(value)),
          low: _map(candles, 'low').map(value => Number(value)),
          close: _map(candles, 'close').map(value => Number(value)),
          volume: _map(candles, 'volume').map(value => Number(value)),
          noOfBars: config.pricesRangeCount,
        }),
    ),
    pluck('result'),
    // map(last),
  );
}
