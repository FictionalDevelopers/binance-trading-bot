const WebSocket = require('ws');
const { fromEvent } = require('rxjs');
const { pluck, map, catchError } = require('rxjs/operators');

const ROOT_URI = 'wss://stream.binance.com:9443/ws';

function getTradeStream({ symbol, resource }) {
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

module.exports = getTradeStream;
