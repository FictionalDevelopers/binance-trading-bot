import {bufferCount, pluck} from 'rxjs/operators';
import {getTradeStream} from './trades';
import fs from 'fs';
import moment from 'moment';
import Binance from 'node-binance-api';

const binance = new Binance();


let canISell = false,
    buysCounter = 0,
    totalProfit = 0,
    prevAvPrice = 0,
    buyPrice = null,
    trendSignal = false,
    prevVolume = null;

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

let tradeBy20Prices = trade => {
    const pricesArrLength = trade.length;
    const currentAvPrice = trade.reduce(sumPricesReducer, 0) / pricesArrLength;
    if (!prevAvPrice) {
        prevAvPrice = currentAvPrice;
        console.log('No prev price found');
        return;
    }
    if ((currentAvPrice - prevAvPrice >= 3) && !canISell && trendSignal) {
        try {
            buyPrice = Number(trade[trade.length - 1]);
            fs.appendFile(
                'message.txt',
                `Buy: ${buyPrice}; Date:${moment().format('MMMM Do YYYY, h:mm:ss a')}\n`,
                err => {
                    if (err) throw err;
                    console.log('Bought by ' + buyPrice);
                }
            );
            canISell = true;
            trendSignal = false;
            buysCounter++;
        } catch (e) {
            console.error(e);
        } finally {
        }
    }
    if ((prevAvPrice - currentAvPrice >= 3) && canISell && buysCounter !== 0 && trendSignal) {
        try {
            const profit = trade[trade.length - 1] / buyPrice > 1 ? Number(trade[trade.length - 1] / buyPrice * 100 - 100) : Number(-1 * (100 - trade[trade.length - 1] / buyPrice * 100));
            totalProfit += profit;
            fs.appendFile('message.txt', `Sell: ${trade[trade.length - 1]}; Date:${moment().format('MMMM Do YYYY, h:mm:ss a')}\nCurrent profit: ${profit}%\nTotal profit: ${totalProfit}%\n\n`, err => {
                if (err) throw err;
                console.log('Sold by ' + trade[trade.length - 1]);
            });
            canISell = false;
            trendSignal = false;
        } catch (e) {
            console.error(e);
        } finally {
        }
    }
    prevAvPrice = currentAvPrice;

    // console.log(...trade);
};
let tradeByCurrAndPrevPrices = trade => {
    const currentPrice = Number(trade[1]);
    const prevPrice = Number(trade[0]);
    if ((currentPrice - prevPrice >= 1) && !canISell) {
        try {
            fs.appendFile(
                'message.txt',
                `Buy: ${currentPrice}; Date:${moment().format('MMMM Do YYYY, h:mm:ss a')}\n`,
                err => {
                    if (err) throw err;
                    console.log('The buy price were appended to file!');
                }
            );
            buyPrice = currentPrice;
            canISell = true;
            buysCounter++;
        } catch (e) {
            console.error(e);
        } finally {
        }
    }
    if ((prevPrice - currentPrice >= 1) && canISell && buysCounter !== 0) {
        try {
            const profit = currentPrice / buyPrice > 1 ? Number(currentPrice / buyPrice * 100 - 100) - 0.2 : Number(-1 * (100 - currentPrice / buyPrice * 100)) - 0.2;
            totalProfit += profit;
            fs.appendFile('message.txt', `Sell: ${currentPrice}; Date:${moment().format('MMMM Do YYYY, h:mm:ss a')}\nCurrent profit: ${profit}%\nTotal profit: ${totalProfit}%\n\n`, err => {
                if (err) throw err;
                console.log('The sell price were appended to file!');
            });
            canISell = false;
            console.log('Current price: ' + currentPrice);
            console.log('Prev price: ' + prevPrice);
        } catch (e) {
            console.error(e);
        } finally {
        }

    }
    // console.log(...trade);
};


try {
    fs.appendFile(
        'message.txt',
        `--------------------------------------------\nBot started working at: ${moment().format('MMMM Do YYYY, h:mm:ss a')}\n--------------------------------------------\n`,
        err => {
        }
    );
    getTradeStream({
        symbol: SYMBOLS.BTCUSDT,
        resource: RESOURCES.TRADE,
    })
        .pipe(pluck('price'), bufferCount(20, 20))
        .subscribe(tradeBy20Prices);

    binance.websockets.chart("BTCUSDT", "1m", (symbol, interval, chart) => {
        let tick = binance.last(chart);
        if (!prevVolume) {
            prevVolume = chart[tick].volume;
            return;
        }
        const currentVolume = chart[tick].volume;
        if (currentVolume - prevVolume >= 3) trendSignal = true;

        // console.info(chart);
        // Optionally convert 'chart' object to array:
        //  let ohlc = binance.ohlc(chart);
        //  console.info(symbol, ohlc[ohls.]);
        // if (currentVolume - prevVolume >= 0) console.log(currentVolume - prevVolume);
        // console.log('Current volume: ' + currentVolume);
        // console.log('Prev volume: ' + prevVolume);
        prevVolume = currentVolume;
    });
    // binance.websockets.depth(['BTCUSDT'], (depth) => {
    //     let {e:eventType, E:eventTime, s:symbol, u:updateId, b:bidDepth, a:askDepth} = depth;
    //     console.info(symbol+" market depth update");
    //     console.info(askDepth);
    // });
    ;

} catch (e) {
    console.error(e);
}

