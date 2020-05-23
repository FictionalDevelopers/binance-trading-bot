import {bufferCount, pluck} from 'rxjs/operators';
import {getTradeStream} from './trades';
import fs from 'fs';
import moment from 'moment';


let canISell = false,
    buysCounter = 0,
    buyPrice = null,
    totalProfit = 0;

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
        if (trade[trade.length - 1] - trade[0] >= 5 && !canISell) {
            buysCounter++;
            buyPrice = trade[trade.length - 1];
            canISell = true;
            fs.appendFile(
                'message.txt',
                `Buy: ${trade[trade.length - 1]}; Date:${moment().format('MMMM Do YYYY, h:mm:ss a')}\n`,
                err => {
                    if (err) throw err;
                    console.log('The buy price were appended to file!');
                }
            );
        }
        if (trade[0] - trade[trade.length - 1] >= 5 && canISell) {
            if (buysCounter !== 0) {
                canISell = false;
                const profit = trade[0] / buyPrice * 100 > 100 ? Number(trade[0] / buyPrice * 100 - 100).toPrecision(3) - 0.2 : Number(-1 * (100 - trade[0] / buyPrice * 100)).toPrecision(3) - 0.2;
                totalProfit += profit;
                fs.appendFile('message.txt', `Sell: ${trade[0]}; Date:${moment().format('MMMM Do YYYY, h:mm:ss a')}\nCurrent profit: ${profit}%\nTotal profit: ${totalProfit}%\n\n`, err => {
                    if (err) throw err;
                    console.log('The sell price were appended to file!');
                });
            }
        }
        console.log(trade);
    });
