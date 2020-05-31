import { bufferCount, pluck } from 'rxjs/operators';
import { getTradeStream } from '../api/trades';
import fs from 'fs';
import { format } from 'date-fns';
import binance from '../api/init';
import { SYMBOLS, RESOURCES } from '../constants';
import {getDmiAlertStream} from "../indicators/dmi";

let canISell = false;
let buysCounter = 0;
let totalProfit = 0;
let prevAvPrice = 0;
let buyPrice = null;
let vertVolumeSignal = false;
let dmiSignal = null;
let prevVolume = null;
let prevDmi = null;

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
  if (currentAvPrice - prevAvPrice >= 3 && !canISell && vertVolumeSignal) {
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
      vertVolumeSignal = false;
      buysCounter++;
    } catch (e) {
      console.error(e);
    }
  }
  if (
    prevAvPrice - currentAvPrice >= 3 &&
    canISell &&
    buysCounter !== 0 &&
    vertVolumeSignal
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
      vertVolumeSignal = false;
    } catch (e) {
      console.error(e);
    }
  }
  prevAvPrice = currentAvPrice;
};

const tradeByCurrAndPrevPrices = trade => {
  const currentPrice = Number(trade[1]);
  const prevPrice = Number(trade[0]);
  if (currentPrice - prevPrice >= 1 && !canISell) {
    try {
      fs.appendFile(
        'message.txt',
        `Buy: ${currentPrice}; Date:${format(
          new Date(),
          'MMMM Do yyyy, h:mm:ss a',
        )}\n`,
        err => {
          if (err) throw err;
          console.log('The buy price were appended to file!');
        },
      );
      buyPrice = currentPrice;
      canISell = true;
      buysCounter++;
    } catch (e) {
      console.error(e);
    } finally {
    }
  }
  if (prevPrice - currentPrice >= 1 && canISell && buysCounter !== 0) {
    try {
      const profit =
        currentPrice / buyPrice > 1
          ? Number((currentPrice / buyPrice) * 100 - 100) - 0.2
          : Number(-1 * (100 - (currentPrice / buyPrice) * 100)) - 0.2;
      totalProfit += profit;
      fs.appendFile(
        'message.txt',
        `Sell: ${currentPrice}; Date:${format(
          new Date(),
          'MMMM Do yyyy, h:mm:ss a',
        )}\nCurrent profit: ${profit}%\nTotal profit: ${totalProfit}%\n\n`,
        err => {
          if (err) throw err;
          console.log('The sell price were appended to file!');
        },
      );
      canISell = false;
      console.log('Current price: ' + currentPrice);
      console.log('Prev price: ' + prevPrice);
    } catch (e) {
      console.error(e);
    }
  }
};

const tradeByDMI = trade => {
    const currentPrice = Number(trade[1]);
    if (dmiSignal == 1 && !canISell) {
        try {
            fs.appendFile(
                'message.txt',
                `Buy: ${currentPrice}; Date:${format(
                    new Date(),
                    'MMMM dd yyyy, h:mm:ss a',
                )}\n`,
                err => {
                    if (err) throw err;
                    console.log('The buy price were appended to file!');
                },
            );
            buyPrice = currentPrice;
            canISell = true;
            buysCounter++;
        } catch (e) {
            console.error(e);
        } finally {
        }
    }
    if (dmiSignal == -1 && canISell && buysCounter !== 0) {
        try {
            const profit =
                currentPrice / buyPrice > 1
                    ? Number((currentPrice / buyPrice) * 100 - 100)
                    : Number(-1 * (100 - (currentPrice / buyPrice) * 100));
            totalProfit += profit;
            fs.appendFile(
                'message.txt',
                `Sell: ${currentPrice}; Date:${format(
                    new Date(),
                    'MMMM dd yyyy, h:mm:ss a',
                )}\nCurrent profit: ${profit}%\nTotal profit: ${totalProfit}%\n\n`,
                err => {
                    if (err) throw err;
                    console.log('The sell price were appended to file!');
                },
            );
            canISell = false;
            // console.log('Current price: ' + currentPrice);
            // console.log('Prev price: ' + prevPrice);
        } catch (e) {
            console.error(e);
        }
    }
};

process.env.UV_THREADPOOL_SIZE=256;

try {
  fs.appendFile(
    '1m_dmi_trade_history.txt',
    `--------------------------------------------\nBot started working at: ${format(
      new Date(),
      'MMMM Do yyyy, h:mm:ss a',
    )} with 1m interval\n--------------------------------------------\n`,
    () => ({}),
  );
  getTradeStream({
    symbol: SYMBOLS.BTCUSDT,
    resource: RESOURCES.TRADE,
  })
    .pipe(pluck('price'), bufferCount(2, 2))
    .subscribe(tradeByDMI);
  //
  // binance.websockets.chart(
  //   SYMBOLS.BTCUSDT.toUpperCase(),
  //   '1m',
  //   (symbol, interval, chart) => {
  //     const tick = binance.last(chart);
  //     if (!prevVolume) {
  //       prevVolume = chart[tick].volume;
  //       return;
  //     }
  //     const currentVolume = chart[tick].volume;
  //     if (currentVolume - prevVolume >= 4) vertVolumeSignal = true;
  //
  //     // console.info(chart);
  //     // Optionally convert 'chart' object to array:
  //     //  let ohlc = binance.ohlc(chart);
  //     //  console.info(symbol, ohlc[ohls.]);
  //     // if (currentVolume - prevVolume >= 0) console.log(currentVolume - prevVolume);
  //     // console.log('Current volume: ' + currentVolume);
  //     // console.log('Prev volume: ' + prevVolume);
  //     prevVolume = currentVolume;
  //   },
  // );
    getDmiAlertStream({
        period: 14,
        symbol: SYMBOLS.BTCUSDT,
        interval: '1m'

    }).subscribe(dmi => {
        if (!prevDmi) {
            prevDmi = dmi;
            return;
        }
        if ((dmi.pdi >= dmi.adx) && (prevDmi.pdi < dmi.adx)) {
            dmiSignal = 1;
            console.log('Prev dmi:'+ JSON.stringify(prevDmi));
            console.log('Curr dmi:'+ JSON.stringify(dmi));
        }
        if ((dmi.pdi <= dmi.adx) && (prevDmi.pdi > dmi.adx)) {
            dmiSignal = -1;
            console.log('Prev dmi:'+ JSON.stringify(prevDmi));
            console.log('Curr dmi:'+ JSON.stringify(dmi));
        }

        prevDmi = dmi;
    });

} catch (e) {
  console.error(e);
}

