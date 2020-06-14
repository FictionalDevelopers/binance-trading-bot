import { combineLatest } from 'rxjs';
import { map, pluck, bufferCount } from 'rxjs/operators';
import { format } from 'date-fns';

import { connect } from './db/connection';
import { SYMBOLS, RESOURCES } from './constants';
import { DATE_FORMAT } from './constants/date';
import { getCandleStreamForInterval } from './api/candles';
import { getTradeStream } from './api/trades.js';
import { transformRsiToSignal } from './tools/rsi-tool';
import { makeVerticalVolumeToolStream } from './tools/vertical-volume-tool';
import { makeStrategy } from './strategies/make-strategy';
import { BUY, SELL } from './tools/signals';

import { processSubscriptions, sendToRecipients } from './services/telegram';
import { getRsiStream } from './indicators/rsi';
import { getDmiStream } from './indicators/dmi';

(async function() {
  await connect();
  await processSubscriptions();

  const dmiTradeStrategy = async pricesStream => {
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
      // tradeActions.buyByMarketPrice(null, '1m_dmi_trade_history.txt');
      await sendToRecipients(`BUY
             strategy 1
             price: ${currentPrice}
             date: ${format(new Date(), DATE_FORMAT)}
             current profit: ${profit}%
             total profit: ${totalProfit}%
         `);
      buyPrice = currentPrice;
      canISell = true;
      // rebuy = false;
      buysCounter++;
    }
    if (
      dmiAdxSignal === -1 &&
      // !rsiSignal &&
      canISell &&
      buysCounter !== 0
      // rsiSignal &&
      // profit >= 1
    ) {
      // || (canISell && profit <= -0.1)
      // tradeActions.sellByMarketPrice(null, '1m_dmi_trade_history.txt');
      await sendToRecipients(`SELL
             strategy 1
             price: ${currentPrice}
             date: ${format(new Date(), DATE_FORMAT)}
             current profit: ${profit}%
             total profit: ${totalProfit}%
         `);
      canISell = false;
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

  const interval = '1m';
  const symbol = SYMBOLS.BTCUSDT;
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

  // const candlePrices$ = getCandleStreamForInterval(
  //   SYMBOLS.BTCUSDT,
  //   interval,
  // ).pipe(pluck('closePrice'), map(Number));

  // const volumes$ = makeVerticalVolumeToolStream(
  //   {
  //     interval,
  //     symbol,
  //   },
  //   {
  //     minimalLatestCandleVolume: 30,
  //     minimalPercentageIncrease: 20,
  //   },
  // );

  const rsiSignals$ = getRsiStream({
    symbol: SYMBOLS.BTCUSDT,
    period: 14,
    interval: '1m',
  }).subscribe(({ rsi }) => {
    rsiSignal = rsi >= 50;
    // console.log(rsiSignal)
  });
  //     .pipe(
  //   transformRsiToSignal({
  //     overbought: [50, 70],
  //     oversold: [30, 50],
  //   }),
  // );

  getDmiStream({
    symbol: SYMBOLS.BTCUSDT,
    interval: '1m',
    period: 14,
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

  // const strategy$ = makeStrategy({
  //   buyTools: [volumes$],
  //   sellTools: [rsiSignals$],
  // });

  // let hasBought = false;

  await sendToRecipients(`INIT
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  with using the strategy 1
  symbol: ${symbol}
  `);

  getTradeStream({
    symbol: symbol,
    resource: RESOURCES.TRADE,
  })
    .pipe(pluck('price'), bufferCount(1, 1))
    .subscribe(dmiTradeStrategy);

  // combineLatest(strategy$, candlePrices$).subscribe(
  //   async ([strategySignalDetails, price]) => {
  //     const date = format(new Date(), DATE_FORMAT);
  //
  //     if (!hasBought && strategySignalDetails.action === BUY) {
  //       await sendToRecipients(`BUY
  //         price: ${price}
  //         date: ${date}
  //         signals: ${JSON.stringify(strategySignalDetails.signals)}
  //       `);
  //
  //       hasBought = true;
  //     }
  //
  //     if (hasBought && strategySignalDetails.action === SELL) {
  //       await sendToRecipients(`SELL
  //         price: ${price}
  //         date: ${date}
  //         current profit:
  //         total profit:
  //       `);
  //
  //       hasBought = false;
  //     }
  //   },
  // );
})();

process.on('unhandledRejection', async (reason: Error) => {
  await sendToRecipients(`ERROR
    ${reason.message}
    ${reason.stack}
  `);

  process.exit(1);
});
