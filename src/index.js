import {bufferCount, pluck} from 'rxjs/operators';
import {getTradeStream} from './trades';
import fs from 'fs';
import moment from 'moment';


let canISell = false,
    buysCounter = 0,
    buyPrice = null,
    totalProfit = 0,
    prevAvPrice = 0,
    prevPrice = 0;


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

const sumPricesReducer = (accumulator, currentValue) => accumulator + Number(currentValue);

let tradeBy10Prices = trade => {
    if (!prevAvPrice) {
        prevAvPrice = trade.reduce(sumPricesReducer, 0) / 10;
        return;
    }
    const currentAvPrice = trade.reduce(sumPricesReducer, 0) / 10;
    if ((currentAvPrice - prevAvPrice >= 4) && !canISell) {
        try {
            buyPrice = Number(trade[trade.length - 1]);
            fs.appendFile(
                'message.txt',
                `Buy: ${buyPrice}; Date:${moment().format('MMMM Do YYYY, h:mm:ss a')}\n`,
                err => {
                    if (err) throw err;
                    console.log('The buy price were appended to file!');
                }
            );
            canISell = true;
            buysCounter++;
            prevAvPrice = currentAvPrice;
        } catch (e) {
            console.error(e);
        } finally {
        }
    }
    if ((prevAvPrice - currentAvPrice >= 4) && canISell && buysCounter !== 0) {
        try {
            const sellPrice = trade[trade.length - 1];
            const profit = sellPrice / buyPrice > 1 ? Number(sellPrice / buyPrice * 100 - 100) - 0.2 : Number(-1 * (100 - sellPrice / buyPrice * 100)) - 0.2;
            totalProfit += profit;
            fs.appendFile('message.txt', `Sell: ${sellPrice}; Date:${moment().format('MMMM Do YYYY, h:mm:ss a')}\nCurrent profit: ${profit}%\nTotal profit: ${totalProfit}%\n\n`, err => {
                if (err) throw err;
                console.log('The sell price were appended to file!');
            });
            canISell = false;
            prevAvPrice = 0;
        } catch (e) {
            console.error(e);
        } finally {
        }

    }
    console.log(...trade);
};
let tradeByCurrAndPrevPrices = trade => {
    if (!prevPrice) {
        prevPrice = trade[0];
        return;
    }
    const currentPrice = trade[0];
    if ((currentPrice - prevPrice >= 5) && !canISell) {
        try {
            buyPrice = Number(trade[0]);
            fs.appendFile(
                'message.txt',
                `Buy: ${buyPrice}; Date:${moment().format('MMMM Do YYYY, h:mm:ss a')}\n`,
                err => {
                    if (err) throw err;
                    console.log('The buy price were appended to file!');
                }
            );
            canISell = true;
            buysCounter++;
            prevAvPrice = currentAvPrice;
        } catch (e) {
            console.error(e);
        } finally {
        }
    }
    if ((prevPrice - currentPrice >= 5) && canISell && buysCounter !== 0) {
        try {
            const sellPrice = trade[0];
            const profit = sellPrice / buyPrice > 1 ? Number(sellPrice / buyPrice * 100 - 100) - 0.2 : Number(-1 * (100 - sellPrice / buyPrice * 100)) - 0.2;
            totalProfit += profit;
            fs.appendFile('message.txt', `Sell: ${sellPrice}; Date:${moment().format('MMMM Do YYYY, h:mm:ss a')}\nCurrent profit: ${profit}%\nTotal profit: ${totalProfit}%\n\n`, err => {
                if (err) throw err;
                console.log('The sell price were appended to file!');
            });
            canISell = false;
            prevPrice = 0;
        } catch (e) {
            console.error(e);
        } finally {
        }

    }
    console.log(...trade);
};


getTradeStream({
    symbol: SYMBOLS.BTCUSDT,
    resource: RESOURCES.TRADE,
})
    .pipe(pluck('price'), bufferCount(1, 1))
    .subscribe(tradeByCurrAndPrevPrices);
