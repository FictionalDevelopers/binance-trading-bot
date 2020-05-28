import { bufferCount, pluck } from 'rxjs/operators';
import { getTradeStream } from '../api/trades';
import fs from 'fs';
import { format } from 'date-fns';
import binance from '../api/init';
import { SYMBOLS, RESOURCES } from '../constants';

let canISell = false;
let buysCounter = 0;
let totalProfit = 0;
let prevAvPrice = 0;
let buyPrice = null;
let trendSignal = false;
let prevVolume = null;

const sumPricesReducer = (accumulator, currentValue) =>
  accumulator + Number(currentValue);

const tradeBy20Prices = trade => {
  const pricesArrLength = trade.length;
  const currentAvPrice = trade.reduce(sumPricesReducer, 0) / pricesArrLength;
  if (!prevAvPrice) {
    prevAvPrice = currentAvPrice;
    console.log('No prev price found');
    return;
  }
  if (currentAvPrice - prevAvPrice >= 3 && !canISell && trendSignal) {
    try {
      buyPrice = Number(trade[trade.length - 1]);
      fs.appendFile(
        'message.txt',
        `Buy: ${buyPrice}; Date:${format(
          new Date(),
          'MMMM Do yyyy, h:mm:ss a',
        )}\n`,
        err => {
          if (err) throw err;
          console.log('Bought by ' + buyPrice);
        },
      );
      canISell = true;
      trendSignal = false;
      buysCounter++;
    } catch (e) {
      console.error(e);
    }
  }
  if (
    prevAvPrice - currentAvPrice >= 3 &&
    canISell &&
    buysCounter !== 0 &&
    trendSignal
  ) {
    try {
      const profit =
        trade[trade.length - 1] / buyPrice > 1
          ? Number((trade[trade.length - 1] / buyPrice) * 100 - 100)
          : Number(-1 * (100 - (trade[trade.length - 1] / buyPrice) * 100));
      totalProfit += profit;
      fs.appendFile(
        'message.txt',
        `Sell: ${trade[trade.length - 1]}; Date:${format(
          new Date(),
          'MMMM Do yyyy, h:mm:ss a',
        )}\nCurrent profit: ${profit}%\nTotal profit: ${totalProfit}%\n\n`,
        err => {
          if (err) throw err;
          console.log('Sold by ' + trade[trade.length - 1]);
        },
      );
      canISell = false;
      trendSignal = false;
    } catch (e) {
      console.error(e);
    }
  }
  prevAvPrice = currentAvPrice;
};

try {
  fs.appendFile(
    'message.txt',
    `--------------------------------------------\nBot started working at: ${format(
      new Date(),
      'MMMM Do yyyy, h:mm:ss a',
    )}\n--------------------------------------------\n`,
    () => ({}),
  );
  getTradeStream({
    symbol: SYMBOLS.BTCUSDT,
    resource: RESOURCES.TRADE,
  })
    .pipe(pluck('price'), bufferCount(20, 20))
    .subscribe(tradeBy20Prices);

  binance.websockets.chart(
    SYMBOLS.BTCUSDT.toUpperCase(),
    '1m',
    (symbol, interval, chart) => {
      const tick = binance.last(chart);
      if (!prevVolume) {
        prevVolume = chart[tick].volume;
        return;
      }
      const currentVolume = chart[tick].volume;
      if (currentVolume - prevVolume >= 4) trendSignal = true;

      // console.info(chart);
      // Optionally convert 'chart' object to array:
      //  let ohlc = binance.ohlc(chart);
      //  console.info(symbol, ohlc[ohls.]);
      // if (currentVolume - prevVolume >= 0) console.log(currentVolume - prevVolume);
      // console.log('Current volume: ' + currentVolume);
      // console.log('Prev volume: ' + prevVolume);
      prevVolume = currentVolume;
    },
  );
} catch (e) {
  console.error(e);
}
