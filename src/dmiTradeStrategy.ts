import { combineLatest } from 'rxjs';
import { map, pluck, bufferCount } from 'rxjs/operators';
import { format } from 'date-fns';
import { connect } from './db/connection';
import { RESOURCES } from './constants';
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

  const symbol = process.argv[2];
  const interval = '1m';
  // const symbol = SYMBOLS.ERDUSDT;
  let canISell = false;
  // let buysCounter = 0;
  let totalProfit = 0;
  // let prevProfit = 0;
  const prevAvPrice = 0;
  let buyPrice = null;
  const vertVolumeSignal = false;
  const dmiSignal = null;
  const prevVolume = null;
  let prevDmi = null;
  let prev1hDmi = null;

  // let complexSignal = null;
  let dmiMdiSignal = 0;
  let dmiAdxSignal = 0;
  let isAdxHigherThanMdi = false;
  let isPdi1hHigherThanMdi = false;
  let isMdiHigherThanAdx = false;
  // let isMdi1hHigherThanAdx = false;
  let rsiSignal = false;
  let rebuy = false;
  let currentPrice = null;
  // let profit = 0;

  const dmiTradeStrategy = async pricesStream => {
    // const pricesArrLength = trade.length;
    currentPrice = Number(pricesStream[pricesStream.length - 1]);
    // const currentAvPrice = trade.reduce(sumPricesReducer, 0) / pricesArrLength;
    const profit = buyPrice
      ? currentPrice / buyPrice > 1
        ? Number((currentPrice / buyPrice) * 100 - 100)
        : Number(-1 * (100 - (currentPrice / buyPrice) * 100))
      : 0;
    // if (!prevAvPrice) {
    //   prevAvPrice = currentAvPrice;
    //   console.log('No prev price found');
    //   return;
    // }
    console.log(
      `DmiAdxSignal: ${dmiAdxSignal} DmiMdiSignal: ${dmiMdiSignal}  profit: ${profit} canISell: ${canISell} rsi: ${rsiSignal} isAdxHigherThanMdi: ${isAdxHigherThanMdi} isPdi1hHigherThanMdi ${isPdi1hHigherThanMdi}`,
    );

    if (
      !canISell &&
      dmiAdxSignal + dmiMdiSignal === 2 &&
      // isAdxHigherThanMdi &&
      rsiSignal &&
      isPdi1hHigherThanMdi
      // currentAvPrice - prevAvPrice >= 3)
      // ||
      // rebuy
    ) {
      // tradeActions.buyByMarketPrice(null, '1m_dmi_trade_history.txt');
      canISell = true;
      buyPrice = currentPrice;
      // rebuy = false;
      // buysCounter++;
      await sendToRecipients(`BUY
             STRATEGY 1
             symbol: ${symbol.toUpperCase()}
             price: ${currentPrice}
             date: ${format(new Date(), DATE_FORMAT)}
             total profit: ${Number(totalProfit).toPrecision(4)}%

         `);
      console.log(`BUY
                     STRATEGY 1
                     symbol: ${symbol.toUpperCase()}
                     price: ${currentPrice}
                     date: ${format(new Date(), DATE_FORMAT)}
                     total profit: ${Number(totalProfit).toPrecision(4)}%
      `);
      return;
    }
    if (canISell && profit >= 1) {
      // buysCounter !== 0 &&
      // (dmiAdxSignal === -1 && isAdxHigherThanMdi) ||
      // (dmiMdiSignal === -1 && isMdiHigherThanAdx) ||
      // rsiSignal &&
      // profit >= 1
      // || (canISell && profit <= -0.1)
      // tradeActions.sellByMarketPrice(null, '1m_dmi_trade_history.txt');
      canISell = false;
      totalProfit += profit;
      buyPrice = null;
      rebuy = true;
      await sendToRecipients(`SELL
             STRATEGY 1
             symbol: ${symbol.toUpperCase()}
             price: ${currentPrice}
             date: ${format(new Date(), DATE_FORMAT)}
             current profit: ${Number(profit).toPrecision(4)}%
             total profit: ${Number(totalProfit).toPrecision(4)}%
         `);
      console.log(`Sell
                    STRATEGY 1
                    symbol: ${symbol.toUpperCase()}
                    price: ${currentPrice}
                    date: ${format(new Date(), DATE_FORMAT)}
                    current profit: ${Number(profit).toPrecision(4)}%
                    total profit: ${Number(totalProfit).toPrecision(4)}%
      `);
      return;
    }
    if (
      (canISell &&
        ((dmiAdxSignal === -1 && isAdxHigherThanMdi) ||
          (dmiMdiSignal === -1 && isMdiHigherThanAdx))) ||
      profit <= -1
      // currentAvPrice - prevAvPrice <= 3
      // profit <= -0.3
    ) {
      // rsiSignal &&
      // profit >= 1
      // || (canISell && profit <= -0.1)
      // tradeActions.sellByMarketPrice(null, '1m_dmi_trade_history.txt');
      canISell = false;
      totalProfit += profit;
      buyPrice = null;
      rebuy = false;
      dmiMdiSignal = -1;
      dmiAdxSignal = -1;
      await sendToRecipients(`SELL
             STRATEGY 1
             symbol: ${symbol.toUpperCase()}
             price: ${currentPrice}
             date: ${format(new Date(), DATE_FORMAT)}
             current profit: ${Number(profit).toPrecision(4)}%
             total profit: ${Number(totalProfit).toPrecision(4)}%
         `);
      console.log(`Sell
                    STRATEGY 1
                    symbol: ${symbol.toUpperCase()}
                    price: ${currentPrice}
                    date: ${format(new Date(), DATE_FORMAT)}
                    current profit: ${Number(profit).toPrecision(4)}%
                    total profit: ${Number(totalProfit).toPrecision(4)}%
      `);
    }
  };

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
    symbol: symbol,
    period: 14,
    interval: '1d',
  }).subscribe(rsi => {
    // console.log(rsi);
    rsiSignal = rsi >= 55;
  });
  //     .pipe(
  //   transformRsiToSignal({
  //     overbought: [50, 70],
  //     oversold: [30, 50],
  //   }),
  // );

  getDmiStream({
    symbol: symbol,
    interval: '1m',
    period: 14,
  }).subscribe(dmi => {
    if (!prevDmi) {
      prevDmi = dmi;
      return;
    }
    // console.log(dmi);
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
    if (dmi.adx - dmi.mdi >= 2) {
      isAdxHigherThanMdi = true;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is upper than then MDI');
    }
    if (dmi.adx - dmi.mdi < 2) {
      isAdxHigherThanMdi = false;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is lower than then MDI');
    }
    if (dmi.mdi - dmi.adx >= 2) {
      isMdiHigherThanAdx = true;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is upper than then MDI');
    }
    if (dmi.mdi - dmi.adx < 2) {
      isMdiHigherThanAdx = false;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is lower than then MDI');
    }
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

  getDmiStream({
    symbol: symbol,
    interval: '1h',
    period: 14,
  }).subscribe(dmi => {
    if (!prev1hDmi) {
      prev1hDmi = dmi;
      return;
    }
    // console.log(dmi);
    // if (dmi.pdi > dmi.adx && prevDmi.pdi < prevDmi.adx) {
    //   dmiAdxSignal = 1;
    // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
    // console.log('Curr dmi:'+ JSON.stringify(dmi));
    // console.log('Pdi is upper than then ADX');
    // }
    // if (dmi.pdi < dmi.adx && prevDmi.pdi > prevDmi.adx) {
    //   dmiAdxSignal = -1;
    // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
    // console.log('Curr dmi:'+ JSON.stringify(dmi));
    // console.log('Pdi is lower than then ADX');
    // }
    if (dmi.adx - dmi.mdi >= 2) {
      // isAdx1hHigherThanMdi = true;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is upper than then MDI');
    }
    if (dmi.adx - dmi.mdi < 2) {
      // isAdx1hHigherThanMdi = false;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is lower than then MDI');
    }
    if (dmi.mdi - dmi.adx >= 2) {
      // isMdi1hHigherThanAdx = true;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is upper than then MDI');
    }
    if (dmi.mdi - dmi.adx < 2) {
      // isMdi1hHigherThanAdx = false;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is lower than then MDI');
    }
    isPdi1hHigherThanMdi = dmi.pdi - dmi.mdi >= 2;

    // if (dmi.pdi - dmi.mdi >= 2) {
    // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
    // console.log('Curr dmi:'+ JSON.stringify(dmi));
    // console.log('Pdi is upper than then MDI');
    // }

    // console.log(dmi)
    if (dmi.pdi > dmi.mdi && prevDmi.pdi < prevDmi.mdi) {
      //   dmiMdiSignal = 1;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is upper than then ADX');
    }
    if (dmi.pdi < dmi.mdi && prevDmi.pdi > prevDmi.mdi) {
      //   dmiMdiSignal = -1;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is upper than then ADX');
    }

    prev1hDmi = dmi;
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
  console.error(reason);
  await sendToRecipients(`ERROR
    ${reason.message}
    ${reason.stack}
  `);

  process.exit(1);
});
