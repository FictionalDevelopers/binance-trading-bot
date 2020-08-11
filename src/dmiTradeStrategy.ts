import { pluck, bufferCount } from 'rxjs/operators';
import { format } from 'date-fns';
import { connect } from './db/connection';
import { RESOURCES } from './constants';
import { DATE_FORMAT } from './constants/date';
import { getTradeStream } from './api/trades.js';
import { processSubscriptions, sendToRecipients } from './services/telegram';
import { binance } from './api/binance';
import getBalances from './api/balance';
import { getExchangeInfo } from './api/exchangeInfo';
import { marketBuy, marketSell, getOrdersList } from './api/order';
import { getEMASignal } from './components/ema-signals';
import { getDMISignal } from './components/dmi-signals';
import { getRSISignal } from './components/rsi-signals';

(async function() {
  await connect();
  // await processSubscriptions();
  const symbol = 'zilusdt';
  const cryptoCoin = symbol.toUpperCase().slice(0, -4);
  const { available: initialUSDTBalance } = await getBalances('USDT');
  const { available: initialCryptoCoinBalance } = await getBalances(cryptoCoin);
  const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');
  const ordersList = await getOrdersList(symbol.toUpperCase());
  const lastOrder = ordersList[ordersList.length - 1];

  // const symbol = process.argv[2];

  const botState = {
    strategy: 'TRENDS CATCHER STRATEGY',
    testMode: false,
    // status: lastOrder.side === 'SELL' ? 'buy' : 'sell',
    status: 'buy',
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
    dmi5m: {
      prevDmi: null,
      dmiMdiSignal: 0,
      adxSignal: 0,
      mdiSignal: 0,
      adxBuySignalVolume: 0,
      adxSellSignalVolume: 0,
      willPriceGrow: false,
      trend: null,
    },
    dmi1h: {
      prevDmi: null,
      dmiMdiSignal: 0,
      adxSignal: 0,
      mdiSignal: 0,
      adxBuySignalVolume: 0,
      adxSellSignalVolume: 0,
      willPriceGrow: false,
      trend: null,
    },
    dmi1m: {
      prevDmi: null,
      dmiMdiSignal: 0,
      adxSignal: 0,
      mdiSignal: 0,
      adxBuySignalVolume: 0,
      adxSellSignalVolume: 0,
      willPriceGrow: false,
      trend: null,
    },
    rsi1mValue: null,
    rsi1hValue: null,
    slow1mEMA: 0,
    middle1mEMA: 0,
    fast1mEMA: 0,
    slow1hEMA: 0,
    middle1hEMA: 0,
    fast1hEMA: 0,
    slow15mEMA: 0,
    middle15mEMA: 0,
    fast15mEMA: 0,
    summaryEMABuySignal: false,
  };

  const trader = async pricesStream => {
    const { tradeAmountPercent } = botState;
    const { rsi1mValue, rsi1hValue } = indicatorsData;
    if (botState.status === 'isPending') return;
    const summaryEMABuySignal =
      indicatorsData.fast1mEMA > indicatorsData.middle1mEMA &&
      indicatorsData.middle1mEMA > indicatorsData.slow1mEMA &&
      indicatorsData.fast15mEMA > indicatorsData.middle15mEMA &&
      indicatorsData.fast1hEMA > indicatorsData.middle1hEMA;
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
      rsi1mValue <= 68 &&
      indicatorsData.dmi1h.willPriceGrow &&
      summaryEMABuySignal
    ) {
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
          indicatorsData.summaryEMABuySignal = summaryEMABuySignal;
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
          indicatorsData.summaryEMABuySignal = summaryEMABuySignal;
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
      (!indicatorsData.dmi1h.willPriceGrow ||
        expectedProfitPercent <= -1 ||
        (rsi1mValue >= 70 && !indicatorsData.dmi5m.willPriceGrow))
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
          indicatorsData.dmi1h.willPriceGrow = false;
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
          indicatorsData.dmi1h.willPriceGrow = false;
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

  getDMISignal(symbol, '1h', indicatorsData.dmi1h);
  getDMISignal(symbol, '5m', indicatorsData.dmi5m);
  getRSISignal(symbol, '1m', indicatorsData);
  getEMASignal(symbol, '1m', indicatorsData);
  getEMASignal(symbol, '15m', indicatorsData);
  getEMASignal(symbol, '1h', indicatorsData);

  if (botState.testMode) {
    console.log(`INIT TEST MODE
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  with using the ${botState.strategy}
  Symbol: ${symbol.toUpperCase()}
  `);
  } else {
    await sendToRecipients(`INIT
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  with using the ${botState.strategy}
  Status: ${botState.status.toUpperCase()}
  Symbol: ${symbol.toUpperCase()}
  Initial USDT balance: ${initialUSDTBalance} USDT
  Initial ${cryptoCoin} balance: ${initialCryptoCoinBalance} ${cryptoCoin}
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
