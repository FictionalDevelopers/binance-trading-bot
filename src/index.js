import { bufferCount, pluck } from 'rxjs/operators';
import { getTradeStream } from './trades';

const SYMBOLS = {
    BTCUSDT: 'btcusdt',
    BNBUSDT: 'bnbusdt',
    BNBBTC: 'bnbbtc',
};

const RESOURCES = {
    TRADE: 'trade',
    AGG_TRADE: 'aggTrade',
    TICKER: 'ticker',
    KLINE: 'kline',
};

getTradeStream({
    symbol: SYMBOLS.BTCUSDT,
    resource: RESOURCES.TRADE,
})
    .pipe(pluck('price'), bufferCount(10, 1))
    .subscribe(trade => {
        console.log(trade);
    });
