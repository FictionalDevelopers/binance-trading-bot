import WebSocket from 'ws';
import { fromEvent } from 'rxjs';
import { pluck, map, catchError } from 'rxjs/operators';
import _mapKeys from 'lodash/fp/mapKeys';

const ROOT_URI = 'wss://stream.binance.com:9443/ws';

const KEY_MAPPER = {
    e: 'eventType',
    E: 'eventTime',
    s: 'symbol',
    a: 'aggregateTradeId',
    p: 'price',
    q: 'quantity',
    f: 'firstTradeId',
    l: 'lastTradeId',
    T: 'tradeTime',
    m: 'isBuyerMarketMaker',
};

export function getTradeStream({ symbol, resource }) {
    const ws = new WebSocket(`${ROOT_URI}/${symbol}@${resource}`);

    return fromEvent(ws, 'message').pipe(
        pluck('data'),
        map(JSON.parse),
        map(_mapKeys(key => KEY_MAPPER[key] || key)),
        catchError(err => {
            console.log('ERORR');
            console.log(err);
        })
    );
}
