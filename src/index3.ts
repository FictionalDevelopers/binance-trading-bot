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
import getAvarage from './utils/getAverage';
import { getEmaStream } from '../src/indicators/ema';
import { getObvStream } from './indicators/obv';

import { getRSISignal } from './components/rsi-signals';
import { getTrixSignal, runTrixInterval } from './components/trix-signal';
import {
  getStochRSISignal,
  runStochRsiInterval,
} from './components/stochRSI-signals';
import { getObvSignal, runObvInterval } from './components/obv-signals';
import { service as botStateService } from './components/botState';
import _head from 'lodash/head';
import { getForceIndexSignal, runEFIInterval } from './components/forceIndex';
import { getForceIndexStream } from './indicators/forceIndex';
import { getStochRsiStream } from './indicators/stochRSI';
import { getTrixStream } from './indicators/trix';
import { getRocSignal } from './components/roc-signals';
import { getRocStream } from './indicators/roc';
import { getRsiStream } from './indicators/rsi';
import { getDMISignal } from './components/dmi-signals';
import { indicatorsData } from './index2';

(async function() {
  await connect();
  // await processSubscriptions();
  const revisionNumber = 'ffa2bef39307f7d13bf20d5b92ebaafe4115b081';
  const symbol = 'linkusdt';
  const cryptoCoin = symbol.toUpperCase().slice(0, -4);
  const { available: initialUSDTBalance } = await getBalances('USDT');
  const { available: initialCryptoCoinBalance } = await getBalances(cryptoCoin);
  const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');
  // const openOrders = await checkAllOpenOrders(symbol.toUpperCase());
  // const ordersList = await getOrdersList(symbol.toUpperCase());
  // const lastOrder = ordersList[ordersList.length - 1] || null;
  const workingDeposit = 400;
  // const symbol = process.argv[2];
  // let botState;
  //
  // try {
  //   const response = await botStateService.getBotState();
  //   const initialState = JSON.parse(JSON.stringify(_head(response)));
  //
  //   botState = {
  //     ...initialState,
  //     availableUSDT: initialUSDTBalance,
  //     availableCryptoCoin: initialCryptoCoinBalance,
  //     updateState: function(fieldName, value) {
  //       this[`${fieldName}`] = value;
  //     },
  //   };
  // } catch (e) {
  //   await sendToRecipients(`ERROR
  //   ${JSON.stringify(e)};
  // `);
  //
  //   process.exit(1);
  // }

  const botState = {
    local: true,
    strategies: {
      upTrend: { enabled: false, stopLoss: false },
      downTrend: { enabled: false, stopLoss: false },
      upFlat: { enabled: false, stopLoss: false },
      downFlat: { enabled: false, stopLoss: false },
      stochRsi: { enabled: true, stopLoss: false },
      trendsCatcher: { enabled: false, stopLoss: false },
    },
    buyReason: null,
    enabledLimits: false,
    sellError: false,
    emaStartPoint: null,
    strategy: 'ADX 1m + ROC',
    testMode: true,
    useProfitLevels: false,
    useEMAStopLoss: false,
    status: 'buy',
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
    roc: {
      roc1m: {
        value: null,
      },
      roc5m: {
        value: null,
      },
      roc1h: {
        value: null,
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
    obv5m: {
      obv: null,
    },
    obv15m: {
      obv: null,
    },
    obv1m: {
      obv: null,
      prevObv: null,
    },
    obv: null,
    obvSignal: null,
    priceGrowArea: false,
    stochRsi: {
      stoch1m: {
        BuySignalCount: 0,
        SellSignalCount: 0,
        prev: null,
        value: null,
        signal: null,
        av: null,
        prevAv: null,
      },
      stoch5m: {
        BuySignalCount: 0,
        SellSignalCount: 0,
        prev: null,
        value: null,
        signal: null,
        av: null,
        prevAv: null,
      },
      stoch15m: {
        BuySignalCount: 0,
        SellSignalCount: 0,
        prev: null,
        value: null,
        signal: null,
        av: null,
        prevAv: null,
      },
      stoch1h: null,
    },
    emaSignal: null,
    dmi5m: {
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
      adxDownCount: null,
      adxUpCount: null,
    },
    dmi1m: {
      adxUpCount: null,
      adxDownCount: null,
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
          indicatorsData.rsi5m.rsiValue !== null &&
          indicatorsData.rsi5m.rsiValue <= 67 &&
          // indicatorsData.rsi5m.rsiValue >= 61 &&
          indicatorsData.rsi1m.rsiValue !== null &&
          indicatorsData.rsi1m.rsiValue < 68,
        sell: {
          takeProfit: null,
          stopLoss:
            botState.status === 'sell' &&
            botState.buyReason === 'upTrend' &&
            Number(
              (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
                100,
            ) >= 0.05,
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
          indicatorsData.fast5mEMA > indicatorsData.middle5mEMA &&
          // indicatorsData.fast1mEMA > indicatorsData.middle1mEMA &&
          // indicatorsData.emaSignal === 'buy' &&
          indicatorsData.rsi1m.rsiValue <= 50 &&
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
            Number(
              (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
                100,
            ) >= 0.05,
          // (Number(
          //   (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
          //     100,
          // ) >= 0.1 ||
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
          Number(
            (indicatorsData.fast1mEMA / indicatorsData.middle1mEMA) * 100 -
              100 >=
              0.05 && indicatorsData.middle1mEMA > indicatorsData.slow1mEMA,
          ) &&
          // indicatorsData.roc.roc1m.value > 0.05 &&
          // indicatorsData.stochRsi.stoch1m.signal === 'buy',

          ((indicatorsData.dmi1h.adxUpCount > 0 &&
            Number(
              (indicatorsData.fast1hEMA / indicatorsData.middle1hEMA) * 100 -
                100,
            ) >= 0.05) ||
            (indicatorsData.dmi1h.adxDownCount > 0 &&
              Number(
                (indicatorsData.middle1hEMA / indicatorsData.fast1hEMA) * 100 -
                  100,
              ) >= 0.05)),
        // ((indicatorsData.dmi5m.signal === 'BUY' &&
        //   Number(
        //     (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 -
        //       100,
        //   ) >= 0.05) ||
        //   (indicatorsData.dmi5m.signal === 'SELL' &&
        //     Number(
        //       (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
        //         100,
        //     ) >= 0.05)),
        // indicatorsData.dmi5m.willPriceGrow &&
        // indicatorsData.dmi1m.willPriceGrow,
        // && indicatorsData.emaSignal === 'buy',
        // indicatorsData.stochRsi.stoch1m.signal === 'buy' &&
        // indicatorsData.roc.roc1m > 0.05,
        // ((indicatorsData.dmi5m.signal === 'BUY' &&
        //   indicatorsData.rsi5m.rsiValue > 51) ||
        //   (indicatorsData.dmi5m.signal === 'SELL' &&
        //     indicatorsData.rsi5m.rsiValue !== null &&
        //     indicatorsData.rsi5m.rsiValue < 49)),
        // &&
        // ((indicatorsData.rsi1m.rsiValue > 40 &&
        //   indicatorsData.rsi1m.rsiValue !== null &&
        //   indicatorsData.rsi1m.rsiValue < 45) ||
        //   indicatorsData.rsi1m.rsiValue > 60),
        // indicatorsData.dmi5m.adxSignal === 'buy',
        // indicatorsData.dmi5m.willPriceGrow,
        // ((indicatorsData.rsi1m.rsiValue > 40 &&
        //   indicatorsData.rsi1m.rsiValue !== null &&
        //   indicatorsData.rsi1m.rsiValue < 43) ||
        //   (indicatorsData.rsi1m.rsiValue > 60 &&
        //     indicatorsData.rsi1m.rsiValue !== null &&
        //     indicatorsData.rsi1m.rsiValue < 63)),

        // Number(
        //   (indicatorsData.fast1mEMA / indicatorsData.middle1mEMA) * 100 - 100,
        // ) >= 0.1 &&
        // indicatorsData.trix.trix5m.signal === 'buy',
        // indicatorsData.rsi1m.rsiValue !== null &&
        // indicatorsData.rsi1m.rsiValue > 50 &&
        // indicatorsData.rsi5m.rsiValue !== null &&
        // indicatorsData.rsi5m.rsiValue < 68 &&
        // indicatorsData.efi1h.efiSignal === 'buy' &&
        // ((indicatorsData.efi5m.efi > 0 &&
        // indicatorsData.stochRsi.stoch5m.signal === 'buy' &&
        // indicatorsData.stochRsi.stoch1m.signal === 'buy',
        // indicatorsData.efi.efi15m.efi > 0 &&
        //   indicatorsData.stochRsiSignal.stoch1m === 'buy' &&
        //   indicatorsData.dmi5m.adx > 20) ||
        //   (indicatorsData.efi1m.efi > 0 &&
        // indicatorsData.efi.efi5m.efi > 0,
        //     indicatorsData.dmi1m.adx > 20 &&
        //     indicatorsData.stochRsiSignal.stoch1m === 'buy')),
        // indicatorsData.obvSignal === 'buy' &&
        // indicatorsData.rsi5m.rsiValue >= 41 &&
        // indicatorsData.rsi15m.rsiValue >= 41 &&
        // indicatorsData.stochRsiSignal.stoch5m === 'buy' &&
        // indicatorsData.stochRsiSignal.stoch1m === 'buy',
        // indicatorsData.efi.efi > 0,
        sell: {
          takeProfit: null,
          // botState.status === 'sell' && expectedProfitPercent >= 0.5,
          // botState.buyReason === 'stochRsi' &&
          // indicatorsData.stochRsiSignal.stoch5m === 'sell' ||
          // expectedProfitPercent <= -1,

          stopLoss:
            botState.status === 'sell' &&
            // indicatorsData.stochRsi.stoch1m.signal === 'sell',
            ((indicatorsData.dmi1h.adxDownCount > 0 &&
              Number(
                (indicatorsData.fast1hEMA / indicatorsData.middle1hEMA) * 100 -
                  100,
              ) >= 0.05) ||
              (indicatorsData.dmi1h.adxUpCount > 0 &&
                Number(
                  (indicatorsData.middle1hEMA / indicatorsData.fast1hEMA) *
                    100 -
                    100,
                ) >= 0.05)),
          //   indicatorsData.roc.roc1m.value < -0.1),
          // indicatorsData.roc.roc1m < -0.1
          // ((indicatorsData.dmi5m.signal === 'SELL' &&
          //   Number(
          //     (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 -
          //       100,
          //   ) >= 0.05) ||
          //   (indicatorsData.dmi5m.signal === 'BUY' &&
          //     Number(
          //       (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) *
          //         100 -
          //         100,
          //     ) >= 0.05) ||
          //   indicatorsData.roc.roc1m < -0.1),
          // indicatorsData.stochRsi.stoch1m.signal === 'sell',
          // indicatorsData.roc.roc1m < -0.1,
          // ((indicatorsData.dmi5m.signal === 'SELL' &&
          //   indicatorsData.rsi5m.rsiValue > 51) ||
          //   (indicatorsData.dmi5m.signal === 'BUY' &&
          //     indicatorsData.rsi5m.rsiValue !== null &&
          //     indicatorsData.rsi5m.rsiValue < 49)),
          // ||
          // (indicatorsData.rsi1m.rsiValue < 40 &&
          //   indicatorsData.rsi1m.rsiValue !== null) ||
          // (indicatorsData.rsi1m.rsiValue !== null &&
          //   indicatorsData.rsi1m.rsiValue < 60 &&
          //   indicatorsData.rsi1m.rsiValue > 58)
          // !indicatorsData.dmi1m.willPriceGrow,
          // indicatorsData.emaSignal === 'sell',
          // indicatorsData.stochRsi.stoch5m.signal === 'sell',
          // indicatorsData.dmi5m.signal === 'SELL',
          // indicatorsData.dmi5m.adxSignal === 'sell',

          // !indicatorsData.dmi5m.willPriceGrow,

          // botState.buyReason === 'stochRsi' &&
          // indicatorsData.rsi1m.rsiValue < 40,

          // indicatorsData.trix.trix5m.signal === 'sell',
          // ((indicatorsData.stochRsi.stoch5m.signal === 'sell' &&
          //   indicatorsData.stochRsi.stoch15m.signal === 'sell') ||
          //   (Number(
          //     (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
          //       100,
          //   ) >= 0.1 &&
          //     expectedProfitPercent < 0)),
          // indicatorsData.efi1h.efiSignal === 'sell',

          // indicatorsData.obvSignal === 'sell',
          // indicatorsData.stochRsiSignal.stoch15m === 'sell',
          //   expectedProfitPercent >= 1),

          // ((indicatorsData.stochRsiSignal.stoch5m === 'sell' &&
          //   !indicatorsData.priceGrowArea) ||
          //   (indicatorsData.priceGrowArea &&
          //     Number(
          //       (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) *
          //         100 -
          //         100,
          //     ) >= 0.5)),

          // (indicatorsData.rsi5m.rsiValue !== null &&
          //   indicatorsData.rsi5m.rsiValue < 39)),)
        },
      },
      trendsCatcher: {
        buy:
          botState.status === 'buy' && indicatorsData.dmi15m.signal === 'BUY',
        // indicatorsData.dmi1h.willPriceGrow &&
        // Number(
        //   (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
        // ) >= 0.1,
        sell: {
          takeProfit:
            expectedProfitPercent >= 1 &&
            botState.buyReason === 'trendsCatcher',
          stopLoss:
            botState.status === 'sell' &&
            indicatorsData.dmi15m.signal === 'SELL' &&
            botState.buyReason === 'trendsCatcher',
          // (Number(
          //   (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
          //     100,
          // ) >= 0.5 ||
          //   !indicatorsData.dmi1h.willPriceGrow),
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
          botState.strategy,
        );
        botState.buyReason = 'stochRsi';
        indicatorsData.obvBuySignalCount = 0;
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

    if (conditions.upTrend.sell.stopLoss) {
      await marketSellAction(
        'upTrend',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'STOP LOSS OR TAKE PROFIT',
        indicatorsData,
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
        indicatorsData,
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
        indicatorsData,
      );
      indicatorsData.rsiRebuy.value = true;
      return;
    }

    /** *********************UP FLAT***********************/

    if (conditions.upFlat.sell.takeProfit) {
      if (
        false
        // Number(
        //   (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
        // ) >= 0.1 &&
        // Number(
        //   (indicatorsData.fast15mEMA / indicatorsData.middle15mEMA) * 100 - 100,
        // ) >= 0.1
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
          indicatorsData,
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
        indicatorsData,
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
        indicatorsData,
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
        indicatorsData,
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
        indicatorsData,
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
        botState.strategy,
        indicatorsData,
        false,
      );
      indicatorsData.obvSellSignalCount = 0;

      // indicatorsData.priceGrowArea = false;
      return;
    }

    /** *********************TRENDS CATCHER***********************/

    if (
      conditions.trendsCatcher.sell.takeProfit &&
      !botState.strategies.trendsCatcher.stopLoss
    ) {
      await marketSellAction(
        'trendsCatcher',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'TRENDS CATCHER TAKE PROFIT',
        indicatorsData,
        true,
      );
      return;
    }

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
        indicatorsData,
      );
      return;
    }

    botState.updateState('prevPrice', botState.currentPrice);
  };

  // getRocSignal(symbol, '5m', indicatorsData.roc.roc1m);
  // getTrixSignal(symbol, '5m', indicatorsData.trix.trix5m);
  // getStochRSISignal(symbol, '5m', indicatorsData.stochRsi.stoch1m, 2.5, 2.5);
  // getStochRSISignal(symbol, '5m', indicatorsData.stochRsi.stoch1m, 2.5, 2.5);
  // getForceIndexSignal(symbol, '5m', 13, indicatorsData.efi.efi5m);
  // getForceIndexSignal(symbol, '15m', 13, indicatorsData.efi.efi15m);
  // getStochRSISignal(symbol, '5m', indicatorsData.stochRsi.stoch1m, 2.5, 2.5);
  // getDMISignal(symbol, '5m', indicatorsData.dmi5m, 2, 2, 0, 0);
  getDMISignal(symbol, '1h', indicatorsData.dmi1h, 1, 1, 0, 0);
  getEMASignal(symbol, '1h', indicatorsData);
  getEMASignal(symbol, '1m', indicatorsData);
  // getDMISignal(symbol, '5m', indicatorsData.dmi5m, 1, 0, 0.5, -0.5, 0.5, 0.5);
  // getDMISignal(symbol, '1m', indicatorsData.dmi1m);

  // getRSISignal(symbol, '1m', indicatorsData.rsi1m);
  // getRSISignal(symbol, '5m', indicatorsData.rsi5m);
  // getEMASignal(symbol, '5m', indicatorsData);
  // getEMASignal(symbol, '15m', indicatorsData);
  // getEMASignal(symbol, '1m', indicatorsData);
  // getObvSignal(symbol, '1m', indicatorsData.obv1m);
  // runObvInterval(indicatorsData.obv1m);
  // getForceIndexSignal(symbol, '1h', 13, indicatorsData.efi1h);
  // getForceIndexSignal(symbol, '5m', 13, indicatorsData.efi5m);
  // getForceIndexSignal(symbol, '1m', 13, indicatorsData.efi1m);

  // getRsiStream({
  //   symbol: symbol,
  //   interval: '1m',
  //   period: 9,
  // })
  //   .pipe(bufferCount(5, 5))
  //   .subscribe(values => {
  //     if (!indicatorsData.emaAv) {
  //       indicatorsData.emaAv = getAvarage(values);
  //       return;
  //     }
  //     const currentEmaAv = getAvarage(values);
  //     if (currentEmaAv > indicatorsData.emaAv) indicatorsData.emaSignal = 'buy';
  //     if (currentEmaAv < indicatorsData.emaAv)
  //       indicatorsData.emaSignal = 'sell';
  //     console.log(
  //       indicatorsData.emaSignal,
  //       (currentEmaAv / indicatorsData.emaAv) * 100 - 100,
  //     );
  //     console.log('Curr av:' + currentEmaAv);
  //     console.log('Prev av:' + indicatorsData.emaAv);
  //     console.log(
  //       'Diff: ',
  //       (currentEmaAv - indicatorsData.emaAv).toString(),
  //       '\n',
  //     );
  //     indicatorsData.emaAv = currentEmaAv;
  //   });

  // getObvStream({
  //   symbol: symbol,
  //   interval: '1m',
  // })
  //   .pipe(bufferCount(5, 5))
  //   .subscribe(values => {
  //     if (!indicatorsData.prevObv) {
  //       indicatorsData.prevObv = getAvarage(values);
  //       return;
  //     }
  //     const currentObvAv = getAvarage(values);
  //     if (currentObvAv > indicatorsData.prevObv)
  //       indicatorsData.obvSignal = 'buy';
  //     if (currentObvAv < indicatorsData.prevObv)
  //       indicatorsData.obvSignal = 'sell';
  //     // console.log(
  //     //   indicatorsData.emaSignal,
  //     //   (currentEmaAv / indicatorsData.emaAv) * 100 - 100,
  //     // );
  //     console.log('Curr obv:' + currentObvAv);
  //     console.log('Prev obv:' + indicatorsData.prevObv);
  //     console.log(
  //       'Diff: ',
  //       (Number(currentObvAv / indicatorsData.prevObv) * 100 - 100).toString(),
  //       '\n',
  //     );
  //     indicatorsData.prevObv = currentObvAv;
  //   });

  if (botState.testMode) {
    await sendToRecipients(`INIT (TEST MODE LOCAL)
  TRADER: ${botState.strategy}  
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  Revision N: ${revisionNumber}
  Strategies: ${JSON.stringify(botState.strategies)}
  Status: ${botState.status.toUpperCase()}
  Symbol: ${symbol.toUpperCase()}
  `);
  } else {
    await sendToRecipients(`INIT (LOCAL)
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  Revision N: ${revisionNumber}
  Strategies: ${JSON.stringify(botState.strategies)}
  Status: ${botState.status.toUpperCase()}
  Symbol: ${symbol.toUpperCase()}
  Initial USDT balance: ${initialUSDTBalance} USDT
  Initial ${cryptoCoin} balance: ${initialCryptoCoinBalance} ${cryptoCoin}
  `);
  }

  // runStochRsiInterval(indicatorsData.stochRsi.stoch5m);
  getRocSignal(symbol, '1m', indicatorsData.roc.roc1m);
  getTradeStream({
    symbol: symbol,
    resource: RESOURCES.TRADE,
  })
    .pipe(pluck('price'), bufferCount(1, 1))
    .subscribe(trader);

  // getEmaStream({
  //   symbol: symbol,
  //   interval: '1m',
  //   period: 7,
  // })
  //   .pipe(bufferCount(5, 5))
  //   .subscribe(values => {
  //     if (!indicatorsData.emaAv) {
  //       indicatorsData.emaAv = getAvarage(values);
  //       return;
  //     }
  //     const currentEmaAv = getAvarage(values);
  //     if ((currentEmaAv / indicatorsData.emaAv) * 100 - 100 > 0)
  //       indicatorsData.emaSignal = 'buy';
  //     if ((currentEmaAv / indicatorsData.emaAv) * 100 - 100 < 0)
  //       indicatorsData.emaSignal = 'sell';
  //     console.log(
  //       indicatorsData.emaSignal,
  //       (currentEmaAv / indicatorsData.emaAv) * 100 - 100,
  //     );
  //     indicatorsData.emaAv = currentEmaAv;
  //   });
})();

process.on('unhandledRejection', async (reason: Error) => {
  console.error(reason);
  await sendToRecipients(`ERROR
    ${JSON.stringify(reason)};
  `);

  process.exit(1);
});
