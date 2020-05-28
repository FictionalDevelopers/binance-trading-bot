import fs from 'fs';
import { format } from 'date-fns';
import { bufferCount, pluck, map } from 'rxjs/operators';
import last from 'lodash/last';

import { getTradeStream } from '../api/trades';
import binance from '../api/init';
import { SYMBOLS, RESOURCES } from '../constants';
import getAverage from '../utils/getAverage';

let canISell = false;
let buysCounter = 0;
let totalProfit = 0;
let prevAvPrice = 0;
let buyPrice = null;
let trendSignal = false;
let prevVolume = null;

const tradeBy20Prices = prices => {
  const currentAvPrice = getAverage(prices);
  const lastPrice = last(prices);
  if (!prevAvPrice) {
    prevAvPrice = currentAvPrice;
    console.log('No prev price found');
    return;
  }
  if (currentAvPrice - prevAvPrice >= 3 && !canISell && trendSignal) {
    try {
      buyPrice = lastPrice;
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
        lastPrice / buyPrice > 1
          ? Number((lastPrice / buyPrice) * 100 - 100)
          : Number(-1 * (100 - (lastPrice / buyPrice) * 100));
      totalProfit += profit;
      fs.appendFile(
        'message.txt',
        `Sell: ${lastPrice}; Date:${format(
          new Date(),
          'MMMM Do yyyy, h:mm:ss a',
        )}\nCurrent profit: ${profit}%\nTotal profit: ${totalProfit}%\n\n`,
        err => {
          if (err) throw err;
          console.log('Sold by ' + lastPrice);
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
    .pipe(pluck('price'), map(Number), bufferCount(20, 20))
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
