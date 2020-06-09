import WebSocket from 'ws';
import { fromEvent } from 'rxjs';
import { pluck, map } from 'rxjs/operators';

import { KEY_MAPPERS } from '../constants';

import mapKeys from '../utils/mapKeys';

const ROOT_URI = 'wss://stream.binance.com:9443/ws';

export function getTradeStream({ symbol, resource }) {
  const ws = new WebSocket(`${ROOT_URI}/${symbol}@${resource}`);

  return fromEvent(ws, 'message').pipe(
    pluck('data'),
    map(JSON.parse),
    map(mapKeys(KEY_MAPPERS.COMMON)),
  );
}
