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
  const workingDeposit = 500;
  // const symbol = process.argv[2];

  const botState = {
    rebuy: true,
    enabledLimits: false,
    boughtByTotalResistanceLevel: false,
    boughtBeforeResistanceLevel: null,
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
  };

  runEMAInterval(indicatorsData, botState);

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
      buy: {
        totalResistanceLevel:
          botState.status === 'buy' &&
          botState.rebuy &&
          Number(
            (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
          ) >= 0.1 &&
          indicatorsData.rsi5m.rsiValue !== null &&
          indicatorsData.rsi5m.rsiValue <= 68,

        flatBuyBefore5mResistanceLevel:
          botState.status === 'buy' &&
          indicatorsData.fast5mEMA < indicatorsData.middle5mEMA &&
          indicatorsData.emaSignal === 'buy' &&
          indicatorsData.rsi1m.rsiValue <= 35 &&
          indicatorsData.rsi1m.rsiValue !== null,

        flatBuyAfter5mResistanceLevel:
          botState.status === 'buy' &&
          indicatorsData.fast5mEMA > indicatorsData.middle5mEMA &&
          indicatorsData.emaSignal === 'buy' &&
          indicatorsData.rsi1m.rsiValue <= 45 &&
          indicatorsData.rsi1m.rsiValue !== null,
      },

      sell: {
        resistanceLevel:
          (botState.status === 'sell' &&
            botState.boughtByTotalResistanceLevel &&
            Number(
              (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
                100,
            ) >= 0.05) ||
          expectedProfitPercent >= 1,

        flatAfterResistanceLevelStopLoss:
          botState.status === 'sell' &&
          !botState.boughtByTotalResistanceLevel &&
          botState.boughtBeforeResistanceLevel === false &&
          (Number(
            (indicatorsData.slow1mEMA / indicatorsData.middle1mEMA) * 100 - 100,
          ) >= 0.05 ||
            Number(
              (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
                100,
            ) >= 0.05),
        flatBeforeResistanceLevelStopLoss:
          (botState.status === 'sell' &&
            !botState.boughtByTotalResistanceLevel &&
            botState.boughtBeforeResistanceLevel === true &&
            indicatorsData.emaSignal === 'sell') ||
          expectedProfitPercent <= 0.5,
        flatTakeProfit:
          botState.status === 'sell' &&
          indicatorsData.rsi1m.rsiValue >= 68 &&
          expectedProfitPercent > 0,
        // Number(
        //   (indicatorsData.fast15mEMA / indicatorsData.middle15mEMA) * 100 -
        //     100,
        // ) < 0.1 &&
        // Number(
        //   (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
        // ) < 0.1,
      },
    };

    /** **********************BUY ACTIONS***************************/

    if (conditions.buy.totalResistanceLevel) {
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
      botState.boughtByTotalResistanceLevel = true;
      botState.rebuy = false;
      return;
    }

    if (conditions.buy.flatBuyBefore5mResistanceLevel) {
      await marketBuyAction(
        false,
        symbol,
        botState,
        cryptoCoin,
        pricesStream,
        stepSize,
        'WAVES CATCHER',
        workingDeposit,
        'BEFORE RESISTANCE LEVEL',
      );
      botState.boughtBeforeResistanceLevel = true;
      botState.boughtByTotalResistanceLevel = false;
      return;
    }

    if (conditions.buy.flatBuyAfter5mResistanceLevel) {
      await marketBuyAction(
        false,
        symbol,
        botState,
        cryptoCoin,
        pricesStream,
        stepSize,
        'WAVES CATCHER',
        workingDeposit,
        'AFTER RESISTANCE LEVEL',
      );
      botState.boughtBeforeResistanceLevel = false;
      botState.boughtByTotalResistanceLevel = false;
      return;
    }

    /** *********************SELL ACTIONS***********************/

    if (conditions.sell.resistanceLevel) {
      await marketSellAction(
        'TRENDS CATCHER',
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
      if (
        Number(
          (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 - 100,
        ) >= 0.05
      )
        botState.rebuy = true;
      return;
    }

    if (conditions.sell.flatTakeProfit) {
      await marketSellAction(
        'WAVES CATCHER',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'TAKE PROFIT',
      );
      return;
    }

    if (conditions.sell.flatBeforeResistanceLevelStopLoss) {
      await marketSellAction(
        'WAVES CATCHER',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'BEFORE RESISTANCE LEVEL STOP LOSS',
      );
      return;
    }

    if (conditions.sell.flatAfterResistanceLevelStopLoss) {
      await marketSellAction(
        'WAVES CATCHER',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'AFTER RESISTANCE LEVEL STOP LOSS',
      );
      return;
    }

    botState.updateState('prevPrice', botState.currentPrice);
  };

  getDMISignal(symbol, '5m', indicatorsData.dmi5m);
  getRSISignal(symbol, '1m', indicatorsData.rsi1m);
  getRSISignal(symbol, '5m', indicatorsData.rsi5m);
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
