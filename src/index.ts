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
import { marketBuy, getOrdersList, marketSellAction } from './api/order';
// import { getEMASignal } from './components/ema-signals';
import { getDMISignal } from './components/dmi-signals';
import { getRSISignal } from './components/rsi-signals';
import { getEmaStream } from './indicators/ema';

const indicatorsData = {
  emaPoints: [],
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
  rsi1m: {
    rsiValue: null,
    prevRsi: null,
    sellNow: false,
    buyNow: false,
  },
  slow1mEMA: 0,
  middle1mEMA: 0,
  fast1mEMA: 0,
  slow1hEMA: 0,
  middle1hEMA: 0,
  fast5mEMA: 0,
  slow5mEMA: 0,
  middle5mEMA: 0,
  fast1hEMA: 0,
  slow15mEMA: 0,
  middle15mEMA: 0,
  fast15mEMA: 0,
  summaryEMABuySignal: false,
  ema25Prev: null,
  emaSignal: null,
  emaCanIBuy: true,
};

const timer = setInterval(() => {
  if (indicatorsData.emaPoints.length === 0) {
    indicatorsData.emaCanIBuy = true;
    indicatorsData.emaPoints.push(Number(indicatorsData.slow1mEMA).toFixed(4));
    // indicatorsData.ema25Prev = Number(indicatorsData.slow1mEMA).toFixed(4);
    return;
  }

  if (indicatorsData.emaPoints.length < 3) {
    indicatorsData.emaPoints.push(Number(indicatorsData.slow1mEMA).toFixed(4));
  } else {
    indicatorsData.emaPoints.length = 0;
    indicatorsData.emaPoints.push(Number(indicatorsData.slow1mEMA).toFixed(4));
  }

  if (
    indicatorsData.emaPoints.length === 3 &&
    indicatorsData.emaPoints[1] > indicatorsData.emaPoints[0] &&
    indicatorsData.emaPoints[2] > indicatorsData.emaPoints[1]
  ) {
    indicatorsData.emaSignal = 'buy';
  }

  if (
    indicatorsData.emaPoints.length === 3 &&
    indicatorsData.emaPoints[2] < indicatorsData.emaPoints[1] &&
    indicatorsData.emaPoints[1] < indicatorsData.emaPoints[0]
  ) {
    indicatorsData.emaSignal = 'sell';
    indicatorsData.emaCanIBuy = true;
  }

  // else if (
  //   (indicatorsData.ema25Prev / Number(indicatorsData.slow1mEMA).toFixed(4)) *
  //     100 -
  //     100 >=
  //   0.4
  // ) {
  //   indicatorsData.emaSellSignal = true;
  //   indicatorsData.emaBuySignal = false;
  // }
  // console.log('Prev: ' + indicatorsData.ema25Prev);
  // indicatorsData.ema25Prev = Number(indicatorsData.slow1mEMA).toFixed(4);
  // console.log('Current: ' + indicatorsData.slow1mEMA);
  console.log(indicatorsData.emaPoints);
  console.log(
    'Curr/ Prev',
    (Number(indicatorsData.slow1mEMA).toFixed(4) /
      indicatorsData.emaPoints[0]) *
      100 -
      100,
  );
}, 60000);

export const getEMASignal = (symbol, timeFrame, indicatorsData) => {
  getEmaStream({
    symbol: symbol,
    interval: timeFrame,
    period: 7,
  }).subscribe(fastEMA => {
    indicatorsData[`fast${timeFrame}EMA`] = fastEMA;
  });

  getEmaStream({
    symbol: symbol,
    interval: timeFrame,
    period: 25,
  }).subscribe(middleEMA => {
    indicatorsData[`middle${timeFrame}EMA`] = middleEMA;
    // console.log(middleEMA);
  });

  getEmaStream({
    symbol: symbol,
    interval: timeFrame,
    period: 99,
  }).subscribe(slowEMA => {
    indicatorsData[`slow${timeFrame}EMA`] = slowEMA;
    console.log(slowEMA);
  });
};

(async function() {
  await connect();
  // await processSubscriptions();
  const symbol = 'linkusdt';
  const cryptoCoin = symbol.toUpperCase().slice(0, -4);
  const { available: initialUSDTBalance } = await getBalances('USDT');
  const { available: initialCryptoCoinBalance } = await getBalances(cryptoCoin);
  const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');
  const ordersList = await getOrdersList(symbol.toUpperCase());
  const lastOrder = ordersList[ordersList.length - 1] || null;

  // const symbol = process.argv[2];

  const botState = {
    strategy: 'TRENDS CATCHER STRATEGY',
    testMode: true,
    useProfitLevels: false,
    useEMAStopLoss: false,
    // status: lastOrder ? (lastOrder.side === 'SELL' ? 'buy' : 'sell') : 'BUY',
    status: 'buy',
    profitLevels: {
      '1': {
        id: 1,
        profitPercent: 1.2,
        amountPercent: 0.5,
        isFilled: false,
      },
      '2': {
        id: 2,
        profitPercent: 3,
        amountPercent: 0.5,
        isFilled: false,
      },
    },
    currentProfit: null,
    totalProfit: null,
    totalPercentProfit: null,
    tradeAmountPercent: 0.9,
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
    stopLoss: null,
    prevPrice: null,
    updateState: function(fieldName, value) {
      this[`${fieldName}`] = value;
    },
  };

  const trader = async pricesStream => {
    const { tradeAmountPercent } = botState;
    // const { rsi1mValue, rsi1hValue } = indicatorsData;
    if (botState.status === 'isPending') return;
    if (botState.useProfitLevels) {
      if (
        botState.profitLevels['1'].isFilled &&
        botState.profitLevels['2'].isFilled
      ) {
        botState.profitLevels['1'].isFilled = false;
        botState.profitLevels['2'].isFilled = false;
        botState.updateState('status', 'buy');
      }
    }
    // const summaryEMABuySignal =
    //   indicatorsData.fast15mEMA > indicatorsData.middle15mEMA &&
    //   indicatorsData.middle15mEMA > indicatorsData.slow15mEMA &&
    //   indicatorsData.fast1mEMA > indicatorsData.middle1mEMA &&
    //   indicatorsData.middle1mEMA > indicatorsData.slow1mEMA;

    // indicatorsData.fast15mEMA >= indicatorsData.middle15mEMA;
    // indicatorsData.fast1hEMA > indicatorsData.middle1hEMA;

    // indicatorsData.fast1hEMA > indicatorsData.middle1hEMA;
    // indicatorsData.middle1hEMA > indicatorsData.slow1hEMA;

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
      indicatorsData.emaSignal === 'buy' &&
      indicatorsData.rsi1m.rsiValue < 69 &&
      indicatorsData.emaCanIBuy
      // indicatorsData.emaBuySignal
      // &&
      // summaryEMABuySignal &&
      // indicatorsData.dmi5m.willPriceGrow &&
      // indicatorsData.dmi1m.adxSignal === 1
      // &&
      // indicatorsData.rsi1m.rsiValue < 68
      // &&
      // indicatorsData.middle1mEMA < indicatorsData.slow1mEMA
      // indicatorsData.fast1mEMA > indicatorsData.middle1mEMA &&
      // indicatorsData.middle1mEMA > indicatorsData.slow1mEMA
      // summaryEMABuySignal
    ) {
      if (botState.testMode) {
        try {
          botState.updateState('status', 'isPending');
          botState.updateState(
            'buyPrice',
            Number(pricesStream[pricesStream.length - 1]),
          );
          await sendToRecipients(`BUY (LOCAL)
                             ${botState.strategy}
                             Deal №: ${botState.dealsCount}
                             symbol: ${symbol.toUpperCase()}
                             price: ${botState.buyPrice}
                             date: ${format(new Date(), DATE_FORMAT)}
              `);
          botState.updateState('status', 'sell');
          // indicatorsData.summaryEMABuySignal = summaryEMABuySignal;
          botState.updateState('prevPrice', botState.currentPrice);
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
            33 / botState.currentPrice,
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
          // indicatorsData.summaryEMABuySignal = summaryEMABuySignal;
          botState.updateState('prevPrice', botState.currentPrice);
          return;
        } catch (e) {
          await sendToRecipients(`BUY ERROR
            ${JSON.stringify(e)}
      `);
          const { available: refreshedUSDTBalance } = await getBalances('USDT');
          botState.updateState('availableUSDT', +refreshedUSDTBalance);
          botState.updateState('status', 'buy');
        }
      }
    }
    if (
      botState.status === 'sell' &&
      indicatorsData.emaSignal === 'sell'
      // (indicatorsData.emaSellSignal || indicatorsData.rsi1m.rsiValue >= 70)
      // indicatorsData.middle15mEMA < indicatorsData.slow15mEMA
      // (indicatorsData.middle1mEMA < indicatorsData.slow1mEMA ||
      //   (indicatorsData.dmi1m.adxSignal === -1 && expectedProfitPercent >= 0))
      // indicatorsData.middle15mEMA < indicatorsData.slow15mEMA

      // ((!indicatorsData.dmi5m.willPriceGrow && expectedProfitPercent < 0) ||
      //   (indicatorsData.rsi1m.rsiValue >= 69 && expectedProfitPercent > 0))

      // ||
      // (botState.currentPrice / botState.prevPrice <= 0.9999 &&
      //   expectedProfitPercent >= 0.2)
      // indicatorsData.rsi1m.rsiValue >= 70 &&
      // expectedProfitPercent >= 1

      // indicatorsData.fast1mEMA < indicatorsData.middle1mEMA ||
      // expectedProfitPercent <= -0.5 ||
      // (indicatorsData.rsi1m.rsiValue > 68 &&
      //   ((botState.prevPrice !== null &&
      //     botState.currentPrice <= botState.prevPrice * 0.99 &&
      //     expectedProfitPercent >= 0.5) ||
      //     expectedProfitPercent <= -1))
      // (indicatorsData.rsi1m.rsiValue > 70 &&
      //   indicatorsData.rsi1m.sellNow &&
      //   (expectedProfitPercent >= 0.5 || expectedProfitPercent <= -1))
    ) {
      await marketSellAction(
        null,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        indicatorsData,
        stepSize,
        initialUSDTBalance,
        'EMA SIGNAL',
      );
      indicatorsData.emaCanIBuy = true;
      return;
    }
    if (
      botState.status === 'sell' &&
      expectedProfitPercent <= 0.5
      // (indicatorsData.emaSellSignal || indicatorsData.rsi1m.rsiValue >= 70)
      // indicatorsData.middle15mEMA < indicatorsData.slow15mEMA
      // (indicatorsData.middle1mEMA < indicatorsData.slow1mEMA ||
      //   (indicatorsData.dmi1m.adxSignal === -1 && expectedProfitPercent >= 0))
      // indicatorsData.middle15mEMA < indicatorsData.slow15mEMA

      // ((!indicatorsData.dmi5m.willPriceGrow && expectedProfitPercent < 0) ||
      //   (indicatorsData.rsi1m.rsiValue >= 69 && expectedProfitPercent > 0))

      // ||
      // (botState.currentPrice / botState.prevPrice <= 0.9999 &&
      //   expectedProfitPercent >= 0.2)
      // indicatorsData.rsi1m.rsiValue >= 70 &&
      // expectedProfitPercent >= 1

      // indicatorsData.fast1mEMA < indicatorsData.middle1mEMA ||
      // expectedProfitPercent <= -0.5 ||
      // (indicatorsData.rsi1m.rsiValue > 68 &&
      //   ((botState.prevPrice !== null &&
      //     botState.currentPrice <= botState.prevPrice * 0.99 &&
      //     expectedProfitPercent >= 0.5) ||
      //     expectedProfitPercent <= -1))
      // (indicatorsData.rsi1m.rsiValue > 70 &&
      //   indicatorsData.rsi1m.sellNow &&
      //   (expectedProfitPercent >= 0.5 || expectedProfitPercent <= -1))
    ) {
      await marketSellAction(
        null,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        indicatorsData,
        stepSize,
        initialUSDTBalance,
        'STOP LOSS',
      );
      indicatorsData.emaCanIBuy = true;
      return;
    }

    if (
      botState.status === 'sell' &&
      indicatorsData.rsi1m.rsiValue >= 70
      // (indicatorsData.emaSellSignal || indicatorsData.rsi1m.rsiValue >= 70)
      // indicatorsData.middle15mEMA < indicatorsData.slow15mEMA
      // (indicatorsData.middle1mEMA < indicatorsData.slow1mEMA ||
      //   (indicatorsData.dmi1m.adxSignal === -1 && expectedProfitPercent >= 0))
      // indicatorsData.middle15mEMA < indicatorsData.slow15mEMA

      // ((!indicatorsData.dmi5m.willPriceGrow && expectedProfitPercent < 0) ||
      //   (indicatorsData.rsi1m.rsiValue >= 69 && expectedProfitPercent > 0))

      // ||
      // (botState.currentPrice / botState.prevPrice <= 0.9999 &&
      //   expectedProfitPercent >= 0.2)
      // indicatorsData.rsi1m.rsiValue >= 70 &&
      // expectedProfitPercent >= 1

      // indicatorsData.fast1mEMA < indicatorsData.middle1mEMA ||
      // expectedProfitPercent <= -0.5 ||
      // (indicatorsData.rsi1m.rsiValue > 68 &&
      //   ((botState.prevPrice !== null &&
      //     botState.currentPrice <= botState.prevPrice * 0.99 &&
      //     expectedProfitPercent >= 0.5) ||
      //     expectedProfitPercent <= -1))
      // (indicatorsData.rsi1m.rsiValue > 70 &&
      //   indicatorsData.rsi1m.sellNow &&
      //   (expectedProfitPercent >= 0.5 || expectedProfitPercent <= -1))
    ) {
      await marketSellAction(
        null,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        indicatorsData,
        stepSize,
        initialUSDTBalance,
        'RSI SIGNAL',
      );
      indicatorsData.emaCanIBuy = false;
      return;
    }

    if (botState.useEMAStopLoss) {
      if (
        botState.status === 'sell' &&
        indicatorsData.fast1mEMA < indicatorsData.middle1mEMA
      ) {
        await marketSellAction(
          null,
          symbol,
          botState,
          cryptoCoin,
          expectedProfitPercent,
          pricesStream,
          indicatorsData,
          stepSize,
          initialUSDTBalance,
          'EMA SIGNAL',
        );
        return;
      }
    }

    if (botState.useProfitLevels) {
      if (
        botState.status === 'sell' &&
        expectedProfitPercent >= botState.profitLevels['1'].profitPercent &&
        !botState.profitLevels['1'].isFilled
      ) {
        await marketSellAction(
          botState.profitLevels['1'],
          symbol,
          botState,
          cryptoCoin,
          expectedProfitPercent,
          pricesStream,
          indicatorsData,
          stepSize,
          initialUSDTBalance,
          null,
        );
        return;
      }
      if (
        botState.status === 'sell' &&
        expectedProfitPercent >= botState.profitLevels['2'].profitPercent &&
        !botState.profitLevels['2'].isFilled
      ) {
        await marketSellAction(
          botState.profitLevels[2],
          symbol,
          botState,
          cryptoCoin,
          expectedProfitPercent,
          pricesStream,
          indicatorsData,
          stepSize,
          initialUSDTBalance,
          null,
        );
        return;
      }
    }

    botState.updateState('prevPrice', botState.currentPrice);
  };

  // getDMISignal(symbol, '1h', indicatorsData.dmi1h);
  // getDMISignal(symbol, '5m', indicatorsData.dmi5m);
  // getDMISignal(symbol, '1m', indicatorsData.dmi1m);
  getRSISignal(symbol, '1m', indicatorsData.rsi1m);
  getEMASignal(symbol, '1m', indicatorsData);
  // getEMASignal(symbol, '15m', indicatorsData);
  // getEMASignal(symbol, '1h', indicatorsData);

  if (botState.testMode) {
    await sendToRecipients(`INIT TEST MODE
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
    ${JSON.stringify(reason)}
  `);

  process.exit(1);
});
