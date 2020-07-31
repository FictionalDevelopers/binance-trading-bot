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
    adx1hSignal: 0,
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
    // isDirectionalMovementChanged: false,
    directional1hMovementSignalWeight: 0,
    directional1mMovementSignalWeight: 0,
    trend: null,
    trend1m: null,
    trend1h: null,
  };

  const trader = async pricesStream => {
    const { tradeAmountPercent } = botState;
    const {
      directional1hMovementSignalWeight,
      directional1mMovementSignalWeight,
      trend1m,
      trend1h,
    } = indicatorsData;
    let adx1mActionSignal, adx1hActionSignal;
    if (trend1h === 'DOWN') {
      if (directional1hMovementSignalWeight > 0) adx1hActionSignal = 'BUY';
      if (directional1hMovementSignalWeight < 0) adx1hActionSignal = 'SELL';
    }
    if (trend1h === 'UP') {
      if (directional1hMovementSignalWeight > 0) adx1hActionSignal = 'SELL';
      if (directional1hMovementSignalWeight < 0) adx1hActionSignal = 'BUY';
    }
    if (trend1m === 'DOWN') {
      if (directional1mMovementSignalWeight > 0) adx1mActionSignal = 'BUY';
      if (directional1mMovementSignalWeight < 0) adx1mActionSignal = 'SELL';
    }
    if (trend1m === 'UP') {
      if (directional1mMovementSignalWeight > 0) adx1mActionSignal = 'SELL';
      if (directional1mMovementSignalWeight < 0) adx1mActionSignal = 'BUY';
    }
    console.log('1h signal: ' + adx1hActionSignal);
    console.log('1m signal: ' + adx1mActionSignal);

    if (botState.status === 'isPending') return;

    botState.updateState(
      'currentPrice',
      Number(pricesStream[pricesStream.length - 1]),
    );
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
      adx1mActionSignal === 'BUY' &&
      adx1hActionSignal === 'BUY'
    ) {
      try {
        botState.updateState('status', 'isPending');
        // const amount = binance.roundStep(
        //   (botState.availableUSDT * tradeAmountPercent) / botState.currentPrice,
        //   stepSize,
        // );
        // const order = await marketBuy(symbol.toUpperCase(), +amount);
        botState.updateState(
          'buyPrice',
          Number(pricesStream[pricesStream.length - 1]),
        );
        // botState.updateState('order', order);
        // const { available: refreshedCryptoCoinBalance } = await getBalances(
        //   cryptoCoin,
        // );
        // botState.updateState('availableCryptoCoin', refreshedCryptoCoinBalance);
        // await sendToRecipients(`BUY
        //          STRATEGY 1.2 (RSI + DMI) MODIFIED
        //          Deal №: ${botState.dealsCount}
        //          Symbol: ${symbol.toUpperCase()}
        //          Price: ${botState.buyPrice} USDT
        //          Date: ${format(new Date(), DATE_FORMAT)}
        //          Prebuy stablecoin balance: ${botState.availableUSDT} USDT
        //          Cryptocoin balance: ${+botState.availableCryptoCoin} ${cryptoCoin}
        //          OrderInfo: ${JSON.stringify(botState.order)}
        //      `);
        console.log(`BUY
                             ADX STRATEGY
                             symbol: ${symbol.toUpperCase()}
                             price: ${botState.buyPrice}
                             date: ${format(new Date(), DATE_FORMAT)}
              `);

        indicatorsData.directional1mMovementSignalWeight = 0;
        indicatorsData.directional1hMovementSignalWeight = 0;
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
      adx1mActionSignal === 'SELL' &&
      adx1hActionSignal === 'SELL'
    ) {
      try {
        botState.updateState('status', 'isPending');
        botState.updateState('buyPrice', null);
        // const amount = binance.roundStep(
        //   Number(botState.availableCryptoCoin),
        //   stepSize,
        // );
        // const order = await marketSell(symbol.toUpperCase(), +amount);
        // botState.updateState('order', order);
        // const { available: refreshedUSDTBalance } = await getBalances('USDT');
        // const currentProfit =
        //   Number(refreshedUSDTBalance) - Number(botState.availableUSDT);
        // botState.updateState('currentProfit', currentProfit);
        // botState.updateState('availableUSDT', +refreshedUSDTBalance);
        // botState.updateState(
        //   'totalProfit',
        //   Number(refreshedUSDTBalance) - Number(initialUSDTBalance),
        // );
        // const { available: refreshedCryptoCoinBalance } = await getBalances(
        //   cryptoCoin,
        // );
        // botState.updateState(
        //   'availableCryptoCoin',
        //   +refreshedCryptoCoinBalance,
        // );
        //
        // await sendToRecipients(`SELL
        //          STRATEGY 1.2(RSI + DMI)
        //          Deal №: ${botState.dealsCount}
        //          Symbol: ${symbol.toUpperCase()}
        //          Price: ${botState.order.fills[0].price} USDT
        //          Date: ${format(new Date(), DATE_FORMAT)}
        //          Current profit: ${
        //            botState.currentProfit
        //          } USDT (${expectedProfitPercent} %)
        //          Total profit: ${botState.totalProfit} USDT
        //          Average deal profit: ${botState.totalProfit /
        //            botState.dealsCount} USDT/deal
        //          Stablecoin balance: ${botState.availableUSDT} USDT
        //          Cryptocoin balance: ${+botState.availableCryptoCoin} ${cryptoCoin}
        //          OrderInfo: ${JSON.stringify(botState.order)}
        //          Work duration: ${format(
        //            botState.startTime - new Date().getTime(),
        //            DATE_FORMAT,
        //          )}
        //      `);

        console.log(`Sell
                            ADX STRATEGY
                            symbol: ${symbol.toUpperCase()}
                            price: ${pricesStream[pricesStream.length - 1]}
                            date: ${format(new Date(), DATE_FORMAT)}
              `);
        botState.dealsCount++;
        indicatorsData.directional1mMovementSignalWeight = 0;
        indicatorsData.directional1hMovementSignalWeight = 0;
        botState.updateState('status', 'buy');
      } catch (e) {
        await sendToRecipients(`SELL ERROR
            ${JSON.stringify(e)}
      `);
        botState.updateState('status', 'sell');
      }
    }
  };

  // getRsiStream({
  //   symbol: symbol,
  //   period: 14,
  //   interval: '1m',
  // }).subscribe(rsi => {
  //   if (!indicatorsData.rsi1mValue) {
  //     indicatorsData.rsi1mValue = rsi;
  //     return;
  //   }
  //   indicatorsData.rsi1mValue = rsi;
  // });

  // getRsiStream({
  //   symbol: symbol,
  //   period: 14,
  //   interval: '1h',
  // }).subscribe(rsi => {
  //   indicatorsData.rsi1hValue = rsi;
  // });

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
      if (indicatorsData.trend1h === 'UP')
        indicatorsData.directional1hMovementSignalWeight = 0;
      indicatorsData.mdi1hSignal = -1;
      indicatorsData.trend1h = 'DOWN';
    }
    if (dmi.pdi > dmi.mdi) {
      if (indicatorsData.trend1h === 'DOWN')
        indicatorsData.directional1hMovementSignalWeight = 0;
      indicatorsData.mdi1hSignal = 1;
      indicatorsData.trend1h = 'UP';
    }
    // console.log(indicatorsData.trend1h);
    // if (indicatorsData.prev1mDmi.adx === dmi.adx) return;

    // indicatorsData.isDirectional1hMovementChanged =
    //   indicatorsData.prev1hDmi.adx > dmi.adx;
    if (indicatorsData.prev1hDmi.adx > dmi.adx) {
      if (indicatorsData.trend1h === 'UP')
        indicatorsData.directional1hMovementSignalWeight++;
      if (indicatorsData.trend1h === 'DOWN')
        indicatorsData.directional1hMovementSignalWeight--;
    }
    if (indicatorsData.prev1hDmi.adx < dmi.adx) {
      if (indicatorsData.trend1h === 'UP')
        indicatorsData.directional1hMovementSignalWeight--;
      if (indicatorsData.trend1h === 'DOWN')
        indicatorsData.directional1hMovementSignalWeight++;
    }

    indicatorsData.prev1hDmi = dmi;
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
    if (dmi.adx > dmi.pdi) indicatorsData.adx1mSignal = -1;
    if (dmi.pdi > dmi.adx) indicatorsData.adx1mSignal = 1;
    if (dmi.mdi > dmi.pdi) {
      if (indicatorsData.trend1m === 'UP')
        indicatorsData.directional1mMovementSignalWeight = 0;
      indicatorsData.mdi1mSignal = -1;
      indicatorsData.trend1m = 'DOWN';
    }
    if (dmi.pdi > dmi.mdi) {
      if (indicatorsData.trend1m === 'DOWN')
        indicatorsData.directional1mMovementSignalWeight = 0;
      indicatorsData.mdi1mSignal = 1;
      indicatorsData.trend1m = 'UP';
    }
    // console.log(indicatorsData.trend1m);
    // if (indicatorsData.prev1mDmi.adx === dmi.adx) return;

    // indicatorsData.isDirectional1mMovementChanged =
    //   indicatorsData.prev1mDmi.adx > dmi.adx;
    if (indicatorsData.prev1mDmi.adx > dmi.adx) {
      if (indicatorsData.trend1m === 'UP')
        indicatorsData.directional1mMovementSignalWeight++;
      if (indicatorsData.trend1m === 'DOWN')
        indicatorsData.directional1mMovementSignalWeight--;
    }
    if (indicatorsData.prev1mDmi.adx < dmi.adx) {
      if (indicatorsData.trend1m === 'UP')
        indicatorsData.directional1mMovementSignalWeight--;
      if (indicatorsData.trend1m === 'DOWN')
        indicatorsData.directional1mMovementSignalWeight++;
    }

    indicatorsData.prev1mDmi = dmi;
  });

  // getEmaStream({
  //   symbol: symbol,
  //   interval: '1m',
  //   period: 7,
  // }).subscribe(fastEMA => {
  //   indicatorsData.fast1mEMA = fastEMA;
  // });
  //
  // getEmaStream({
  //   symbol: symbol,
  //   interval: '1m',
  //   period: 25,
  // }).subscribe(middleEMA => {
  //   indicatorsData.middle1mEMA = middleEMA;
  // });
  //
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

  // await sendToRecipients(`INIT
  // Bot started working at: ${format(new Date(), DATE_FORMAT)}
  // with using the STRATEGY 1.2(RSI + DMI) (LAST MODIFIED)
  // Symbol: ${symbol.toUpperCase()}
  // Initial USDT balance: ${initialUSDTBalance} USDT
  // Initial ${cryptoCoin} balance: ${initialCryptoCoinBalance} ${cryptoCoin}
  // `);

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
