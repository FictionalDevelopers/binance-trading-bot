import { pluck, bufferCount } from 'rxjs/operators';
import { format } from 'date-fns';
import { connect } from './db/connection';
import { RESOURCES } from './constants';
import { DATE_FORMAT } from './constants/date';
import { getTradeStream } from './api/trades.js';
import { processSubscriptions, sendToRecipients } from './services/telegram';
import { getRsiStream } from './indicators/rsi';
import { getDmiStream } from './indicators/dmi';
import { binance } from './api/binance';
import getBalances from './api/balance';
import { getExchangeInfo } from './api/exchangeInfo';
import { marketSell, marketBuy } from './api/order';
import { getEmaStream } from './indicators/ema';

(async function() {
  await connect();
  // await processSubscriptions();
  const symbol = 'erdusdt';
  const cryptoCoin = symbol.toUpperCase().slice(0, -4);
  const { available: initialUSDTBalance } = await getBalances('USDT');
  const { available: initialCryptoCoinBalance } = await getBalances(cryptoCoin);
  const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');

  // const symbol = process.argv[2];
  const botState = {
    status: 'buy',
    currentProfit: null,
    totalProfit: null,
    tradeAmountPercent: 0.95,
    availableUSDT: initialUSDTBalance,
    availableCryptoCoin: initialCryptoCoinBalance,
    buyPrice: null,
    currentPrice: null,
    order: null,
    avrDealProfit: null,
    dealsCount: 1,
    startTime: new Date().getTime(),
    workDuration: null,
    updateState: function(fieldName, value) {
      this[`${fieldName}`] = value;
    },
  };

  const indicatorsData = {
    prev1mDmi: null,
    prev1hDmi: null,
    dmiMdi1hSignal: 0,
    rsi1mValue: null,
    rsi1hValue: null,
    adx1mSignal: 0,
    mdi1mSignal: 0,
    mdi1hSignal: 0,
    slow1mEMA: 0,
    middle1mEMA: 0,
    fast1mEMA: 0,
    slow1hEMA: 0,
    middle1hEMA: 0,
    fast1hEMA: 0,
    isDownTrend: false,
    rebuy: true,
    isDirectionalMovementChanged: false,
    directionalMovementSignalWeight: 0,
  };

  const trader = async pricesStream => {
    const { tradeAmountPercent } = botState;
    const {
      rsi1mValue,
      rsi1hValue,
      adx1mSignal,
      mdi1mSignal,
      mdi1hSignal,
      slow1mEMA,
      fast1mEMA,
      middle1mEMA,
      fast1hEMA,
      middle1hEMA,
      slow1hEMA,
      isDownTrend,
      rebuy,
    } = indicatorsData;

    if (botState.status === 'isPending') return;
    botState.updateState(
      'currentPrice',
      Number(pricesStream[pricesStream.length - 1]),
    );
    let ema1mSignal;
    let ema1hSignal;
    if (fast1mEMA > middle1mEMA && middle1mEMA > slow1mEMA) {
      ema1mSignal = 1;
      // indicatorsData.isDownTrend = false;
      indicatorsData.rebuy = true;
    }
    if (fast1mEMA < middle1mEMA && middle1mEMA < slow1mEMA) ema1mSignal = -1;

    if (fast1hEMA > middle1hEMA) {
      ema1hSignal = 1;
      indicatorsData.isDownTrend = false;
    }
    if (fast1hEMA < middle1hEMA) ema1hSignal = -1;

    const expectedProfitPercent = botState.buyPrice
      ? botState.currentPrice / botState.buyPrice > 1
        ? Number((botState.currentPrice / botState.buyPrice) * 100 - 100)
        : Number(-1 * (100 - (botState.currentPrice / botState.buyPrice) * 100))
      : 0;
    // const expectedStableCoinProfit =
    //   (botState.availableCryptoCoin * botState.currentPrice * 0.999) /
    //     botState.availableUSDT >
    //   1
    //     ? Number(
    //         ((botState.availableCryptoCoin * botState.currentPrice) /
    //           botState.availableUSDT) *
    //           100 -
    //           100,
    //       )
    //     : Number(
    //         100 -
    //           ((botState.availableCryptoCoin * botState.currentPrice) /
    //             botState.availableUSDT) *
    //             100,
    //       );
    if (
      botState.status === 'buy' &&
    ) {
      try {
        botState.updateState('status', 'isPending');
        const amount = binance.roundStep(
          (botState.availableUSDT * tradeAmountPercent) / botState.currentPrice,
          stepSize,
        );
        const order = await marketBuy(symbol.toUpperCase(), +amount);
        botState.updateState('buyPrice', Number(order.fills[0].price));
        botState.updateState('order', order);
        const { available: refreshedCryptoCoinBalance } = await getBalances(
          cryptoCoin,
        );
        botState.updateState('availableCryptoCoin', refreshedCryptoCoinBalance);
        await sendToRecipients(`BUY
                 STRATEGY 1.2 (RSI + DMI) MODIFIED
                 Deal №: ${botState.dealsCount}
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.buyPrice} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Prebuy stablecoin balance: ${botState.availableUSDT} USDT 
                 Cryptocoin balance: ${+botState.availableCryptoCoin} ${cryptoCoin} 
                 OrderInfo: ${JSON.stringify(botState.order)}
             `);
        // console.log(`BUY
        //                      STRATEGY 1.2(RSI + DMI) MODIFIED
        //                      symbol: ${symbol.toUpperCase()}
        //                      price: ${currentPrice}
        //                      date: ${format(new Date(), DATE_FORMAT)}
        //       `);
        botState.updateState('status', 'sell');
        return;
      } catch (e) {
        await sendToRecipients(`BUY ERROR
            ${JSON.stringify(e)}
      `);
        botState.updateState('status', 'buy');
      }
    }

    if (
      botState.status === 'sell' &&
      (rsi1hValue < 50 || ema1mSignal === -1 || expectedProfitPercent <= -2)
      // rsi1mValue >= 60 &&
      // ema1mSignal === -1
      // middle1mEMA > fast1mEMA &&
      // adx1mSignal === -1 &&
      // fast1mEMA < middle1mEMA &&
      // (expectedProfitPercent >= 0.7 && fast1mEMA < middle1mEMA) ||
      // ||
      // ema1mSignal === -1)
    ) {
      try {
        botState.updateState('status', 'isPending');
        botState.updateState('buyPrice', null);
        const amount = binance.roundStep(
          Number(botState.availableCryptoCoin),
          stepSize,
        );
        const order = await marketSell(symbol.toUpperCase(), +amount);
        botState.updateState('order', order);
        const { available: refreshedUSDTBalance } = await getBalances('USDT');
        const currentProfit =
          Number(refreshedUSDTBalance) - Number(botState.availableUSDT);
        botState.updateState('currentProfit', currentProfit);
        botState.updateState('availableUSDT', +refreshedUSDTBalance);
        botState.updateState(
          'totalProfit',
          Number(refreshedUSDTBalance) - Number(initialUSDTBalance),
        );
        const { available: refreshedCryptoCoinBalance } = await getBalances(
          cryptoCoin,
        );
        botState.updateState(
          'availableCryptoCoin',
          +refreshedCryptoCoinBalance,
        );

        await sendToRecipients(`SELL
                 STRATEGY 1.2(RSI + DMI)
                 Deal №: ${botState.dealsCount}
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.order.fills[0].price} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Current profit: ${
                   botState.currentProfit
                 } USDT (${expectedProfitPercent} %)
                 Total profit: ${botState.totalProfit} USDT 
                 Average deal profit: ${botState.totalProfit /
                   botState.dealsCount} USDT/deal
                 Stablecoin balance: ${botState.availableUSDT} USDT
                 Cryptocoin balance: ${+botState.availableCryptoCoin} ${cryptoCoin}
                 OrderInfo: ${JSON.stringify(botState.order)}
                 Work duration: ${format(
                   botState.startTime - new Date().getTime(),
                   DATE_FORMAT,
                 )}
             `);

        // console.log(`Sell
        //                     STRATEGY 1.2 (RSI + DMI)
        //                     symbol: ${symbol.toUpperCase()}
        //                     price: ${currentPrice}
        //                     date: ${format(new Date(), DATE_FORMAT)}
        //                     current profit: ${Number(profit - 0.2).toPrecision(
        //                       4,
        //                     )}%
        //       `);
        botState.dealsCount++;
        botState.updateState('status', 'buy');
      } catch (e) {
        await sendToRecipients(`SELL ERROR
            ${JSON.stringify(e)}
      `);
        botState.updateState('status', 'sell');
      }
    }
  };

  getRsiStream({
    symbol: symbol,
    period: 14,
    interval: '1m',
  }).subscribe(rsi => {
    if (!indicatorsData.rsi1mValue) {
      indicatorsData.rsi1mValue = rsi;
      return;
    }
    if (
        (indicatorsData.rsi1mValue > 50 && rsi < 50) ||
        (indicatorsData.rsi1mValue < 50 && rsi > 50)
    )
      indicatorsData.directionalMovementSignalWeight = 0;
    indicatorsData.rsi1mValue = rsi;
  });

  getRsiStream({
    symbol: symbol,
    period: 14,
    interval: '1h',
  }).subscribe(rsi => {
    indicatorsData.rsi1hValue = rsi;
  });

  getDmiStream({
    symbol: symbol,
    interval: '1m',
    period: 14,
  }).subscribe(dmi => {
    if (!indicatorsData.prev1mDmi) {
      indicatorsData.prev1mDmi = dmi;
      return;
    }
    if (dmi.adx - dmi.pdi >= 2) indicatorsData.adx1mSignal = -1;
    if (dmi.pdi - dmi.adx >= 2) indicatorsData.adx1mSignal = 1;
    if (dmi.mdi - dmi.pdi >= 2) indicatorsData.mdi1mSignal = -1;
    if (dmi.pdi - dmi.mdi >= 2) indicatorsData.mdi1mSignal = 1;
    if (indicatorsData.prev1mDmi.adx === dmi.adx) return;
    indicatorsData.isDirectionalMovementChanged = indicatorsData.prev1mDmi > dmi.adx;
    if (indicatorsData.rsi1mValue < 50 && indicatorsData.isDirectionalMovementChanged)
      console.log('BUY');
    else if (
        indicatorsData.rsi1mValue < 50 &&
        !indicatorsData.isDirectionalMovementChanged
    )
      console.log('SELL');
    else if (
        indicatorsData.rsi1mValue > 50 &&
        indicatorsData.isDirectionalMovementChanged
    )
      console.log('SELL');
    else if (
        indicatorsData.rsi1mValue > 50 &&
        !indicatorsData.isDirectionalMovementChanged
    )
      console.log('BUY');
    indicatorsData.prev1mDmi = dmi.adx;

  });

  getDmiStream({
    symbol: symbol,
    interval: '1h',
    period: 14,
  }).subscribe(dmi => {
    if (!indicatorsData.prev1hDmi) {
      indicatorsData.prev1hDmi = dmi;
      return;
    }
    // if (
    //   indicatorsData.prev1mDmi.mdi > indicatorsData.prev1mDmi.pdi &&
    //   dmi.pdi > dmi.mdi
    // ) {
    //   indicatorsData.trend = 'UP';
    //   indicatorsData.directionalMovementSignalWeight = 0;
    // }
    // if (
    //   indicatorsData.prev1mDmi.mdi < indicatorsData.prev1mDmi.pdi &&
    //   dmi.pdi < dmi.mdi
    // ) {
    //   indicatorsData.trend = 'DOWN';
    //   indicatorsData.directionalMovementSignalWeight = 0;
    // }
    // // console.log('Trend: ' + indicatorsData.trend);
    // console.log(dmi);
    // console.log(indicatorsData.prev1mDmi);
    if (dmi.adx > dmi.pdi) indicatorsData.adx1hSignal = -1;
    if (dmi.pdi > dmi.adx) indicatorsData.adx1hSignal = 1;
    if (dmi.mdi > dmi.pdi) {
      indicatorsData.mdi1hSignal = -1;
      indicatorsData.trend = 'DOWN';
    }
    if (dmi.pdi > dmi.mdi) {
      indicatorsData.mdi1hSignal = 1;
      indicatorsData.trend = 'UP';
    }
    console.log(indicatorsData.trend);
    // if (indicatorsData.prev1mDmi.adx === dmi.adx) return;

    indicatorsData.isDirectionalMovementChanged =
        indicatorsData.prev1hDmi.adx > dmi.adx;
    if (
        indicatorsData.trend === 'DOWN' &&
        indicatorsData.isDirectionalMovementChanged
    ) {
      indicatorsData.directionalMovementSignalWeight++;
      console.log(
          'Weight for BUY: ' +
          indicatorsData.directionalMovementSignalWeight.toString(),
      );
    } else if (
        indicatorsData.trend === 'DOWN' &&
        !indicatorsData.isDirectionalMovementChanged
    ) {
    } else if (
        indicatorsData.trend === 'UP' &&
        indicatorsData.isDirectionalMovementChanged
    ) {
      indicatorsData.directionalMovementSignalWeight++;
      console.log(
          'Weight for SELL: ' +
          indicatorsData.directionalMovementSignalWeight.toString(),
      );
    } else if (
        indicatorsData.trend === 'UP' &&
        !indicatorsData.isDirectionalMovementChanged
    ) {
    }
    indicatorsData.prev1hDmi = dmi;
  });

  // getEmaStream({
  //   symbol: symbol,
  //   interval: '1m',
  //   period: 7,
  // }).subscribe(fastEMA => {
  //   indicatorsData.fast1mEMA = fastEMA;
  // });

  // getEmaStream({
  //   symbol: symbol,
  //   interval: '1m',
  //   period: 25,
  // }).subscribe(middleEMA => {
  //   indicatorsData.middle1mEMA = middleEMA;
  // });

  // getEmaStream({
  //   symbol: symbol,
  //   interval: '1m',
  //   period: 99,
  // }).subscribe(slowEMA => {
  //   indicatorsData.slow1mEMA = slowEMA;
  // });
  //
  // getEmaStream({
  //   symbol: symbol,
  //   interval: '1h',
  //   period: 7,
  // }).subscribe(fastEMA => {
  //   indicatorsData.fast1hEMA = fastEMA;
  // });
  //
  // getEmaStream({
  //   symbol: symbol,
  //   interval: '1h',
  //   period: 25,
  // }).subscribe(middleEMA => {
  //   indicatorsData.middle1hEMA = middleEMA;
  // });
  //
  // getEmaStream({
  //   symbol: symbol,
  //   interval: '1h',
  //   period: 99,
  // }).subscribe(slowEMA => {
  //   indicatorsData.slow1hEMA = slowEMA;
  // });

  await sendToRecipients(`INIT
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  with using the ADX STRATEGY
  Symbol: ${symbol.toUpperCase()}
  Initial USDT balance: ${initialUSDTBalance} USDT
  Initial ${cryptoCoin} balance: ${initialCryptoCoinBalance} ${cryptoCoin}
  `);

  getTradeStream({
    symbol: symbol,
    resource: RESOURCES.TRADE,
  })
    .pipe(pluck('price'), bufferCount(1, 1))
    .subscribe(trader);
})();

process.on('unhandledRejection', async (reason: Error) => {
  console.error(reason);
  await sendToRecipients(`ERROR
    ${reason.message}
    ${reason.stack}
  `);

  process.exit(1);
});
