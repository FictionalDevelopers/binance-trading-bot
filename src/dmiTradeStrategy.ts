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
import { binance } from './api/binance';
import getBalances from './api/balance';
import { getExchangeInfo } from './api/exchangeInfo';
import { marketSell, marketBuy } from './api/order';

(async function() {
  await connect();
  await processSubscriptions();

  // const symbol = process.argv[2];
  const symbol = 'erdusdt';
  const { available: initialUSDTBalance } = await getBalances('USDT');
  const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');
  let availableUSDT = null;
  let availableERD = null;
  const interval = '1m';
  // const symbol = SYMBOLS.ERDUSDT;
  let canISell = false;
  // let buysCounter = 0;
  // let totalProfit = 0;
  // let prevProfit = 0;
  // const prevAvPrice = 0;
  let buyPrice = null;
  const vertVolumeSignal = false;
  const dmiSignal = null;
  const prevVolume = null;
  let prevDmi = null;
  let prev1hDmi = null;
  const tradesActivity = 0;
  let prev1sPrice = 0;
  const prices = [];
  const intervalPriceDiff = [];
  const prevAvPrice = null;

  // let complexSignal = null;
  let dmiMdiSignal = 0;
  let dmiAdxSignal = 0;
  let dmiAdx1hSignal = 0;
  let dmiMdi1hSignal = 0;
  let isAdxHigherThanMdi = false;
  const isPdi1hHigherThanMdi = false;
  let isMdiHigherThanAdx = false;
  // let isMdi1hHigherThanAdx = false;
  let rsi1dSignal = false;
  let rsi1hSignalValue = null;
  let rsi1mValue = null;
  let rsi1hValue = null;
  // let rebuy = false;
  let currentPrice = null;
  // let profit = 0;
  // let sellRightNow = false;

  // const sumPricesReducer = (accumulator, currentValue) =>
  //   accumulator + Number(currentValue);

  // const getIntervalPriceDiff = setInterval(() => {
  //   // if (
  //   //   intervalPriceDiff[4] > intervalPriceDiff[3] &&
  //   //   intervalPriceDiff[3] > intervalPriceDiff[2] &&
  //   //   intervalPriceDiff[2] > intervalPriceDiff[1] &&
  //   //   intervalPriceDiff[1] > intervalPriceDiff[0]
  //   // )
  //   //   console.log('Price Up');
  //   // intervalPriceDiff.length = 0;
  //   sellRightNow = intervalPriceDiff.every(elem => elem < 0);
  //   if (sellRightNow) console.log('Sell right now!!!');
  // }, 5000);

  // const getOneSecondPriceDiff = setInterval(() => {
  //   let priceDiff;
  //   const current1sPrice = prices[prices.length - 1];
  //   if (!prev1sPrice) {
  //     prev1sPrice = current1sPrice;
  //     priceDiff = Number(0).toFixed(7);
  //     // console.log(Number(priceDiff).toFixed(7) + '%');
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
  //
  //   // sellRightNow = priceDiff <= -2;
  //
  //   // console.log(
  //   //   Number(priceDiff).toFixed(7) + '%; ',
  //   //   'Sell right now:',
  //   //   sellRightNow,
  //   // );
  //   intervalPriceDiff.push(priceDiff);
  // }, 1000);

  const dmiTradeStrategy = async pricesStream => {
    currentPrice = Number(pricesStream[pricesStream.length - 1]);
    prices.push(currentPrice);
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
    // console.log(currentPrice);
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
      rsi1mValue <= 50 &&
      rsi1mValue !== null &&
      rsi1hValue < 68 &&
      rsi1hValue !== null &&
      dmiMdi1hSignal === 1

      // !sellRightNow
      // &&
      // rsi1mValue <= 65

      // &&
      // rsi1hSignalValue >= 55 &&
      // rsi1hSignalValue < 70
      // && isPdi1hHigherThanMdi
      // && (currentAvPrice - prevAvPrice >= 3)
    ) {
      try {
        // tradeActions.buyByMarketPrice(null, '1m_dmi_trade_history.txt');
        canISell = true;
        buyPrice = currentPrice;
        const { available } = await getBalances('USDT');
        availableUSDT = available;
        const amount = binance.roundStep(available / currentPrice, stepSize);
        await sendToRecipients(`Amount: ${amount} USDT`);
        const order = await marketBuy(symbol.toUpperCase(), +amount);
        // rebuy = false;
        // buysCounter++;
        await sendToRecipients(`BUY
             STRATEGY 1.2 (RSI + DMI) MODIFIED
             Symbol: ${symbol.toUpperCase()}
             Price: ${currentPrice} USDT
             Date: ${format(new Date(), DATE_FORMAT)}
             OrderInfo: ${JSON.stringify(order)}
         `);
        // console.log(`BUY
        //                STRATEGY 1.2(RSI + DMI) MODIFIED
        //                symbol: ${symbol.toUpperCase()}
        //                price: ${currentPrice}
        //                date: ${format(new Date(), DATE_FORMAT)}
        //                total profit: ${Number(totalProfit).toPrecision(4)}%
        // `);
        return;
      } catch (e) {
        await sendToRecipients(`ERROR
        ${JSON.stringify(e)}
  `);
      }
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
      ((rsi1mValue >= 60 && profit >= 0.3 && dmiAdxSignal === -1) ||
        dmiMdi1hSignal === -1)
      // sellRightNow

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
      try {
        // rsiSignal &&
        // profit >= 1
        // || (canISell && profit <= -0.1)
        // tradeActions.sellByMarketPrice(null, '1m_dmi_trade_history.txt');
        canISell = false;
        // totalProfit += profit - 0.2;
        buyPrice = null;
        const { available: availableExchCurr } = await getBalances('ERD');
        availableERD = availableExchCurr;
        const amount = binance.roundStep(Number(availableExchCurr), stepSize);
        const order = await marketSell(symbol.toUpperCase(), +amount);
        const { available: refreshedUSDTBalance } = await getBalances('USDT');
        const currentProfit =
          Number(refreshedUSDTBalance) - Number(availableUSDT);
        // rebuy = false;
        // dmiMdiSignal = -1;
        // dmiAdxSignal = -1;
        await sendToRecipients(`SELL
             STRATEGY 1.2(RSI + DMI)
             Symbol: ${symbol.toUpperCase()}
             Price: ${currentPrice} USDT
             Date: ${format(new Date(), DATE_FORMAT)}
             Current profit: ${currentProfit} USDT
             Total profit: ${Number(refreshedUSDTBalance) -
               Number(initialUSDTBalance)} USDT
             Balance: ${+refreshedUSDTBalance} USDT
             OrderInfo: ${JSON.stringify(order)}
         `);
        // console.log(`Sell
        //               STRATEGY 1.2 (RSI + DMI)
        //               symbol: ${symbol.toUpperCase()}
        //               price: ${currentPrice}
        //               date: ${format(new Date(), DATE_FORMAT)}
        //               current profit: ${Number(profit - 0.2).toPrecision(4)}%
        //               total profit: ${Number(totalProfit).toPrecision(4)}%
        // `);
      } catch (e) {
        await sendToRecipients(`ERROR
        ${JSON.stringify(e)}
  `);
      }
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

  // const rsi1dSignals = getRsiStream({
  //   symbol: symbol,
  //   period: 14,
  //   interval: '1d',
  // }).subscribe(rsi => {
  //   // console.log(rsi);
  //   rsi1dSignal = rsi >= 55;
  // });

  // const rsi1hSignals = getRsiStream({
  //   symbol: symbol,
  //   period: 14,
  //   interval: '1h',
  // }).subscribe(rsi => {
  //   // console.log(rsi);
  //   rsi1hSignalValue = rsi;
  // });

  const rsi1mSignals = getRsiStream({
    symbol: symbol,
    period: 14,
    interval: '1m',
  }).subscribe(rsi => {
    // console.log(rsi);
    rsi1mValue = rsi;
  });

  const rsi1hSignals = getRsiStream({
    symbol: symbol,
    period: 14,
    interval: '1h',
  }).subscribe(rsi => {
    // console.log(rsi);
    rsi1hValue = rsi;
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
    // console.log('dmiMdiSignal', dmiMdiSignal);
    // console.log('dmiAdxSignal', dmiAdxSignal);
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
  getDmiStream({
    symbol: symbol,
    interval: '1h',
    period: 14,
  }).subscribe(dmi => {
    if (!prev1hDmi) {
      prev1hDmi = dmi;
      return;
    }
    // console.log('dmiMdiSignal', dmiMdiSignal);
    // console.log('dmiAdxSignal', dmiAdxSignal);
    if (dmi.pdi - dmi.adx >= 2) {
      dmiAdx1hSignal = 1;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is upper than then ADX');
    }
    if (dmi.pdi - dmi.adx <= -2) {
      dmiAdx1hSignal = -1;
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
    if (dmi.pdi - dmi.mdi >= 2) {
      dmiMdi1hSignal = 1;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is upper than then ADX');
    }
    if (dmi.pdi - dmi.mdi <= -2) {
      dmiMdi1hSignal = -1;
      // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
      // console.log('Curr dmi:'+ JSON.stringify(dmi));
      // console.log('Pdi is upper than then ADX');
    }

    prev1hDmi = dmi;
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
  with using the STRATEGY 1.2(RSI + DMI) (MODIFIED)
  Symbol: ${symbol.toUpperCase()}
  Initial balance: ${initialUSDTBalance} USDT
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
