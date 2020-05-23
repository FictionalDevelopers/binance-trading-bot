import WebSocket from 'ws';
import { fromEvent } from 'rxjs';
import { pluck, map, catchError } from 'rxjs/operators';

const ROOT_URI = 'wss://stream.binance.com:9443/ws';

export function getTradeStream({ symbol, resource }) {
    const ws = new WebSocket(`${ROOT_URI}/${symbol}@${resource}`);

    return fromEvent(ws, 'message').pipe(
        pluck('data'),
        map(JSON.parse),
        catchError(err => {
            console.log('ERORR');
            console.log(err);
        })
    );
}
