import { pluck, bufferCount } from 'rxjs/operators';
import { format } from 'date-fns';
import { connect } from './db/connection';
import _omit from 'lodash/omit';
import { RESOURCES } from './constants';
import { DATE_FORMAT } from './constants/date';
import { getTradeStream } from './api/trades.js';
import { sendToRecipients } from './services/telegram';
import getBalances from './api/balance';
import { getExchangeInfo } from './api/exchangeInfo';
import {
  marketSellAction,
  marketBuyAction,
  getOrdersList,
  checkAllOpenOrders,
  cancelAllOpenOrders,
} from './api/order';

import _maxBy from 'lodash/maxBy';
import { binance } from './api/binance';

import { getEMASignal, runEMAInterval } from './components/ema-signals';
import getAvarage from './utils/getAverage';
import { getEmaStream } from '../src/indicators/ema';
import { getObvStream } from './indicators/obv';

import { getRSISignal } from './components/rsi-signals';
import { getTrixSignal, runTrixInterval } from './components/trix-signal';
import {
  getStochRSISignal,
  runStochRsiInterval,
} from './components/stochRSI-signals';
import { getObvSignal } from './components/obv-signals';
import { service as botStateService } from './components/botState';
import _head from 'lodash/head';
import { getForceIndexSignal, runEFIInterval } from './components/forceIndex';
import { getForceIndexStream } from './indicators/forceIndex';
import { getStochRsiStream } from './indicators/stochRSI';
import { getTrixStream } from './indicators/trix';
import { getRocSignal } from './components/roc-signals';
import { getRocStream } from './indicators/roc';
import { getDMISignal } from './components/dmi-signals';
import _throttle from 'lodash/throttle';
import _debounce from 'lodash/debounce';
import { getHeikinAshiSignal } from './indicators/heikinAshi';
import {
  calculateAvgDealPriceChange,
  calculateAvgPriceChange,
} from './tools/avgPriceTools';
import determineDealType from './tools/determineDealType';
// import { indicatorsData } from './index2';

(async function() {
  await connect();
  // await processSubscriptions();
  const revisionNumber = 'ffa2bef39307f7d13bf20d5b92ebaafe4115b081';
  const symbol = 'linkusdt';
  const cryptoCoin = symbol.toUpperCase().slice(0, -4);
  const { available: initialUSDTBalance } = await getBalances('USDT');
  const { available: initialCryptoCoinBalance } = await getBalances(cryptoCoin);
  const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');
  const openOrders = await checkAllOpenOrders(symbol.toUpperCase());
  const ordersList = await getOrdersList(symbol.toUpperCase());
  const lastOrder = ordersList[ordersList.length - 1] || null;
  const workingDeposit = 35;
  let botState;
  //
  try {
    const response = await botStateService.getBotState();
    const initialState = JSON.parse(JSON.stringify(_head(response)));

    botState = {
      ...initialState,
      availableUSDT: initialUSDTBalance,
      availableCryptoCoin: initialCryptoCoinBalance,
      local: true,
      logToTelegram: true,
      updateState: function(fieldName, value) {
        this[`${fieldName}`] = value;
      },
    };
  } catch (e) {
    await sendToRecipients(`BOT STATE INITIALIZING ERROR
    ${JSON.stringify(e)};
  `);

    process.exit(1);
  }

  const indicatorsData = {
    askBidDiffArr: [],
    avgAskBidDiff: null,
    prevAvgAskBidDiff: null,
    askBidDiff: null,
    dealType: '',
    avgDealPriceUpSignalCount: 0,
    avgDealPriceDownSignalCount: 0,
    avgDealPriceSignal: null,
    avgDealPriceDiff: null,
    avgPriceUpSignalCount: 0,
    avgPriceDownSignalCount: 0,
    avgPriceSignal: null,
    avgPriceDiff: null,
    avgPriceDiffPerTimes: null,
    haCandle: {
      ha1hCandle: {
        open: null,
        close: null,
        high: null,
        low: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
      ha15mCandle: {
        open: null,
        close: null,
        high: null,
        low: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
      ha5mCandle: {
        open: null,
        close: null,
        high: null,
        low: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
        shadowSignal: null,
      },
      ha1mCandle: {
        open: null,
        close: null,
        high: null,
        low: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
        shadowSignal: null,
      },
    },
    maxAvailableProfit: 0,
    totalMaxAvailableProfit: 0,
    isPricesStreamAliveNegativeSignalConfirmationCount: 0,
    scalper: {
      askBidSignal: null,
      tradesVolume: {
        buySignalCount: null,
        sellSignalCount: null,
        signal: null,
      },
      bidsAsksDiff: null,
      prevAsk: null,
      lastAsk: null,
      lastBid: null,
      buySignalCount: 0,
      sellSignalCount: 0,
      signal: null,
      maxBidSize: null,
      maxAskSize: null,
    },
    growCount: 0,
    fallCount: 0,
    rocSignalBuyCount: 0,
    rocSignalSellCount: 0,
    roc: {
      roc1m: {
        value: null,
        prevValue: null,
        diff: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
      roc5m: {
        value: null,
        prevValue: null,
        diff: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
    },
    trix: {
      trix5m: {
        av: null,
        prevAv: null,
        signal: null,
        value: null,
        prev: null,
      },
    },
    efi1m: {
      efiBuySignalCount: 0,
      efiSellSignalCount: 0,
      prevEfi: null,
      efi: null,
      efiSignal: null,
      av: null,
      prevAv: null,
    },
    efi1h: {
      efiBuySignalCount: 0,
      efiSellSignalCount: 0,
      prevEfi: null,
      efi: null,
      efiSignal: null,
      av: null,
      prevAv: null,
    },
    efi5m: {
      efiBuySignalCount: 0,
      efiSellSignalCount: 0,
      prevEfi: null,
      efi: null,
      efiSignal: null,
      av: null,
      prevAv: null,
    },
    obvBuySignalCount: 0,
    obvSellSignalCount: 0,
    prevObv: null,
    obv4h: {
      signal: null,
      buySignalCount: 0,
      sellSignalCount: 0,
      obv: null,
      prevObv: null,
      obvDiff: null,
    },
    obv1h: {
      signal: null,
      buySignalCount: 0,
      sellSignalCount: 0,
      obv: null,
      prevObv: null,
      obvDiff: null,
    },
    obv5m: {
      signal: null,
      buySignalCount: 0,
      sellSignalCount: 0,
      obv: null,
      prevObv: null,
      obvDiff: null,
    },
    obv15m: {
      signal: null,
      buySignalCount: 0,
      sellSignalCount: 0,
      obv: null,
      prevObv: null,
      obvDiff: null,
    },
    obv1m: {
      signal: null,
      buySignalCount: 0,
      sellSignalCount: 0,
      obv: null,
      prevObv: null,
      obvDiff: null,
    },
    obv: null,
    obvSignal: null,
    priceGrowArea: false,
    stochRsi: {
      stoch1m: {
        buySignalCount: 0,
        sellSignalCount: 0,
        prev: null,
        value: null,
        signal: null,
        av: null,
        prevAv: null,
        data: {},
      },
      stoch5m: {
        buySignalCount: 0,
        sellSignalCount: 0,
        prev: null,
        value: null,
        signal: null,
        av: null,
        prevAv: null,
        data: {},
      },
      stoch15m: {
        buySignalCount: 0,
        sellSignalCount: 0,
        prev: null,
        value: null,
        signal: null,
        av: null,
        prevAv: null,
        data: {},
      },
      stoch1h: {
        buySignalCount: 0,
        sellSignalCount: 0,
        prev: null,
        value: null,
        signal: null,
        av: null,
        prevAv: null,
        data: {},
      },
    },
    emaSignal: null,
    dmi5m: {
      adx: null,
      adxUpCount: 0,
      adxDownCount: 0,
      adxDiff: null,
      adxDirection: null,
      prevDmi: null,
      dmiMdiSignal: 0,
      adxSignal: null,
      mdiSignal: 0,
      adxBuySignalVolume: 0,
      adxSellSignalVolume: 0,
      willPriceGrow: false,
      trend: null,
      signal: null,
      buySignalCount: 0,
      sellSignalCount: 0,
    },
    dmi15m: {
      adxUpCount: 0,
      adxDownCount: 0,
      adxDiff: null,
      adxDirection: null,
      prevDmi: null,
      dmiMdiSignal: 0,
      adxSignal: 0,
      mdiSignal: 0,
      adxBuySignalVolume: 0,
      adxSellSignalVolume: 0,
      willPriceGrow: false,
      trend: null,
      signal: null,
      buySignalCount: 0,
      sellSignalCount: 0,
    },
    dmi1h: {
      adxUpCount: 0,
      adxDownCount: 0,
      adxDiff: null,
      adxDirection: null,
      prevDmi: null,
      dmiMdiSignal: 0,
      adxSignal: null,
      mdiSignal: 0,
      adxBuySignalVolume: 0,
      adxSellSignalVolume: 0,
      willPriceGrow: false,
      trend: null,
      signal: null,
      buySignalCount: 0,
      sellSignalCount: 0,
    },
    dmi1m: {
      adx: null,
      adxDirection: null,
      adxUpCount: 0,
      adxDownCount: 0,
      adxDiff: null,
      prevDmi: null,
      dmiMdiSignal: 0,
      mdiSignal: 0,
      adxBuySignalVolume: 0,
      adxSellSignalVolume: 0,
      willPriceGrow: false,
      trend: null,
      signal: null,
      adxSignal: null,
      buySignalCount: 0,
      sellSignalCount: 0,
    },
    rsi1m: {
      growCount: 0,
      downCount: 0,
      rsiSignal: null,
      rsiValue: null,
      prevRsi: null,
      signal: null,
    },
    rsi1h: {
      growCount: 0,
      downCount: 0,
      rsiSignal: null,
      rsiValue: null,
      prevRsi: null,
      signal: null,
    },
    rsi5m: {
      growCount: 0,
      downCount: 0,
      rsiSignal: null,
      rsiValue: null,
      prevRsi: null,
      signal: null,
    },
    rsi15m: {
      growCount: 0,
      downCount: 0,
      rsiSignal: null,
      rsiValue: null,
      prevRsi: null,
      signal: null,
    },
    slow1mEMA: 0,
    middle1mEMA: 0,
    fast1mEMA: 0,
    avFast1mEMA: 0,
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
    emaAvSignal: null,
    emaAv: null,
  };

  const scalper = async pricesStream => {
    const { tradeAmountPercent } = botState;
    botState.updateState('isPricesStreamAlive', true);
    indicatorsData.isPricesStreamAliveNegativeSignalConfirmationCount = 0;
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

    if (botState.dealType === 'long') {
      if (expectedProfitPercent > botState.maxAvailableLongProfit)
        botState.updateState('maxAvailableLongProfit', expectedProfitPercent);
      if (expectedProfitPercent < botState.minAvailableLongProfit)
        botState.updateState('minAvailableLongProfit', expectedProfitPercent);
    } else if (botState.dealType === 'short') {
      if (expectedProfitPercent > botState.maxAvailableShortProfit)
        botState.updateState('maxAvailableShortProfit', expectedProfitPercent);
      if (expectedProfitPercent < botState.minAvailableShortProfit)
        botState.updateState('minAvailableShortProfit', expectedProfitPercent);
    }

    const conditions = {
      scalper: {
        buy: {
          long:
            botState.status === 'buy' &&
            indicatorsData.obv5m.signal === 'buy' &&
            indicatorsData.obv1m.signal === 'buy',
          // (indicatorsData.dmi5m.adxUpCount >= 2 ||
          //   indicatorsData.dmi5m.adxDownCount >= 2) &&
          // (indicatorsData.dmi1m.adxUpCount >= 2 ||
          //   indicatorsData.dmi1m.adxDownCount >= 2),
          short:
            botState.status === 'buy' &&
            indicatorsData.obv5m.signal === 'sell' &&
            indicatorsData.obv1m.signal === 'sell',
          // (indicatorsData.dmi5m.adxUpCount >= 2 ||
          //   indicatorsData.dmi5m.adxDownCount >= 2) &&
          // (indicatorsData.dmi1m.adxUpCount >= 2 ||
          //   indicatorsData.dmi1m.adxDownCount >= 2),
        },
        sell: {
          takeProfit: null,
          stopLoss: {
            long:
              botState.status === 'sell' &&
              botState.dealType === 'long' &&
              indicatorsData.obv5m.signal === 'sell' &&
              indicatorsData.obv1m.signal === 'sell',
            // (indicatorsData.dmi5m.adxUpCount >= 2 ||
            //   indicatorsData.dmi5m.adxDownCount >= 2 ||
            //   indicatorsData.dmi1m.adxUpCount >= 2 ||
            //   indicatorsData.dmi1m.adxDownCount >= 2),
            short:
              botState.status === 'sell' &&
              botState.dealType === 'short' &&
              indicatorsData.obv5m.signal === 'buy' &&
              indicatorsData.obv1m.signal === 'buy',
            // (indicatorsData.dmi5m.adxUpCount >= 2 ||
            //   indicatorsData.dmi5m.adxDownCount >= 2 ||
            //   indicatorsData.dmi1m.adxUpCount >= 2 ||
            //   indicatorsData.dmi1m.adxDownCount >= 2),
          },
        },
      },
    };

    /** ******************************************BUY ACTIONS********************************************************/
    /** ********SCALPER*********/

    if (botState.strategies.scalper.enabled) {
      if (conditions.scalper.buy.long) {
        await marketBuyAction(
          'long',
          true,
          symbol,
          botState,
          cryptoCoin,
          pricesStream,
          stepSize,
          'TRENDS CATCHER 2',
          workingDeposit,
          'STRATEGY 2',
          indicatorsData,
        );
        botState.buyReason = 'scalper';
        return;
      }
      botState.updateState('prevPrice', botState.currentPrice);
      botState.updateState('currentProfit', expectedProfitPercent);
    }
    if (botState.strategies.scalper.enabled) {
      if (conditions.scalper.buy.short) {
        await marketBuyAction(
          'short',
          true,
          symbol,
          botState,
          cryptoCoin,
          pricesStream,
          stepSize,
          'TRENDS CATCHER 2',
          workingDeposit,
          'TRENDS CATCHER 2',
          indicatorsData,
        );
        botState.buyReason = 'scalper';
        return;
      }
      botState.updateState('prevPrice', botState.currentPrice);
      botState.updateState('currentProfit', expectedProfitPercent);
    }

    /** *****************************************SELL ACTIONS********************************************************/

    /** ********SCALPER*********/
    if (
      conditions.scalper.sell.takeProfit &&
      !botState.strategies.scalper.stopLoss
    ) {
      await marketSellAction(
        'scalper',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'TRENDS CATCHER 2 (TAKE PROFIT)',
        indicatorsData,
        true,
      );
      return;
    }
    if (conditions.scalper.sell.stopLoss.long) {
      botState.updateState('status', 'isPending');
      let openOrders;
      try {
        openOrders = await checkAllOpenOrders(symbol.toUpperCase());
      } catch (e) {
        await sendToRecipients(`OPEN ORDERS CHECKING ERROR
            ${JSON.stringify(e)}
      `);
      }
      if (
        openOrders.length === 0 &&
        !botState.sellError &&
        botState.enabledLimits
      ) {
        await sendToRecipients(`INFO
          No open limit sell orders found
          Bot was switched to the BUY status!
      `);
        await marketSellAction(
          'scalper',
          false,
          symbol,
          botState,
          cryptoCoin,
          expectedProfitPercent,
          pricesStream,
          stepSize,
          initialUSDTBalance,
          'TRENDS CATCHER 2',
          indicatorsData,
          true,
        );
        return;
      } else if (openOrders.length !== 0) {
        await cancelAllOpenOrders(symbol.toUpperCase());
        await marketSellAction(
          'scalper',
          true,
          symbol,
          botState,
          cryptoCoin,
          expectedProfitPercent,
          pricesStream,
          stepSize,
          initialUSDTBalance,
          'TRENDS CATCHER 2',
          indicatorsData,
        );
        return;
      }
      await marketSellAction(
        'scalper',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'TRENDS CATCHER 2',
        indicatorsData,
      );
      return;
    }
    if (conditions.scalper.sell.stopLoss.short) {
      await marketSellAction(
        'scalper',
        true,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'TRENDS CATCHER 2',
        indicatorsData,
      );
      return;
    }

    botState.updateState('prevPrice', botState.currentPrice);
    botState.updateState('currentProfit', expectedProfitPercent);
  };

  if (botState.testMode) {
    await sendToRecipients(`INIT TEST MODE (LOCAL)
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  Revision N: ${revisionNumber}
  Strategies: TRENDS CATCHER 2
  Status: ${botState.status.toUpperCase()}
  Symbol: ${symbol.toUpperCase()}
  `);
  } else {
    await sendToRecipients(`INIT REAL MODE (LOCAL)
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  Revision N: ${revisionNumber}
  Strategies: ${JSON.stringify(botState.strategies)}
  Status: ${botState.status.toUpperCase()}
  Symbol: ${symbol.toUpperCase()}
  Initial USDT balance: ${initialUSDTBalance} USDT
  Working deposit: ${workingDeposit} USDT
  Initial ${cryptoCoin} balance: ${initialCryptoCoinBalance} ${cryptoCoin}
  `);
  }

  getTradeStream({
    symbol: symbol,
    resource: RESOURCES.TRADE,
  })
    .pipe(pluck('price'), bufferCount(1, 1))
    .subscribe(scalper);

  /** *******************************INDICATORS SECTION**************************************/

  getObvSignal(symbol, '5m', indicatorsData.obv5m, 20, 20);
  getObvSignal(symbol, '1m', indicatorsData.obv1m, 20, 20);
  // getDMISignal(symbol, '5m', indicatorsData.dmi5m, 1, 0, 0);
  // getDMISignal(symbol, '1m', indicatorsData.dmi1m, 1, 0, 0);

  /** *************************DATA LOGGER********************************/

  (() => {
    setInterval(async () => {
      console.log('isPricesStreamAlive: ' + botState.isPricesStreamAlive);
      console.log('Deal Type: ' + botState.dealType.toUpperCase());
      console.log(
        'OBV 5m: ' +
          indicatorsData.obv5m.signal +
          ' ' +
          '(Buy Count: ' +
          indicatorsData.obv5m.buySignalCount +
          ' ' +
          'Sell Count: ' +
          indicatorsData.obv5m.sellSignalCount +
          ')',
      );
      console.log(
        'OBV 1m: ' +
          indicatorsData.obv1m.signal +
          ' ' +
          '(Buy Count: ' +
          indicatorsData.obv1m.buySignalCount +
          ' ' +
          'Sell Count: ' +
          indicatorsData.obv1m.sellSignalCount +
          ')',
      );
      console.log(
        'ADX 5m: ' +
          '(UP: ' +
          indicatorsData.dmi5m.adxUpCount +
          '(' +
          botState.dmi5m.adxUpCount +
          ') ' +
          'DOWN: ' +
          indicatorsData.dmi5m.adxDownCount +
          '(' +
          botState.dmi5m.adxDownCount +
          ')' +
          ') ' +
          'BUY: ' +
          botState.dmi5m.adx +
          ' ' +
          'Current: ' +
          indicatorsData.dmi5m.adx,
      );
      console.log(
        'ADX 1m: ' +
          '(UP: ' +
          indicatorsData.dmi1m.adxUpCount +
          '(' +
          botState.dmi1m.adxUpCount +
          ') ' +
          'DOWN: ' +
          indicatorsData.dmi1m.adxDownCount +
          '(' +
          botState.dmi1m.adxDownCount +
          ') ' +
          'BUY: ' +
          botState.dmi1m.adx +
          ' ' +
          'Current: ' +
          indicatorsData.dmi1m.adx,
      );

      console.log(
        botState.dealType === 'long'
          ? 'MAX av profit: ' +
              Number(botState.maxAvailableLongProfit - 0.2) +
              ' %'
          : 'MAX av profit: ' +
              Number(botState.maxAvailableShortProfit + 0.2) +
              ' %',
      );
      console.log(
        botState.dealType === 'long'
          ? 'MIN av profit: ' +
              Number(botState.minAvailableLongProfit - 0.2) +
              ' %'
          : 'MIN av profit: ' +
              Number(botState.minAvailableShortProfit + 0.2) +
              ' %',
      );
      console.log(
        'Profit diff (Max/Current): ' +
          Number(botState.maxAvailableProfit) / Number(botState.currentProfit) +
          ' %',
      );
      botState.status === 'sell' && !botState.strategies.scalper.stopLoss
        ? console.log(
            'Buy Price: ' +
              botState.buyPrice +
              ' (' +
              botState.currentPrice +
              ')' +
              '\n' +
              'Current profit: ' +
              (botState.status === 'sell'
                ? botState.dealType === 'long'
                  ? Number(botState.currentProfit - 0.2) + ' %'
                  : Number(botState.currentProfit + 0.2) + ' %'
                : '-'),
          )
        : botState.strategies.scalper.stopLoss
        ? console.log('STATUS: SELL (TAKE PROFIT)')
        : console.log('STATUS: BUY');
      console.log('\n');
      botState.updateState('isPricesStreamAlive', false);
      indicatorsData.isPricesStreamAliveNegativeSignalConfirmationCount++;
      if (
        indicatorsData.isPricesStreamAliveNegativeSignalConfirmationCount >= 20
      )
        await sendToRecipients(`WARNING !!! TRENDS CATCHER
        Prices stream is DEAD!!! Be ready to restart the bot!
  `);
    }, 500);
  })();
})();

process.on('unhandledRejection', async (reason: Error) => {
  console.error(reason);
  await sendToRecipients(`ERROR
    ${JSON.stringify(reason)};
  `);

  process.exit(1);
});
