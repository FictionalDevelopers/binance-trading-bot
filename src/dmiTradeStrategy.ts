import { pluck, bufferCount } from 'rxjs/operators';
import { format } from 'date-fns';
import { connect } from './db/connection';
import { RESOURCES } from './constants';
import { DATE_FORMAT } from './constants/date';
import { getTradeStream } from './api/trades.js';
import { sendToRecipients } from './services/telegram';
import getBalances from './api/balance';
import { getExchangeInfo } from './api/exchangeInfo';
import {
  marketSellAction,
  cancelAllOpenOrders,
  checkAllOpenOrders,
  marketBuyAction,
} from './api/order';
import { getEMASignal, runEMAInterval } from './components/ema-signals';
import { getDMISignal } from './components/dmi-signals';
import { getRSISignal } from './components/rsi-signals';

(async function() {
  await connect();
  // await processSubscriptions();
  const symbol = 'adausdt';
  const cryptoCoin = symbol.toUpperCase().slice(0, -4);
  const { available: initialUSDTBalance } = await getBalances('USDT');
  const { available: initialCryptoCoinBalance } = await getBalances(cryptoCoin);
  const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');
  const openOrders = await checkAllOpenOrders(symbol.toUpperCase());
  const workingDeposit = 500;
  // const symbol = process.argv[2];

  const botState = {
    enabledLimits: false,
    boughtBeforeResistanceLevel: false,
    sellError: false,
    emaStartPoint: null,
    rebuy: true,
    strategy: 'MIXED STRATEGY',
    testMode: true,
    useProfitLevels: false,
    useEMAStopLoss: false,
    status: openOrders ? (openOrders.length === 0 ? 'buy' : 'sell') : 'buy',
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
          Number(
            (indicatorsData.fast15mEMA / indicatorsData.middle15mEMA) * 100 -
              100,
          ) >= 0.05 &&
          Number(
            (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
          ) >= 0.05 &&
          botState.rebuy,
        flatBuyBefore5mResistanceLevel:
          botState.status === 'buy' &&
          indicatorsData.fast5mEMA < indicatorsData.middle5mEMA &&
          indicatorsData.emaSignal === 'buy' &&
          indicatorsData.rsi1m.rsiValue < 35 &&
          indicatorsData.rsi1m.rsiValue !== null &&
          indicatorsData.fast5mEMA < indicatorsData.middle5mEMA,
        flatBuyAfter5mResistanceLevel:
          botState.status === 'buy' &&
          indicatorsData.fast5mEMA < indicatorsData.middle5mEMA &&
          indicatorsData.emaSignal === 'buy' &&
          indicatorsData.rsi1m.rsiValue < 35 &&
          indicatorsData.rsi1m.rsiValue !== null &&
          indicatorsData.fast5mEMA > indicatorsData.middle5mEMA,
      },

      sell: {
        resistanceLevel:
          botState.status === 'sell' &&
          !botState.boughtBeforeResistanceLevel &&
          Number(
            (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 - 100,
          ) >= 0.05,
        flatStopLoss:
          botState.status === 'sell' &&
          ((botState.boughtBeforeResistanceLevel &&
            indicatorsData.emaSignal === 'sell') ||
            (!botState.boughtBeforeResistanceLevel &&
              Number(
                (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
                  100,
              ) >= 0.05)),
        flatTakeProfit:
          botState.status === 'sell' &&
          !botState.enabledLimits &&
          indicatorsData.rsi1m.rsiValue >= 68 &&
          expectedProfitPercent > 0,
      },
    };

    /** **********************BUY ACTIONS***************************/

    if (conditions.buy.totalResistanceLevel) {
      await marketBuyAction(
        true,
        symbol,
        botState,
        cryptoCoin,
        pricesStream,
        stepSize,
        'TRENDS CATCHER',
        workingDeposit,
        'RESISTANCE LEVEL',
      );
      botState.boughtBeforeResistanceLevel = false;
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
      return;
    }

    /** *********************SELL ACTIONS***********************/

    if (conditions.sell.resistanceLevel) {
      try {
        botState.updateState('status', 'isPending');
        const openOrders = await checkAllOpenOrders(symbol.toUpperCase());
        if (
          openOrders.length === 0 &&
          !botState.sellError &&
          botState.enabledLimits
        ) {
          const { available: refreshedUSDTBalance } = await getBalances('USDT');
          botState.updateState('availableUSDT', +refreshedUSDTBalance);
          botState.dealsCount++;
          await sendToRecipients(`INFO
          No open limit sell orders found
          Bot was switched to the BUY
      `);
          botState.updateState('status', 'buy');
          return;
        } else {
          if (openOrders.length !== 0) {
            await cancelAllOpenOrders(symbol.toUpperCase());
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
            botState.sellError = false;
            botState.enabledLimits = false;
            return;
          }
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
            'STOP LOSS',
          );
          botState.sellError = false;
          botState.enabledLimits = false;
          return;
        }
      } catch (e) {
        await sendToRecipients(`SELL ERROR
            ${JSON.stringify(e)}
      `);
        const { available: refreshedCryptoCoinBalance } = await getBalances(
          cryptoCoin,
        );
        botState.updateState(
          'availableCryptoCoin',
          +refreshedCryptoCoinBalance,
        );
        botState.sellError = true;
        botState.updateState('status', 'sell');
      }
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

    if (conditions.sell.flatStopLoss) {
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
        'STOP LOSS',
      );
      return;
    }
    botState.updateState('prevPrice', botState.currentPrice);
  };

  getDMISignal(symbol, '5m', indicatorsData.dmi5m);
  getRSISignal(symbol, '1m', indicatorsData.rsi1m);
  getEMASignal(symbol, '5m', indicatorsData, botState);
  getEMASignal(symbol, '15m', indicatorsData, botState);
  getEMASignal(symbol, '1m', indicatorsData, botState);

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
  Open orders: ${JSON.stringify(openOrders)}
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
