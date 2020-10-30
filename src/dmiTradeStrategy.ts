import { pluck, bufferCount } from 'rxjs/operators';
import { format } from 'date-fns';
import { connect } from './db/connection';
import { RESOURCES } from './constants';
import { DATE_FORMAT } from './constants/date';
import { getTradeStream } from './api/trades.js';
import { sendToRecipients } from './services/telegram';
import getBalances from './api/balance';
import { getExchangeInfo } from './api/exchangeInfo';
import { marketSellAction, marketBuyAction, getOrdersList } from './api/order';
import { getEMASignal, runEMAInterval } from './components/ema-signals';
import { getDMISignal } from './components/dmi-signals';
import { getRSISignal } from './components/rsi-signals';
import { getStochRSISignal } from './components/stochRSI-signals';

(async function() {
  await connect();
  // await processSubscriptions();
  const symbol = 'linkusdt';
  const cryptoCoin = symbol.toUpperCase().slice(0, -4);
  const { available: initialUSDTBalance } = await getBalances('USDT');
  const { available: initialCryptoCoinBalance } = await getBalances(cryptoCoin);
  const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');
  // const openOrders = await checkAllOpenOrders(symbol.toUpperCase());
  const ordersList = await getOrdersList(symbol.toUpperCase());
  const lastOrder = ordersList[ordersList.length - 1] || null;
  const workingDeposit = 470;
  // const symbol = process.argv[2];

  const botState = {
    strategies: {
      upTrend: {
        enabled: false,
        stopLoss: false,
      },
      downTrend: {
        enabled: false,
        stopLoss: false,
      },
      upFlat: {
        enabled: false,
        stopLoss: false,
      },
      downFlat: {
        enabled: false,
        stopLoss: false,
      },
      stochRsi: {
        enabled: true,
        stopLoss: false,
      },
      trendsCatcher: {
        enabled: false,
        stopLoss: false,
      },
    },
    buyReason: null,
    enabledLimits: false,
    sellError: false,
    emaStartPoint: null,
    strategy: 'MIXED STRATEGY',
    testMode: true,
    useProfitLevels: false,
    useEMAStopLoss: false,
    status: lastOrder ? (lastOrder.side === 'SELL' ? 'buy' : 'sell') : 'BUY',
    // status: 'buy',
    profitLevels: {
      '1': {
        id: 1,
        profitPercent: 1,
        amountPercent: 0.5,
        isFilled: false,
      },
      '2': {
        id: 2,
        profitPercent: 2,
        amountPercent: 0.5,
        isFilled: false,
      },
      '3': {
        id: 3,
        profitPercent: 4,
        amountPercent: 0.5,
        isFilled: false,
      },
    },
    currentProfit: null,
    totalProfit: null,
    totalPercentProfit: null,
    tradeAmountPercent: 0.95,
    availableUSDT: initialUSDTBalance,
    availableCryptoCoin: initialCryptoCoinBalance,
    cummulativeQuoteQty: null,
    buyPrice: null,
    currentPrice: null,
    order: null,
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

  const indicatorsData = {
    stochRsiSignal: {
      stoch1m: null,
      stoch5m: null,
      stoch15m: null,
      stoch1h: null,
    },
    emaSignal: null,
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
    rsi5m: {
      rsiValue: null,
      prevRsi: null,
      sellNow: false,
      buyNow: false,
    },
    rsi15m: {
      rsiValue: null,
      prevRsi: null,
      sellNow: false,
      buyNow: false,
    },
    slow1mEMA: 0,
    middle1mEMA: 0,
    fast1mEMA: 0,
    slow5mEMA: 0,
    middle5mEMA: 0,
    fast5mEMA: 0,
    slow1hEMA: 0,
    middle1hEMA: 0,
    fast1hEMA: 0,
    slow15mEMA: 0,
    middle15mEMA: 0,
    fast15mEMA: 0,
    summaryEMABuySignal: false,
    rsiRebuy: {
      value: true,
    },
  };

  // runEMAInterval(indicatorsData, botState);

  // const rsiRebuyChecker = setInterval(() => {
  //   if (
  //     indicatorsData.rsi1m.rsiValue !== null &&
  //     indicatorsData.rsi5m.rsiValue !== null &&
  //     indicatorsData.rsi5m.rsiValue <= 33
  //   )
  //     indicatorsData.rsiRebuy.value = true;
  //   if (
  //     indicatorsData.rsi1m.rsiValue >= 41 &&
  //     indicatorsData.rsi5m.rsiValue >= 41
  //   )
  //     if (botState.status) indicatorsData.rsiRebuy.value = false;
  // }, 1000);

  const trader = async pricesStream => {
    const { tradeAmountPercent } = botState;
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

    const conditions = {
      upTrend: {
        buy:
          botState.status === 'buy' &&
          Number(
            (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
          ) >= 0.1 &&
          // Number(
          //   (indicatorsData.fast15mEMA / indicatorsData.middle15mEMA) * 100 -
          //     100,
          // ) >= 0.1 &&
          indicatorsData.fast1mEMA > indicatorsData.middle1mEMA &&
          indicatorsData.middle1mEMA > indicatorsData.slow1mEMA &&
          indicatorsData.rsi5m.rsiValue !== null &&
          indicatorsData.rsi5m.rsiValue <= 68 &&
          indicatorsData.rsi5m.rsiValue >= 61 &&
          indicatorsData.rsi1m.rsiValue !== null &&
          indicatorsData.rsi1m.rsiValue < 68,
        sell: {
          takeProfit:
            botState.status === 'sell' &&
            botState.buyReason === 'upTrend' &&
            Number(
              (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
                100,
            ) >= 0.05,
          stopLoss: null,
        },
      },
      downTrend: {
        buy:
          botState.status === 'buy' &&
          indicatorsData.rsi1m.rsiValue >= 62 &&
          Number(
            (indicatorsData.fast1mEMA / indicatorsData.middle1mEMA) * 100 - 100,
          ) >= 0.1,

        // indicatorsData.rsiRebuy.value &&
        // indicatorsData.middle1mEMA < indicatorsData.slow1mEMA &&
        // indicatorsData.rsi1m.rsiValue !== null &&
        // indicatorsData.rsi1m.rsiValue >= 41 &&
        // indicatorsData.rsi1m.rsiValue <= 40 &&
        // indicatorsData.rsi5m.rsiValue !== null &&
        // indicatorsData.rsi5m.rsiValue >= 41 &&
        // indicatorsData.rsi5m.rsiValue <= 45,

        sell: {
          takeProfit:
            botState.status === 'sell' &&
            botState.buyReason === 'downTrend' &&
            expectedProfitPercent >= 0.7,

          // // indicatorsData.rsi1m.rsiValue >= 59 &&
          // ((Number(
          //   (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
          //     100,
          // ) >= 0.1 &&
          //   expectedProfitPercent > 0.5) ||
          //   expectedProfitPercent >= 0.7),
          stopLoss:
            botState.status === 'sell' &&
            botState.buyReason === 'downTrend' &&
            Number(
              (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
                100,
            ) >= 0.1,
          // indicatorsData.rsi1m.rsiValue !== null &&
          // indicatorsData.rsi1m.rsiValue < 39 &&
          // indicatorsData.rsi5m.rsiValue !== null &&
          // indicatorsData.rsi5m.rsiValue < 39,
        },
      },
      upFlat: {
        buy:
          botState.status === 'buy' &&
          Number(
            (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
          ) >= 0.1 &&
          // indicatorsData.fast1mEMA > indicatorsData.middle1mEMA &&
          // indicatorsData.emaSignal === 'buy' &&
          indicatorsData.rsi1m.rsiValue < 55 &&
          indicatorsData.rsi1m.rsiValue !== null,
        sell: {
          takeProfit:
            botState.status === 'sell' &&
            botState.buyReason === 'upFlat' &&
            indicatorsData.rsi1m.rsiValue >= 69 &&
            expectedProfitPercent > 0,
          stopLoss:
            botState.status === 'sell' &&
            botState.buyReason === 'upFlat' &&
            (Number(
              (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
                100,
            ) >= 0.1 ||
              Number(
                (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
                  100,
              ) >= 0.05),
        },
      },
      downFlat: {
        buy:
          botState.status === 'buy' &&
          // indicatorsData.fast5mEMA < indicatorsData.middle5mEMA &&
          // indicatorsData.emaSignal === 'buy' &&
          indicatorsData.rsi1m.rsiValue < 35 &&
          indicatorsData.rsi1m.rsiValue !== null &&
          indicatorsData.rsi5m.rsiValue >= 40,
        sell: {
          takeProfit:
            botState.status === 'sell' &&
            botState.buyReason === 'downFlat' &&
            indicatorsData.rsi1m.rsiValue >= 59 &&
            expectedProfitPercent > 0,
          stopLoss:
            botState.status === 'sell' &&
            botState.buyReason === 'downFlat' &&
            indicatorsData.rsi5m.rsiValue !== null &&
            indicatorsData.rsi5m.rsiValue < 39,
        },
      },
      stochRsiStrategy: {
        buy:
          botState.status === 'buy' &&
          // indicatorsData.rsi5m.rsiValue >= 41 &&
          // indicatorsData.rsi15m.rsiValue >= 41 &&
          indicatorsData.stochRsiSignal.stoch15m === 'buy' &&
          indicatorsData.stochRsiSignal.stoch5m === 'buy',
        sell: {
          takeProfit:
            botState.status === 'sell' &&
            botState.buyReason === 'stochRsi' &&
            indicatorsData.stochRsiSignal.stoch1m === 'sell' &&
            expectedProfitPercent >= 0.6,
          stopLoss:
            botState.status === 'sell' &&
            botState.buyReason === 'stochRsi' &&
            indicatorsData.stochRsiSignal.stoch5m === 'sell',
          // ||
          // (indicatorsData.rsi5m.rsiValue !== null &&
          //   indicatorsData.rsi5m.rsiValue < 39)),)
        },
      },
      trendsCatcher: {
        buy:
          botState.status === 'buy' &&
          indicatorsData.dmi1h.willPriceGrow &&
          Number(
            (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
          ) >= 0.1,
        sell: {
          takeProfit: null,
          stopLoss:
            botState.status === 'sell' &&
            botState.buyReason === 'trendsCatcher' &&
            (Number(
              (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
                100,
            ) >= 0.5 ||
              !indicatorsData.dmi1h.willPriceGrow),
        },
      },
    };

    /** ******************************************BUY ACTIONS********************************************************/

    /** *********************UP TREND***********************/
    if (botState.strategies.upTrend.enabled) {
      if (conditions.upTrend.buy) {
        await marketBuyAction(
          false,
          symbol,
          botState,
          cryptoCoin,
          pricesStream,
          stepSize,
          'TRENDS CATCHER',
          workingDeposit,
          'RESISTANCE LEVEL',
        );
        botState.buyReason = 'upTrend';
        return;
      }
    }

    /** *********************DOWN TREND***********************/

    if (botState.strategies.downTrend.enabled) {
      if (conditions.downTrend.buy) {
        await marketBuyAction(
          false,
          symbol,
          botState,
          cryptoCoin,
          pricesStream,
          stepSize,
          'WAVES CATCHER',
          workingDeposit,
          'DOWN TREND CORRECTION LEVEL',
        );
        botState.buyReason = 'downTrend';
        indicatorsData.rsiRebuy.value = false;
        return;
      }
    }

    /** *********************UP FLAT***********************/

    if (botState.strategies.upFlat.enabled) {
      if (conditions.upFlat.buy) {
        await marketBuyAction(
          false,
          symbol,
          botState,
          cryptoCoin,
          pricesStream,
          stepSize,
          'WAVES CATCHER',
          workingDeposit,
          'UP FLAT ',
        );
        botState.buyReason = 'upFlat';
        return;
      }
    }

    /** *********************DOWN FLAT***********************/

    if (botState.strategies.downFlat.enabled) {
      if (conditions.downFlat.buy) {
        await marketBuyAction(
          false,
          symbol,
          botState,
          cryptoCoin,
          pricesStream,
          stepSize,
          'WAVES CATCHER',
          workingDeposit,
          'DOWN FLAT',
        );
        botState.buyReason = 'downFlat';
        return;
      }
    }

    /** *********************StochRSI Strategy***********************/

    if (botState.strategies.stochRsi.enabled) {
      if (conditions.stochRsiStrategy.buy) {
        await marketBuyAction(
          false,
          symbol,
          botState,
          cryptoCoin,
          pricesStream,
          stepSize,
          'STOCH RSI',
          workingDeposit,
          'STOCH RSI SIGNAL',
        );
        botState.buyReason = 'stochRsi';
        return;
      }
    }

    /** ******************** TRENDS CATHCER ***********************/

    if (botState.strategies.trendsCatcher.enabled) {
      if (conditions.trendsCatcher.buy) {
        await marketBuyAction(
          false,
          symbol,
          botState,
          cryptoCoin,
          pricesStream,
          stepSize,
          'TRENDS CATCHER',
          workingDeposit,
          'ADX SIGNAL',
        );
        botState.buyReason = 'trendsCatcher';
        return;
      }
    }

    /** *****************************************SELL ACTIONS********************************************************/

    /** *********************UP TREND***********************/

    if (conditions.upTrend.sell.takeProfit) {
      await marketSellAction(
        'upTrend',
        true,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'STOP LOSS OR TAKE PROFIT',
      );
      indicatorsData.rsiRebuy.value = true;
      return;
    }

    /** *********************DOWN TREND***********************/

    if (conditions.downTrend.sell.takeProfit) {
      await marketSellAction(
        'downTrend',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'DOWNTREND CORRECTION TAKE PROFIT',
      );
      indicatorsData.rsiRebuy.value = false;
      return;
    }

    if (conditions.downTrend.sell.stopLoss) {
      await marketSellAction(
        'downTrend',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'DOWNTREND CORRECTION STOP LOSS',
      );
      indicatorsData.rsiRebuy.value = true;
      return;
    }

    /** *********************UP FLAT***********************/

    if (conditions.upFlat.sell.takeProfit) {
      if (
        Number(
          (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
        ) >= 0.1 &&
        Number(
          (indicatorsData.fast15mEMA / indicatorsData.middle15mEMA) * 100 - 100,
        ) >= 0.1
      ) {
        botState.buyReason = 'upTrend';
        await sendToRecipients(` INFO
                     Bot was switched to the TRENDS CATCHER strategy!
        `);
        indicatorsData.rsiRebuy.value = true;
        return;
      } else {
        await marketSellAction(
          'upFlat',
          false,
          symbol,
          botState,
          cryptoCoin,
          expectedProfitPercent,
          pricesStream,
          stepSize,
          initialUSDTBalance,
          'UP FLAT TAKE PROFIT',
        );
        indicatorsData.rsiRebuy.value = true;
        return;
      }
    }
    //
    if (conditions.upFlat.sell.stopLoss) {
      await marketSellAction(
        'upFlat',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'UP FLAT STOP LOSS',
      );
      indicatorsData.rsiRebuy.value = true;
      return;
    }

    /** *********************DOWN FLAT***********************/

    if (conditions.downFlat.sell.takeProfit) {
      await marketSellAction(
        'downFlat',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'DOWN FLAT TAKE PROFIT',
      );
      indicatorsData.rsiRebuy.value = true;
      return;
    }

    if (conditions.downFlat.sell.stopLoss) {
      await marketSellAction(
        'downFlat',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'DOWN FLAT LEVEL STOP LOSS',
      );
      indicatorsData.rsiRebuy.value = true;
      return;
    }

    /** *********************STOCH RSI ***********************/

    if (
      conditions.stochRsiStrategy.sell.takeProfit &&
      !botState.strategies.stochRsi.stopLoss
    ) {
      await marketSellAction(
        'stochRsi',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'STOCH RSI TAKE PROFIT',
        true,
      );
      return;
    }

    if (conditions.stochRsiStrategy.sell.stopLoss) {
      await marketSellAction(
        'stochRsi',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'STOCH RSI STOP LOSS',
        false,
      );
      return;
    }

    /** *********************TRENDS CATCHER***********************/

    if (conditions.trendsCatcher.sell.stopLoss) {
      await marketSellAction(
        'trendsCatcher',
        true,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'STOP LOSS',
      );
      return;
    }

    botState.updateState('prevPrice', botState.currentPrice);
  };

  // getDMISignal(symbol, '5m', indicatorsData.dmi5m);
  getStochRSISignal(symbol, '1m', indicatorsData);
  getStochRSISignal(symbol, '5m', indicatorsData);
  getStochRSISignal(symbol, '15m', indicatorsData);
  // getStochRSISignal(symbol, '1h', indicatorsData);
  // getRSISignal(symbol, '5m', indicatorsData.rsi5m);
  getRSISignal(symbol, '15m', indicatorsData.rsi15m);
  getEMASignal(symbol, '5m', indicatorsData);
  getEMASignal(symbol, '15m', indicatorsData);
  getEMASignal(symbol, '1m', indicatorsData);

  if (botState.testMode) {
    await sendToRecipients(`INIT (TEST MODE)
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
    ${JSON.stringify(reason)};
  `);

  process.exit(1);
});
