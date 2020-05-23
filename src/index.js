import {bufferCount, pluck} from 'rxjs/operators';
import {getTradeStream} from './trades';
import fs from 'fs';


let canISell = false;
let buysCounter = 0;
let buyPrice = null;

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
        if (trade[trade.length - 1] - trade[0] >= 2 && !canISell) {
            buysCounter++;
            buyPrice = trade[trade.length - 1];
            canISell = true;
            fs.appendFile(
                'message.txt',
                `Buy ${trade[trade.length - 1]};\n`,
                err => {
                    if (err) throw err;
                    console.log('The buy price were appended to file!');
                }
            );
        }
        if (trade[0] - trade[trade.length - 1] >= 2 && canISell) {
            if (buysCounter !== 0) {
                canISell = false;
                const profit = trade[0] / buyPrice * 100 > 100 ? trade[0] / buyPrice * 100 - 100 : -1 * (100 - trade[0] / buyPrice * 100);
                fs.appendFile('message.txt', `Sell ${trade[0]};\nProfit ${profit}%\n`, err => {
                    if (err) throw err;
                    console.log('The sell price were appended to file!');
                });
            }
        }
        console.log(trade);
    });
