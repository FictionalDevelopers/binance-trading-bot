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
  await processSubscriptions();
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
    tradeAmountPercent: 0.9,
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
    } = indicatorsData;

    if (botState.status === 'isPending') return;
    botState.updateState(
      'currentPrice',
      Number(pricesStream[pricesStream.length - 1]),
    );
    let ema1mSignal;
    if (
      (fast1mEMA / middle1mEMA) * 100 - 100 >= 0.1 &&
      (middle1mEMA / slow1mEMA) * 100 - 100 >= 0.15
    )
      ema1mSignal = 1;
    if ((slow1mEMA / fast1mEMA) * 100 - 100 >= 0.05) ema1mSignal = -1;
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
      // dmiAdxSignal + dmiMdiSignal === 2 &&
      // isAdxHigherThanMdi &&
      // rsi1dSignal &&
      // rsi1hSignalValue >= 53 &&
      rsi1mValue <= 50 &&
      rsi1mValue !== null &&
      rsi1hValue < 68 &&
      rsi1hValue !== null &&
      adx1mSignal === 1 &&
      mdi1hSignal === 1
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
      ((rsi1mValue >= 60 &&
        expectedProfitPercent >= 0.3 &&
        adx1mSignal === -1) ||
        ema1mSignal === -1 ||
        mdi1hSignal === -1)
      // mdi1hSignal === -1
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
    if (dmi.adx - dmi.pdi >= 2) indicatorsData.adx1mSignal = -1;
    if (dmi.pdi - dmi.adx >= 2) indicatorsData.adx1mSignal = 1;
    if (dmi.mdi - dmi.pdi >= 2) indicatorsData.mdi1mSignal = -1;
    if (dmi.pdi - dmi.mdi >= 2) indicatorsData.mdi1mSignal = 1;
  });

  getDmiStream({
    symbol: symbol,
    interval: '1h',
    period: 14,
  }).subscribe(dmi => {
    if (dmi.mdi > dmi.pdi) indicatorsData.mdi1hSignal = -1;
    if (dmi.pdi > dmi.mdi) indicatorsData.mdi1hSignal = 1;
  });

  getEmaStream({
    symbol: symbol,
    interval: '1m',
    period: 7,
  }).subscribe(fastEMA => {
    indicatorsData.fast1mEMA = fastEMA;
  });

  getEmaStream({
    symbol: symbol,
    interval: '1m',
    period: 25,
  }).subscribe(middleEMA => {
    indicatorsData.middle1mEMA = middleEMA;
  });

  getEmaStream({
    symbol: symbol,
    interval: '1m',
    period: 99,
  }).subscribe(slowEMA => {
    indicatorsData.slow1mEMA = slowEMA;
  });

  await sendToRecipients(`INIT
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  with using the STRATEGY 1.2(RSI + DMI) (LAST MODIFIED)
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
