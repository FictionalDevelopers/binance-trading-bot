import { bufferCount, pluck } from 'rxjs/operators';
import { getTradeStream } from './api/trades';
import { SYMBOLS, RESOURCES } from './constants';
import { getBalances } from './api/balance';

getBalances('USDT').then(res => {
    console.log('res', res);
});

getTradeStream({
    symbol: SYMBOLS.BTCUSDT,
    resource: RESOURCES.TRADE,
})
    .pipe(pluck('price'), bufferCount(10, 1))
    .subscribe(trade => {
        console.log(trade);
    });
