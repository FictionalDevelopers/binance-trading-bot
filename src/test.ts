import { bufferCount, pluck } from 'rxjs/operators';
import { getPricesStream } from '../api/trades';
import fs from 'fs';
import { format } from 'date-fns';
import { SYMBOLS, RESOURCES } from '../constants';
import { getDmiAlertStream } from '../indicators/dmi';
import { getRsiAlertStream } from '../indicators/rsi';

let a;
let canISell = false;
let buysCounter = 0;
let totalProfit = 0;
let prevProfit = 0;
const prevAvPrice = 0;
let buyPrice = null;
const vertVolumeSignal = false;
const dmiSignal = null;
const prevVolume = null;
let prevDmi = null;
// let complexSignal = null;
let dmiMdiSignal = 0;
let dmiAdxSignal = 0;
let rsiSignal = false;
// let rebuy = false;
let currentPrice = null;
let profit = 0;

const tradeActions = {
  buyByMarketPrice: (signal, output) => {
    try {
      fs.appendFile(
        output,
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
      // rebuy = false;
      buysCounter++;
    } catch (e) {
      console.error(e);
    } finally {
    }
  },
  sellByMarketPrice: (signal, output) => {
    // || (canISell && profit <= -0.1)

    try {
      totalProfit += profit;
      prevProfit = profit;
      fs.appendFile(
        output,
        `Sell: ${currentPrice}; Date:${format(
          new Date(),
          'MMMM dd yyyy, h:mm:ss a',
        )}\nCurrent profit: ${profit}%\nTotal profit: ${totalProfit}%\n\n`,
        err => {
          if (err) throw err;
          console.log('The sell price were appended to file!');
        },
      );
      // rebuy = true;
      canISell = false;
      // dmiAdxSignal = 0;
      // dmiMdiSignal = 0;
      // rsiSignal = false;
      // console.log('Current price: ' + currentPrice);
      // console.log('Prev price: ' + prevPrice);
    } catch (e) {
      console.error(e);
    }
  },
};

const sumPricesReducer = (accumulator, currentValue) =>
  accumulator + Number(currentValue);

const dmiTradeStrategy = pricesStream => {
  // const pricesArrLength = trade.length;
  currentPrice = Number(pricesStream[pricesStream.length - 1]);
  // const currentAvPrice = trade.reduce(sumPricesReducer, 0) / pricesArrLength;
  profit = buyPrice
    ? currentPrice / buyPrice > 1
      ? Number((currentPrice / buyPrice) * 100 - 100)
      : Number(-1 * (100 - (currentPrice / buyPrice) * 100))
    : 0;
  // if (!prevAvPrice) {
  //   prevAvPrice = currentAvPrice;
  //   console.log('No prev price found');
  //   return;
  // }

  if (
    dmiAdxSignal + dmiMdiSignal === 2 &&
    !canISell &&
    rsiSignal
    // currentAvPrice - prevAvPrice >= 3)
    // ||
    // rebuy
  ) {
    tradeActions.buyByMarketPrice(null, '1m_dmi_trade_history.txt');
  }
  if (
    dmiAdxSignal === -1 &&
    !rsiSignal &&
    canISell &&
    buysCounter !== 0
    // rsiSignal &&
    // profit >= 1
  ) {
    // || (canISell && profit <= -0.1)
    tradeActions.sellByMarketPrice(null, '1m_dmi_trade_history.txt');
  }
  // if (
  //   !rsiSignal &&
  //   canISell
  //   // currentAvPrice - prevAvPrice <= 3
  //   // profit <= -0.3
  // ) {
  //   try {
  //     totalProfit += profit;
  //     prevProfit = profit;
  //     fs.appendFile(
  //       '1m_dmi_trade_history.txt',
  //       `Sell: ${currentPrice}; Date:${format(
  //         new Date(),
  //         'MMMM dd yyyy, h:mm:ss a',
  //       )}\nCurrent profit: ${profit}%\nTotal profit: ${totalProfit}%\n\n`,
  //       err => {
  //         if (err) throw err;
  //         console.log('The sell price were appended to file!');
  //       },
  //     );
  //     canISell = false;
  //     // dmiAdxSignal = 0;
  //     // dmiMdiSignal = 0;
  //     // rsiSignal = false;
  //     // console.log('Current price: ' + currentPrice);
  //     // console.log('Prev price: ' + prevPrice);
  //   } catch (e) {
  //     console.error(e);
  //   }
  // }
  // prevAvPrice = currentAvPrice;
};

process.env.UV_THREADPOOL_SIZE = 512;

export default (
  strategyName,
  options = {
    symbol: SYMBOLS.BTCUSDT,
  },
  output = '1m_dmi_trade_history.txt',
) => {
  try {
    fs.appendFile(
      output,
      `--------------------------------------------\nBot started working at: ${format(
        new Date(),
        'MMMM Do yyyy, h:mm:ss a',
      )} with using ${strategyName}\n--------------------------------------------\n`,
      () =>
        console.log(
          `--------------------------------------------\nBot started working at: ${format(
            new Date(),
            'MMMM Do yyyy, h:mm:ss a',
          )} with using ${strategyName}\n--------------------------------------------\n`,
        ),
    );
    getPricesStream({
      symbol: options.symbol,
      resource: RESOURCES.TRADE,
    })
      .pipe(pluck('price'), bufferCount(2, 2))
      .subscribe(dmiTradeStrategy);
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
      symbol: options.symbol,
      interval: '1m',
    }).subscribe(dmi => {
      if (!prevDmi) {
        prevDmi = dmi;
        return;
      }
      if (dmi.pdi > dmi.adx && prevDmi.pdi < prevDmi.adx) {
        dmiAdxSignal = 1;
        // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
        // console.log('Curr dmi:'+ JSON.stringify(dmi));
        // console.log('Pdi is upper than then ADX');
      }
      if (dmi.pdi < dmi.adx && prevDmi.pdi > prevDmi.adx) {
        dmiAdxSignal = -1;
        // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
        // console.log('Curr dmi:'+ JSON.stringify(dmi));
        // console.log('Pdi is lower than then ADX');
      }
      // if ((dmi.pdi >= dmi.mdi) && (prevDmi.pdi < prevDmi.mdi)) {
      //     dmiSignal = 1;
      //     console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      //     console.log('Curr dmi:'+ JSON.stringify(dmi));
      //     console.log('Pdi is upper than then MDI');
      // }
      // if ((dmi.pdi < dmi.mdi) && (prevDmi.pdi > prevDmi.mdi)) {
      //     dmiSignal = 1;
      //     console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      //     console.log('Curr dmi:'+ JSON.stringify(dmi));
      //     console.log('Pdi is lower than then MDI');
      // }
      // console.log(dmi)
      if (dmi.pdi > dmi.mdi && prevDmi.pdi < prevDmi.mdi) {
        dmiMdiSignal = 1;
        // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
        // console.log('Curr dmi:'+ JSON.stringify(dmi));
        // console.log('Pdi is upper than then ADX');
      }
      if (dmi.pdi < dmi.mdi && prevDmi.pdi > prevDmi.mdi) {
        dmiMdiSignal = -1;
        // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
        // console.log('Curr dmi:'+ JSON.stringify(dmi));
        // console.log('Pdi is upper than then ADX');
      }

      prevDmi = dmi;
    });
    getRsiAlertStream().subscribe(({ rsi }) => {
      rsiSignal = rsi >= 50;
      // console.log(rsiSignal)
    });
  } catch (e) {
    console.error(e);
  }
};
