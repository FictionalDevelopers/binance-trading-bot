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
import _isEqual from 'lodash/isEqual';
import { dmiTradeStrategy } from './strategies/dmiTradeStrategy';

(async function() {
  await connect();
  await processSubscriptions();

  // const symbol = process.argv[2];
  const symbol = 'erdusdt';
  const interval = '1m';
  // const symbol = SYMBOLS.ERDUSDT;
  let canISell = false;
  // let buysCounter = 0;
  let totalProfit = 0;
  // let prevProfit = 0;
  // const prevAvPrice = 0;
  let buyPrice = null;
  const vertVolumeSignal = false;
  const dmiSignal = null;
  const prevVolume = null;
  let prevDmi = null;
  const prev1hDmi = null;
  const tradesActivity = 0;
  const prev1sPrice = 0;
  const prices = [];
  const intervalPriceDiff = [];
  const prevAvPrice = null;

  // let complexSignal = null;
  let dmiMdiSignal = 0;
  let dmiAdxSignal = 0;
  let isAdxHigherThanMdi = false;
  const isPdi1hHigherThanMdi = false;
  let isMdiHigherThanAdx = false;
  // let isMdi1hHigherThanAdx = false;
  let rsi1dSignal = false;
  let rsi1hSignalValue = null;
  let rsi1mValue = null;
  // let rebuy = false;
  let currentPrice = null;
  // let profit = 0;

  const sumPricesReducer = (accumulator, currentValue) =>
    accumulator + Number(currentValue);

  // const getIntervalPriceDiff = setInterval(() => {
  //   if (
  //     intervalPriceDiff[4] > intervalPriceDiff[3] &&
  //     intervalPriceDiff[3] > intervalPriceDiff[2] &&
  //     intervalPriceDiff[2] > intervalPriceDiff[1] &&
  //     intervalPriceDiff[1] > intervalPriceDiff[0]
  //   )
  //     console.log('Price Up');
  //   intervalPriceDiff.length = 0;
  // }, 5000);

  // const getOneSecondPriceDiff = setInterval(() => {
  //   let priceDiff;
  //   const current1sPrice = prices[prices.length - 1];
  //   if (!prev1sPrice) {
  //     prev1sPrice = current1sPrice;
  //     priceDiff = Number(0).toFixed(7);
  //     console.log(Number(priceDiff).toFixed(7) + '%');
  //     intervalPriceDiff.push(priceDiff);
  //     return;
  //   }
  //   priceDiff = current1sPrice
  //     ? current1sPrice / prev1sPrice > 1
  //       ? Number((current1sPrice / prev1sPrice) * 100 - 100)
  //       : Number(-1 * (100 - (current1sPrice / prev1sPrice) * 100))
  //     : null;
  //
  //   prev1sPrice = current1sPrice;
  //   prices.length = 0;
  //   console.log(Number(priceDiff).toFixed(7) + '%');
  //   intervalPriceDiff.push(priceDiff);
  // }, 1000);

  const dmiTradeStrategy = async pricesStream => {
    currentPrice = Number(pricesStream[pricesStream.length - 1]);
    // prices.push(currentPrice);
    // console.log(currentPrice);
    // const upSortedPricesArr = [...pricesStream].sort((a, b) => a - b);
    // const downSortedPricesArr = [...pricesStream].sort((a, b) => b - a);
    // if (_isEqual(upSortedPricesArr, pricesStream)) {
    //   console.log('UP!!!!!!!');
    //   console.log(`date: ${format(new Date(), DATE_FORMAT)}`);
    // }
    // if (_isEqual(downSortedPricesArr, pricesStream)) {
    //   console.log('DOWN!!!!!!!');
    //   console.log(`date: ${format(new Date(), DATE_FORMAT)}`);
    // }
    console.log(currentPrice);
    // console.log(rsi1mValue);

    // const pricesArrLength = pricesStream.length;
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
    // console.log(
    //   `DmiAdxSignal: ${dmiAdxSignal} DmiMdiSignal: ${dmiMdiSignal}  profit: ${profit} canISell: ${canISell} rsi: ${rsiSignal} isAdxHigherThanMdi: ${isAdxHigherThanMdi} isPdi1hHigherThanMdi ${isPdi1hHigherThanMdi}`,
    // );

    if (
      !canISell &&
      // dmiAdxSignal + dmiMdiSignal === 2 &&
      // isAdxHigherThanMdi &&
      // rsi1dSignal &&
      // rsi1hSignalValue >= 53 &&
      rsi1mValue <= 34 &&
      rsi1mValue !== null
      // &&
      // rsi1mValue <= 65

      // &&
      // rsi1hSignalValue >= 55 &&
      // rsi1hSignalValue < 70
      // && isPdi1hHigherThanMdi
      // && (currentAvPrice - prevAvPrice >= 3)
    ) {
      // tradeActions.buyByMarketPrice(null, '1m_dmi_trade_history.txt');
      canISell = true;
      buyPrice = currentPrice;
      // rebuy = false;
      // buysCounter++;
      await sendToRecipients(`BUY
             STRATEGY 1.3
             symbol: ${symbol.toUpperCase()}
             price: ${currentPrice}
             date: ${format(new Date(), DATE_FORMAT)}
             total profit: ${Number(totalProfit).toPrecision(4)}%

         `);
      console.log(`BUY
                     STRATEGY 1.3
                     symbol: ${symbol.toUpperCase()}
                     price: ${currentPrice}
                     date: ${format(new Date(), DATE_FORMAT)}
                     total profit: ${Number(totalProfit).toPrecision(4)}%
      `);
      return;
    }
    // if (canISell && profit >= 0.3) {
    //   // buysCounter !== 0 &&
    //   // (dmiAdxSignal === -1 && isAdxHigherThanMdi) ||
    //   // (dmiMdiSignal === -1 && isMdiHigherThanAdx) ||
    //   // rsiSignal &&
    //   // profit >= 1
    //   // || (canISell && profit <= -0.1)
    //   // tradeActions.sellByMarketPrice(null, '1m_dmi_trade_history.txt');
    //   canISell = false;
    //   totalProfit += profit - 0.2;
    //   buyPrice = null;
    //   // rebuy = true;
    //   await sendToRecipients(`SELL
    //          STRATEGY 1.2
    //          symbol: ${symbol.toUpperCase()}
    //          price: ${currentPrice}
    //          date: ${format(new Date(), DATE_FORMAT)}
    //          current profit: ${Number(profit - 0.2).toPrecision(4)}%
    //          total profit: ${Number(totalProfit).toPrecision(4)}%
    //      `);
    //   console.log(`Sell
    //                 STRATEGY 1.2
    //                 symbol: ${symbol.toUpperCase()}
    //                 price: ${currentPrice}
    //                 date: ${format(new Date(), DATE_FORMAT)}
    //                 current profit: ${Number(profit - 0.2).toPrecision(4)}%
    //                 total profit: ${Number(totalProfit).toPrecision(4)}%
    //   `);
    //   return;
    // }
    if (
      canISell &&
      rsi1mValue >= 68 &&
      profit >= 0.3
      // (dmiAdxSignal === -1 || rsi1mValue <= 48)
      // (canISell && profit <= -0.5) ||

      // ||
      // (
      // profit <= -3
      // ||
      // rsi1hSignalValue <= 48
      // )

      // (canISell &&
      //   ((dmiAdxSignal === -1 && isAdxHigherThanMdi) ||
      //     (dmiMdiSignal === -1 && isMdiHigherThanAdx))
      // ) ||
      // profit <= -1

      // currentAvPrice - prevAvPrice <= 3
      // profit <= -0.3
    ) {
      // rsiSignal &&
      // profit >= 1
      // || (canISell && profit <= -0.1)
      // tradeActions.sellByMarketPrice(null, '1m_dmi_trade_history.txt');
      canISell = false;
      totalProfit += profit - 0.2;
      buyPrice = null;
      // rebuy = false;
      // dmiMdiSignal = -1;
      // dmiAdxSignal = -1;
      await sendToRecipients(`SELL
             STRATEGY 1.3
             symbol: ${symbol.toUpperCase()}
             price: ${currentPrice}
             date: ${format(new Date(), DATE_FORMAT)}
             current profit: ${Number(profit - 0.2).toPrecision(4)}%
             total profit: ${Number(totalProfit).toPrecision(4)}%
         `);
      console.log(`Sell
                    STRATEGY 1.3
                    symbol: ${symbol.toUpperCase()}
                    price: ${currentPrice}
                    date: ${format(new Date(), DATE_FORMAT)}
                    current profit: ${Number(profit - 0.2).toPrecision(4)}%
                    total profit: ${Number(totalProfit).toPrecision(4)}%
      `);
    }
  };

  // const candlePrices$ = getCandleStreamForInterval(
  //   SYMBOLS.BTCUSDT,
  //   interval,
  // ).pipe(pluck('closePrice'), map(Number));
  //
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

  const rsi1dSignals = getRsiStream({
    symbol: symbol,
    period: 14,
    interval: '1d',
  }).subscribe(rsi => {
    // console.log(rsi);
    rsi1dSignal = rsi >= 55;
  });

  const rsi1hSignals = getRsiStream({
    symbol: symbol,
    period: 14,
    interval: '1h',
  }).subscribe(rsi => {
    // console.log(rsi);
    rsi1hSignalValue = rsi;
  });

  const rsi1mSignals = getRsiStream({
    symbol: symbol,
    period: 14,
    interval: '1m',
  }).subscribe(rsi => {
    // console.log(rsi);
    rsi1mValue = rsi;
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
    console.log('dmiMdiSignal', dmiMdiSignal);
    console.log('dmiAdxSignal', dmiAdxSignal);
    if (dmi.pdi - dmi.adx >= 2) {
      dmiAdxSignal = 1;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is upper than then ADX');
    }
    if (dmi.pdi - dmi.adx <= -2) {
      dmiAdxSignal = -1;
    }

    // if (dmi.adx - dmi.pdi >= 2 && prevDmi.pdi > prevDmi.adx) {
    //   dmiAdxSignal = -1;
    //   // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
    //   // console.log('Curr dmi:'+ JSON.stringify(dmi));
    //   // console.log('Pdi is lower than then ADX');
    // }
    // if (dmi.adx - dmi.mdi >= 2) {
    //   isAdxHigherThanMdi = true;
    //   // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
    //   // console.log('Curr dmi:'+ JSON.stringify(dmi));
    //   // console.log('Pdi is upper than then MDI');
    // }
    // if (dmi.adx - dmi.mdi < 2) {
    //   isAdxHigherThanMdi = false;
    //   // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
    //   // console.log('Curr dmi:'+ JSON.stringify(dmi));
    //   // console.log('Pdi is lower than then MDI');
    // }
    // if (dmi.mdi - dmi.adx >= 2) {
    //   isMdiHigherThanAdx = true;
    //   // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
    //   // console.log('Curr dmi:'+ JSON.stringify(dmi));
    //   // console.log('Pdi is upper than then MDI');
    // }
    // if (dmi.mdi - dmi.adx < 2) {
    //   isMdiHigherThanAdx = false;
    //   // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
    //   // console.log('Curr dmi:'+ JSON.stringify(dmi));
    //   // console.log('Pdi is lower than then MDI');
    // }
    // // console.log(dmi)
    if (dmi.pdi - dmi.mdi > 0.5) {
      dmiMdiSignal = 1;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is upper than then ADX');
    }
    if (dmi.pdi - dmi.mdi < -0.5) {
      dmiMdiSignal = -1;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is upper than then ADX');
    }

    prevDmi = dmi;
  });

  // getDmiStream({
  //   symbol: symbol,
  //   interval: '1h',
  //   period: 14,
  // }).subscribe(dmi => {
  //   if (!prev1hDmi) {
  //     prev1hDmi = dmi;
  //     return;
  //   }
  //   // console.log(dmi);
  //   // if (dmi.pdi > dmi.adx && prevDmi.pdi < prevDmi.adx) {
  //   //   dmiAdxSignal = 1;
  //   // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
  //   // console.log('Curr dmi:'+ JSON.stringify(dmi));
  //   // console.log('Pdi is upper than then ADX');
  //   // }
  //   // if (dmi.pdi < dmi.adx && prevDmi.pdi > prevDmi.adx) {
  //   //   dmiAdxSignal = -1;
  //   // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
  //   // console.log('Curr dmi:'+ JSON.stringify(dmi));
  //   // console.log('Pdi is lower than then ADX');
  //   // }
  //   if (dmi.adx - dmi.mdi >= 2) {
  //     // isAdx1hHigherThanMdi = true;
  //     // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
  //     // console.log('Curr dmi:'+ JSON.stringify(dmi));
  //     // console.log('Pdi is upper than then MDI');
  //   }
  //   if (dmi.adx - dmi.mdi < 2) {
  //     // isAdx1hHigherThanMdi = false;
  //     // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
  //     // console.log('Curr dmi:'+ JSON.stringify(dmi));
  //     // console.log('Pdi is lower than then MDI');
  //   }
  //   if (dmi.mdi - dmi.adx >= 2) {
  //     // isMdi1hHigherThanAdx = true;
  //     // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
  //     // console.log('Curr dmi:'+ JSON.stringify(dmi));
  //     // console.log('Pdi is upper than then MDI');
  //   }
  //   if (dmi.mdi - dmi.adx < 2) {
  //     // isMdi1hHigherThanAdx = false;
  //     // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
  //     // console.log('Curr dmi:'+ JSON.stringify(dmi));
  //     // console.log('Pdi is lower than then MDI');
  //   }
  //   isPdi1hHigherThanMdi = dmi.pdi - dmi.mdi >= 2;
  //
  //   // if (dmi.pdi - dmi.mdi >= 2) {
  //   // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
  //   // console.log('Curr dmi:'+ JSON.stringify(dmi));
  //   // console.log('Pdi is upper than then MDI');
  //   // }
  //
  //   // console.log(dmi)
  //   if (dmi.pdi > dmi.mdi && prevDmi.pdi < prevDmi.mdi) {
  //     //   dmiMdiSignal = 1;
  //     // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
  //     // console.log('Curr dmi:'+ JSON.stringify(dmi));
  //     // console.log('Pdi is upper than then ADX');
  //   }
  //   if (dmi.pdi < dmi.mdi && prevDmi.pdi > prevDmi.mdi) {
  //     //   dmiMdiSignal = -1;
  //     // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
  //     // console.log('Curr dmi:'+ JSON.stringify(dmi));
  //     // console.log('Pdi is upper than then ADX');
  //   }
  //
  //   prev1hDmi = dmi;
  // });

  // const strategy$ = makeStrategy({
  //   buyTools: [volumes$],
  //   sellTools: [rsiSignals$],
  // });

  // let hasBought = false;

  await sendToRecipients(`INIT
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  with using the STRATEGY 1.3
  symbol: ${symbol.toUpperCase()}
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
