import { bufferCount, pluck } from 'rxjs/operators';
import { getTradeStream } from './trades';
import fs from 'fs';

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
        if (trade[trade.length - 1] - trade[0] >= 2) {
            fs.appendFile(
                'message.txt',
                `Buy ${trade[trade.length - 1]};\n`,
                err => {
                    if (err) throw err;
                    console.log('The buy price were appended to file!');
                }
            );
        }
        if (trade[0] - trade[trade.length - 1] >= 2) {
            fs.appendFile('message.txt', `Sell ${trade[0]};\n`, err => {
                if (err) throw err;
                console.log('The sell price were appended to file!');
            });
        }
        console.log(trade);
    });
