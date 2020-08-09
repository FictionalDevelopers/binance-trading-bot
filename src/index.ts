import { pluck, bufferCount } from 'rxjs/operators';
import { format } from 'date-fns';
import { connect } from './db/connection';
import { RESOURCES } from './constants';
import { DATE_FORMAT } from './constants/date';
import { getTradeStream } from './api/trades.js';
import { processSubscriptions, sendToRecipients } from './services/telegram';
import { getDmiStream } from './indicators/dmi';
import { getRsiStream } from './indicators/rsi';
import { binance } from './api/binance';
import getBalances from './api/balance';
import { getExchangeInfo } from './api/exchangeInfo';
import { marketBuy, marketSell, getLastOrder } from './api/order';
import { getEmaStream } from './indicators/ema';

(async function() {
  await connect();
  // await processSubscriptions();
  const symbol = 'erdusdt';
  const cryptoCoin = symbol.toUpperCase().slice(0, -4);
  const { available: initialUSDTBalance } = await getBalances('USDT');
  const { available: initialCryptoCoinBalance } = await getBalances(cryptoCoin);
  const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');
  const ordersList = await getLastOrder(symbol.toUpperCase());
  const lastOrder = ordersList[ordersList.length - 1];

  // const symbol = process.argv[2];

  const botState = {
    strategy: 'ADX EMA STRATEGY',
    testMode: true,
    status: lastOrder.side === 'SELL' ? 'buy' : 'sell',
    currentProfit: null,
    totalProfit: null,
    tradeAmountPercent: 0.6,
    availableUSDT: initialUSDTBalance,
    availableCryptoCoin: initialCryptoCoinBalance,
    cummulativeQuoteQty: null,
    buyPrice: null,
    currentPrice: null,
    order: null,
    initialOrder: lastOrder,
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
    trend: null,
    adxBuySignalVolume: 0,
    adxSellSignalVolume: 0,
    willPriceGrow: false,
  };

  const trader = async pricesStream => {
    const { tradeAmountPercent } = botState;
    const { rsi1mValue, rsi1hValue } = indicatorsData;
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
    if (botState.status === 'buy' && indicatorsData.adxBuySignalVolume >= 2) {
      if (botState.testMode) {
        try {
          botState.updateState('status', 'isPending');
          botState.updateState(
            'buyPrice',
            Number(pricesStream[pricesStream.length - 1]),
          );
          console.log(`BUY
                             ${botState.strategy}
                             symbol: ${symbol.toUpperCase()}
                             price: ${botState.buyPrice}
                             date: ${format(new Date(), DATE_FORMAT)}
              `);
          botState.updateState('status', 'sell');
          return;
        } catch (e) {
          await sendToRecipients(`BUY ERROR
            ${JSON.stringify(e)}
      `);
          botState.updateState('status', 'buy');
        }
      } else {
        try {
          botState.updateState('status', 'isPending');
          botState.updateState(
            'buyPrice',
            Number(pricesStream[pricesStream.length - 1]),
          );

          const amount = binance.roundStep(
            (botState.availableUSDT * tradeAmountPercent) /
              botState.currentPrice,
            stepSize,
          );
          const order = await marketBuy(symbol.toUpperCase(), +amount);
          botState.updateState('buyPrice', Number(order.fills[0].price));
          botState.updateState('order', order);
          botState.updateState(
            'cummulativeQuoteQty',
            Number(order.cummulativeQuoteQty),
          );
          const { available: refreshedCryptoCoinBalance } = await getBalances(
            cryptoCoin,
          );
          botState.updateState(
            'availableCryptoCoin',
            refreshedCryptoCoinBalance,
          );
          await sendToRecipients(`BUY
                 ${botState.strategy}
                 Deal №: ${botState.dealsCount}
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.buyPrice} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Prebuy stablecoin balance: ${botState.availableUSDT} USDT
                 Cryptocoin balance: ${+botState.availableCryptoCoin} ${cryptoCoin}
                 OrderInfo: ${JSON.stringify(botState.order)}
             `);
          botState.updateState('status', 'sell');
          return;
        } catch (e) {
          await sendToRecipients(`BUY ERROR
            ${JSON.stringify(e)}
      `);
          botState.updateState('status', 'buy');
        }
      }
    }
    if (
      botState.status === 'sell' &&
      (indicatorsData.adxSellSignalVolume > 0 ||
        (indicatorsData.middle1mEMA > indicatorsData.fast1mEMA &&
          expectedProfitPercent < 1))
    ) {
      if (botState.testMode) {
        try {
          botState.updateState('status', 'isPending');
          botState.updateState('buyPrice', null);
          botState.updateState(
            'totalProfit',
            (botState.totalProfit += expectedProfitPercent),
          );
          console.log(`Sell
                            ${botState.strategy}
                            symbol: ${symbol.toUpperCase()}
                            price: ${pricesStream[pricesStream.length - 1]}
                            date: ${format(new Date(), DATE_FORMAT)}
                            current profit: ${expectedProfitPercent}%
                            total profit: ${botState.totalProfit}%
              `);
          botState.dealsCount++;
          indicatorsData.adxBuySignalVolume = 0;
          botState.updateState('status', 'buy');
        } catch (e) {
          await sendToRecipients(`SELL ERROR
            ${JSON.stringify(e)}
      `);
          botState.updateState('status', 'sell');
        }
      } else {
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
                 ${botState.strategy}
                 Deal №: ${botState.dealsCount}
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.order.fills[0].price} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Current profit: ${
                   botState.currentProfit
                 } USDT (${(currentProfit / botState.cummulativeQuoteQty) *
            100} %)
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
          botState.dealsCount++;
          indicatorsData.adxBuySignalVolume = 0;
          botState.updateState('status', 'buy');
        } catch (e) {
          await sendToRecipients(`SELL ERROR
            ${JSON.stringify(e)}
      `);
          botState.updateState('status', 'sell');
        }
      }
    }
  };

  // getRsiStream({
  //   symbol: symbol,
  //   period: 14,
  //   interval: '1m',
  // }).subscribe(rsi => {
  //   indicatorsData.rsi1mValue = rsi;
  // });
  //
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
    if (!indicatorsData.prev1mDmi) {
      indicatorsData.prev1mDmi = dmi;
      return;
    }
    if (dmi.adx > dmi.pdi) indicatorsData.adx1mSignal = -1;
    if (dmi.pdi > dmi.adx) indicatorsData.adx1mSignal = 1;
    if (dmi.mdi > dmi.pdi) {
      if (indicatorsData.trend === 'UP') {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
      indicatorsData.mdi1mSignal = -1;
      indicatorsData.trend = 'DOWN';
    }
    if (dmi.pdi > dmi.mdi) {
      if (indicatorsData.trend === 'DOWN') {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
      indicatorsData.mdi1mSignal = 1;
      indicatorsData.trend = 'UP';
    }

    if (indicatorsData.trend === 'DOWN') {
      if (indicatorsData.prev1mDmi.adx > dmi.adx) {
        indicatorsData.adxBuySignalVolume++;
        indicatorsData.adxSellSignalVolume = 0;
      }
      if (indicatorsData.prev1mDmi.adx < dmi.adx) {
        indicatorsData.adxSellSignalVolume++;
        indicatorsData.adxBuySignalVolume = 0;
      }
      if (indicatorsData.prev1mDmi.adx === dmi.adx) {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
    }
    if (indicatorsData.trend === 'UP') {
      if (indicatorsData.prev1mDmi.adx > dmi.adx) {
        indicatorsData.adxSellSignalVolume++;
        indicatorsData.adxBuySignalVolume = 0;
      }
      if (indicatorsData.prev1mDmi.adx < dmi.adx) {
        indicatorsData.adxBuySignalVolume++;
        indicatorsData.adxSellSignalVolume = 0;
      }
      if (indicatorsData.prev1mDmi.adx === dmi.adx) {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
    }
    if (indicatorsData.adxBuySignalVolume >= 2)
      indicatorsData.willPriceGrow = true;
    if (indicatorsData.adxSellSignalVolume > 0)
      indicatorsData.willPriceGrow = false;
    indicatorsData.prev1mDmi = dmi;
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
  if (botState.testMode) {
    console.log(`INIT TEST MODE
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  with using the ${botState.strategy}
  Symbol: ${symbol.toUpperCase()}
  status: ${botState.status}
  `);
  } else {
    await sendToRecipients(`INIT
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  with using the ${botState.strategy}
  Status: ${botState.status.toUpperCase}
  Symbol: ${symbol.toUpperCase()}
  Initial USDT balance: ${initialUSDTBalance} USDT
  Initial ${cryptoCoin} balance: ${initialCryptoCoinBalance} ${cryptoCoin}
  Initial order: ${
    botState.initialOrder.side
  } ${botState.initialOrder.symbol.toUpperCase()} ${format(
      botState.initialOrder.time,
      DATE_FORMAT,
    )}
  `);
  }

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
