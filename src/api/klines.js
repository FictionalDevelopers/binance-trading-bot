import { map, pluck } from 'rxjs/operators';

import { SYMBOLS, RESOURCES, KEY_MAPPERS } from '../constants';
import mapKeys from '../utils/mapKeys';

import { getTradeStream } from './trades';

export const getKlineForPeriod = period =>
  getTradeStream({
    symbol: SYMBOLS.BTCUSDT,
    resource: `${RESOURCES.KLINE}_${period}`,
  }).pipe(pluck('kline'), map(mapKeys(KEY_MAPPERS.KLINE)));
