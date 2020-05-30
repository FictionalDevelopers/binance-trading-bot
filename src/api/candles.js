import { map, pluck } from 'rxjs/operators';
import { RESOURCES, KEY_MAPPERS } from '../constants';
import mapKeys from '../utils/mapKeys';
import { getTradeStream } from './trades';

export const getCandleStreamForPeriod = (symbol, period) =>
  getTradeStream({
    symbol,
    resource: `${RESOURCES.KLINE}_${period}`,
  }).pipe(pluck('kline'), map(mapKeys(KEY_MAPPERS.KLINE)));
