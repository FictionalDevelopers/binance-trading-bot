import { pluck, bufferCount } from 'rxjs/operators';
import { format } from 'date-fns';
import { connect } from './db/connection';
import _omit from 'lodash/omit';
import { RESOURCES } from './constants';
import { DATE_FORMAT } from './constants/date';
import { getTradeStream } from './api/trades.js';
import { sendToRecipients } from './services/telegram';
import { getBalances, getFuturesBalances } from './api/balance';
import { getExchangeInfo } from './api/exchangeInfo';
import {
  marketSellAction,
  marketBuyAction,
  getOrdersList,
  checkAllOpenOrders,
  cancelAllOpenOrders,
  marketFuturesBuyAction,
  marketFuturesSellAction,
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
import _throttle from 'lodash/throttle';
import _debounce from 'lodash/debounce';
import { getHeikinAshiSignal } from './indicators/heikinAshi';
import {
  calculateAvgDealPriceChange,
  calculateAvgPriceChange,
} from './tools/avgPriceTools';
import { getDMISignal } from './components/dmi-signals';

(async function() {
  await connect();
  // await processSubscriptions();
  const revisionNumber = 'ffa2bef39307f7d13bf20d5b92ebaafe4115b081';
  const symbol = 'linkusdt';
  const cryptoCoin = symbol.toUpperCase().slice(0, -4);
  const { available: initialUSDTBalance } = await getBalances('USDT');
  const { available: initialCryptoCoinBalance } = await getBalances(cryptoCoin);
  const initialFuturesUSDTBalance = await getFuturesBalances('USDT');
  // const initialFuturesCryptocoinBalance = await getFuturesBalances(cryptoCoin);
  const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');
  const openOrders = await checkAllOpenOrders(symbol.toUpperCase());
  const ordersList = await getOrdersList(symbol.toUpperCase());
  const lastOrder = ordersList[ordersList.length - 1] || null;
  const spotDealUSDTAmount = 10;
  const futuresDealUSDTAmount = 12;
  // const symbol = process.argv[2];
  let botState;
  //
  try {
    const response = await botStateService.getBotState();
    const initialState = JSON.parse(JSON.stringify(_head(response)));

    botState = {
      ...initialState,
      // traidingMarket: 'spot',
      availableUSDT: initialUSDTBalance,
      availableCryptoCoin: initialCryptoCoinBalance,
      availableFuturesUSDT: initialFuturesUSDTBalance,
      // availableFuturesCryptocoin: initialFuturesCryptocoinBalance,
      local: false,
      // status: 'buy',
      // testMode: true,
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

  // const botState = {
  //   dealPricesArr: [],
  //   avgDealPrice: null,
  //   prevAvgDealPrice: null,
  //   avgPrice: null,
  //   prevAvgPrice: null,
  //   maxAvailableProfit: 0,
  //   totalMaxAvailableProfit: 0,
  //   minAvailableProfit: 0,
  //   totalMinAvailableProfit: 0,
  //   profitDiff: 0,
  //   isPricesStreamAlive: false,
  //   local: true,
  //   logToTelegram: true,
  //   strategies: {
  //     scalper: { enabled: true, stopLoss: false },
  //     upTrend: { enabled: false, stopLoss: false },
  //     downTrend: { enabled: false, stopLoss: false },
  //     upFlat: { enabled: false, stopLoss: false },
  //     downFlat: { enabled: false, stopLoss: false },
  //     stochRsi: { enabled: false, stopLoss: false },
  //     trendsCatcher: { enabled: false, stopLoss: false },
  //   },
  //   buyReason: null,
  //   enabledLimits: false,
  //   sellError: false,
  //   emaStartPoint: null,
  //   strategy: 'Strategy 1(take prof)',
  //   testMode: true,
  //   useProfitLevels: false,
  //   useEMAStopLoss: false,
  //   status: 'buy',
  //   // status: 'buy',
  //   profitLevels: {
  //     '1': {
  //       id: 1,
  //       profitPercent: 1,
  //       amountPercent: 0.5,
  //       isFilled: false,
  //     },
  //     '2': {
  //       id: 2,
  //       profitPercent: 2,
  //       amountPercent: 0.5,
  //       isFilled: false,
  //     },
  //     '3': {
  //       id: 3,
  //       profitPercent: 4,
  //       amountPercent: 0.5,
  //       isFilled: false,
  //     },
  //   },
  //   currentProfit: null,
  //   totalProfit: null,
  //   totalPercentProfit: null,
  //   tradeAmountPercent: 0.95,
  //   availableUSDT: initialUSDTBalance,
  //   availableCryptoCoin: initialCryptoCoinBalance,
  //   cummulativeQuoteQty: null,
  //   buyPrice: null,
  //   lastBid: null,
  //   currentPrice: null,
  //   order: null,
  //   avrDealProfit: null,
  //   dealsCount: 1,
  //   startTime: new Date().getTime(),
  //   workDuration: null,
  //   stopLoss: null,
  //   prevPrice: null,
  //   updateState: function(fieldName, value) {
  //     this[`${fieldName}`] = value;
  //   },
  // };

  const indicatorsData = {
    avgPrices: {
      avgBig: {
        avgPriceSignal: null,
        avgPrice: null,
        avgPriceDiff: null,
        prevAvgPrice: null,
        avgPriceUpSignalCount: null,
        avgPriceDownSignalCount: null,
      },
      avgSmall: {
        avgPriceSignal: null,

        avgPrice: null,
        avgPriceDiff: null,
        prevAvgPrice: null,
        avgPriceUpSignalCount: null,
        avgPriceDownSignalCount: null,
      },
    },
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
      ha4hCandle: {
        open: null,
        close: null,
        high: null,
        low: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
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
    obv1d: {
      signal: null,
      buySignalCount: 0,
      sellSignalCount: 0,
      obv: null,
      prevObv: null,
      obvDiff: null,
    },
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
  // const trader = async pricesStream => {
  //   const { tradeAmountPercent } = botState;
  //   if (botState.status === 'isPending') return;
  //   botState.updateState(
  //     'currentPrice',
  //     Number(pricesStream[pricesStream.length - 1]),
  //   );
  //   const expectedProfitPercent = botState.buyPrice
  //     ? botState.currentPrice / botState.buyPrice > 1
  //       ? Number((botState.currentPrice / botState.buyPrice) * 100 - 100)
  //       : Number(-1 * (100 - (botState.currentPrice / botState.buyPrice) * 100))
  //     : 0;
  //
  //   const conditions = {
  //     upTrend: {
  //       buy:
  //         botState.status === 'buy' &&
  //         Number(
  //           (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
  //         ) >= 0.1 &&
  //         indicatorsData.rsi5m.rsiValue !== null &&
  //         indicatorsData.rsi5m.rsiValue <= 67 &&
  //         // indicatorsData.rsi5m.rsiValue >= 61 &&
  //         indicatorsData.rsi1m.rsiValue !== null &&
  //         indicatorsData.rsi1m.rsiValue < 68,
  //       sell: {
  //         takeProfit: null,
  //         stopLoss:
  //           botState.status === 'sell' &&
  //           botState.buyReason === 'upTrend' &&
  //           Number(
  //             (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
  //               100,
  //           ) >= 0.05,
  //       },
  //     },
  //     downTrend: {
  //       buy:
  //         botState.status === 'buy' &&
  //         indicatorsData.rsi1m.rsiValue >= 62 &&
  //         Number(
  //           (indicatorsData.fast1mEMA / indicatorsData.middle1mEMA) * 100 - 100,
  //         ) >= 0.1,
  //
  //       // indicatorsData.rsiRebuy.value &&
  //       // indicatorsData.middle1mEMA < indicatorsData.slow1mEMA &&
  //       // indicatorsData.rsi1m.rsiValue !== null &&
  //       // indicatorsData.rsi1m.rsiValue >= 41 &&
  //       // indicatorsData.rsi1m.rsiValue <= 40 &&
  //       // indicatorsData.rsi5m.rsiValue !== null &&
  //       // indicatorsData.rsi5m.rsiValue >= 41 &&
  //       // indicatorsData.rsi5m.rsiValue <= 45,
  //
  //       sell: {
  //         takeProfit:
  //           botState.status === 'sell' &&
  //           botState.buyReason === 'downTrend' &&
  //           expectedProfitPercent >= 0.7,
  //
  //         // // indicatorsData.rsi1m.rsiValue >= 59 &&
  //         // ((Number(
  //         //   (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
  //         //     100,
  //         // ) >= 0.1 &&
  //         //   expectedProfitPercent > 0.5) ||
  //         //   expectedProfitPercent >= 0.7),
  //         stopLoss:
  //           botState.status === 'sell' &&
  //           botState.buyReason === 'downTrend' &&
  //           Number(
  //             (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
  //               100,
  //           ) >= 0.1,
  //         // indicatorsData.rsi1m.rsiValue !== null &&
  //         // indicatorsData.rsi1m.rsiValue < 39 &&
  //         // indicatorsData.rsi5m.rsiValue !== null &&
  //         // indicatorsData.rsi5m.rsiValue < 39,
  //       },
  //     },
  //     upFlat: {
  //       buy:
  //         botState.status === 'buy' &&
  //         indicatorsData.fast5mEMA > indicatorsData.middle5mEMA &&
  //         // indicatorsData.fast1mEMA > indicatorsData.middle1mEMA &&
  //         // indicatorsData.emaSignal === 'buy' &&
  //         indicatorsData.rsi1m.rsiValue <= 50 &&
  //         indicatorsData.rsi1m.rsiValue !== null,
  //       sell: {
  //         takeProfit:
  //           botState.status === 'sell' &&
  //           botState.buyReason === 'upFlat' &&
  //           indicatorsData.rsi1m.rsiValue >= 69 &&
  //           expectedProfitPercent > 0,
  //         stopLoss:
  //           botState.status === 'sell' &&
  //           botState.buyReason === 'upFlat' &&
  //           Number(
  //             (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
  //               100,
  //           ) >= 0.05,
  //         // (Number(
  //         //   (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
  //         //     100,
  //         // ) >= 0.1 ||
  //       },
  //     },
  //     downFlat: {
  //       buy:
  //         botState.status === 'buy' &&
  //         // indicatorsData.fast5mEMA < indicatorsData.middle5mEMA &&
  //         // indicatorsData.emaSignal === 'buy' &&
  //         indicatorsData.rsi1m.rsiValue < 35 &&
  //         indicatorsData.rsi1m.rsiValue !== null &&
  //         indicatorsData.rsi5m.rsiValue >= 40,
  //       sell: {
  //         takeProfit:
  //           botState.status === 'sell' &&
  //           botState.buyReason === 'downFlat' &&
  //           indicatorsData.rsi1m.rsiValue >= 59 &&
  //           expectedProfitPercent > 0,
  //         stopLoss:
  //           botState.status === 'sell' &&
  //           botState.buyReason === 'downFlat' &&
  //           indicatorsData.rsi5m.rsiValue !== null &&
  //           indicatorsData.rsi5m.rsiValue < 39,
  //       },
  //     },
  //     stochRsiStrategy: {
  //       buy: botState.status === 'buy' && indicatorsData.emaSignal === 'buy',
  //       // indicatorsData.roc.roc1m > 0.05 &&
  //       // indicatorsData.stochRsi.stoch1m.signal === 'buy',
  //
  //       // indicatorsData.emaSignal === 'buy',
  //       // ((indicatorsData.dmi5m.signal === 'BUY' &&
  //       //   Number(
  //       //     (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 -
  //       //       100,
  //       //   ) >= 0.05) ||
  //       //   (indicatorsData.dmi5m.signal === 'SELL' &&
  //       //     Number(
  //       //       (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
  //       //         100,
  //       //     ) >= 0.05)),
  //       // indicatorsData.dmi5m.willPriceGrow &&
  //       // indicatorsData.dmi1m.willPriceGrow,
  //       // && indicatorsData.emaSignal === 'buy',
  //       // indicatorsData.stochRsi.stoch1m.signal === 'buy' &&
  //       // indicatorsData.roc.roc1m > 0.05,
  //       // ((indicatorsData.dmi5m.signal === 'BUY' &&
  //       //   indicatorsData.rsi5m.rsiValue > 51) ||
  //       //   (indicatorsData.dmi5m.signal === 'SELL' &&
  //       //     indicatorsData.rsi5m.rsiValue !== null &&
  //       //     indicatorsData.rsi5m.rsiValue < 49)),
  //       // &&
  //       // ((indicatorsData.rsi1m.rsiValue > 40 &&
  //       //   indicatorsData.rsi1m.rsiValue !== null &&
  //       //   indicatorsData.rsi1m.rsiValue < 45) ||
  //       //   indicatorsData.rsi1m.rsiValue > 60),
  //       // indicatorsData.dmi5m.adxSignal === 'buy',
  //       // indicatorsData.dmi5m.willPriceGrow,
  //       // ((indicatorsData.rsi1m.rsiValue > 40 &&
  //       //   indicatorsData.rsi1m.rsiValue !== null &&
  //       //   indicatorsData.rsi1m.rsiValue < 43) ||
  //       //   (indicatorsData.rsi1m.rsiValue > 60 &&
  //       //     indicatorsData.rsi1m.rsiValue !== null &&
  //       //     indicatorsData.rsi1m.rsiValue < 63)),
  //
  //       // Number(
  //       //   (indicatorsData.fast1mEMA / indicatorsData.middle1mEMA) * 100 - 100,
  //       // ) >= 0.1 &&
  //       // indicatorsData.trix.trix5m.signal === 'buy',
  //       // indicatorsData.rsi1m.rsiValue !== null &&
  //       // indicatorsData.rsi1m.rsiValue > 50 &&
  //       // indicatorsData.rsi5m.rsiValue !== null &&
  //       // indicatorsData.rsi5m.rsiValue < 68 &&
  //       // indicatorsData.efi1h.efiSignal === 'buy' &&
  //       // ((indicatorsData.efi5m.efi > 0 &&
  //       // indicatorsData.stochRsi.stoch5m.signal === 'buy' &&
  //       // indicatorsData.stochRsi.stoch1m.signal === 'buy',
  //       // indicatorsData.efi.efi15m.efi > 0 &&
  //       //   indicatorsData.stochRsiSignal.stoch1m === 'buy' &&
  //       //   indicatorsData.dmi5m.adx > 20) ||
  //       //   (indicatorsData.efi1m.efi > 0 &&
  //       // indicatorsData.efi.efi5m.efi > 0,
  //       //     indicatorsData.dmi1m.adx > 20 &&
  //       //     indicatorsData.stochRsiSignal.stoch1m === 'buy')),
  //       // indicatorsData.obvSignal === 'buy' &&
  //       // indicatorsData.rsi5m.rsiValue >= 41 &&
  //       // indicatorsData.rsi15m.rsiValue >= 41 &&
  //       // indicatorsData.stochRsiSignal.stoch5m === 'buy' &&
  //       // indicatorsData.stochRsiSignal.stoch1m === 'buy',
  //       // indicatorsData.efi.efi > 0,
  //       sell: {
  //         takeProfit: null,
  //         // botState.status === 'sell' && expectedProfitPercent >= 0.5,
  //         // botState.buyReason === 'stochRsi' &&
  //         // indicatorsData.stochRsiSignal.stoch5m === 'sell' ||
  //         // expectedProfitPercent <= -1,
  //
  //         stopLoss:
  //           botState.status === 'sell' && indicatorsData.emaSignal === 'sell',
  //         // indicatorsData.stochRsi.stoch1m.signal === 'sell',
  //         // indicatorsData.emaSignal === 'sell',
  //         // ((indicatorsData.dmi5m.signal === 'SELL' &&
  //         //   Number(
  //         //     (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 -
  //         //       100,
  //         //   ) >= 0.05) ||
  //         //   (indicatorsData.dmi5m.signal === 'BUY' &&
  //         //     Number(
  //         //       (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) *
  //         //         100 -
  //         //         100,
  //         //     ) >= 0.05) ||
  //         //   indicatorsData.roc.roc1m < -0.1),
  //         // indicatorsData.stochRsi.stoch1m.signal === 'sell',
  //         // indicatorsData.roc.roc1m < -0.1,
  //         // ((indicatorsData.dmi5m.signal === 'SELL' &&
  //         //   indicatorsData.rsi5m.rsiValue > 51) ||
  //         //   (indicatorsData.dmi5m.signal === 'BUY' &&
  //         //     indicatorsData.rsi5m.rsiValue !== null &&
  //         //     indicatorsData.rsi5m.rsiValue < 49)),
  //         // ||
  //         // (indicatorsData.rsi1m.rsiValue < 40 &&
  //         //   indicatorsData.rsi1m.rsiValue !== null) ||
  //         // (indicatorsData.rsi1m.rsiValue !== null &&
  //         //   indicatorsData.rsi1m.rsiValue < 60 &&
  //         //   indicatorsData.rsi1m.rsiValue > 58)
  //         // !indicatorsData.dmi1m.willPriceGrow,
  //         // indicatorsData.emaSignal === 'sell',
  //         // indicatorsData.stochRsi.stoch5m.signal === 'sell',
  //         // indicatorsData.dmi5m.signal === 'SELL',
  //         // indicatorsData.dmi5m.adxSignal === 'sell',
  //
  //         // !indicatorsData.dmi5m.willPriceGrow,
  //
  //         // botState.buyReason === 'stochRsi' &&
  //         // indicatorsData.rsi1m.rsiValue < 40,
  //
  //         // indicatorsData.trix.trix5m.signal === 'sell',
  //         // ((indicatorsData.stochRsi.stoch5m.signal === 'sell' &&
  //         //   indicatorsData.stochRsi.stoch15m.signal === 'sell') ||
  //         //   (Number(
  //         //     (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
  //         //       100,
  //         //   ) >= 0.1 &&
  //         //     expectedProfitPercent < 0)),
  //         // indicatorsData.efi1h.efiSignal === 'sell',
  //
  //         // indicatorsData.obvSignal === 'sell',
  //         // indicatorsData.stochRsiSignal.stoch15m === 'sell',
  //         //   expectedProfitPercent >= 1),
  //
  //         // ((indicatorsData.stochRsiSignal.stoch5m === 'sell' &&
  //         //   !indicatorsData.priceGrowArea) ||
  //         //   (indicatorsData.priceGrowArea &&
  //         //     Number(
  //         //       (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) *
  //         //         100 -
  //         //         100,
  //         //     ) >= 0.5)),
  //
  //         // (indicatorsData.rsi5m.rsiValue !== null &&
  //         //   indicatorsData.rsi5m.rsiValue < 39)),)
  //       },
  //     },
  //     trendsCatcher: {
  //       buy:
  //         botState.status === 'buy' && indicatorsData.dmi15m.signal === 'BUY',
  //       // indicatorsData.dmi1h.willPriceGrow &&
  //       // Number(
  //       //   (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
  //       // ) >= 0.1,
  //       sell: {
  //         takeProfit:
  //           expectedProfitPercent >= 1 &&
  //           botState.buyReason === 'trendsCatcher',
  //         stopLoss:
  //           botState.status === 'sell' &&
  //           indicatorsData.dmi15m.signal === 'SELL' &&
  //           botState.buyReason === 'trendsCatcher',
  //         // (Number(
  //         //   (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
  //         //     100,
  //         // ) >= 0.5 ||
  //         //   !indicatorsData.dmi1h.willPriceGrow),
  //       },
  //     },
  //   };
  //
  //   /** ******************************************BUY ACTIONS********************************************************/

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

    // botState.updateState(
    //   'profitDiff',
    //   Number(botState.maxAvailableProfit / expectedProfitPercent),
    // );

    const conditions = {
      scalper: {
        buy: {
          long:
            botState.initialDealType === 'short'
              ? null
              : botState.status === 'buy' &&
                indicatorsData.obv1d.buySignalCount >= 100 &&
                indicatorsData.obv15m.buySignalCount >= 100 &&
                indicatorsData.obv1h.buySignalCount >= 100,
          // indicatorsData.obv5m.buySignalCount >= 20 &&
          // indicatorsData.obv1m.buySignalCount >= 10,
          // (indicatorsData.dmi15m.adxUpCount >= 2 ||
          //   indicatorsData.dmi15m.adxDownCount >= 2),
          short:
            botState.initialDealType === 'long'
              ? null
              : botState.status === 'buy' &&
                indicatorsData.obv1d.sellSignalCount >= 100 &&
                indicatorsData.obv15m.sellSignalCount >= 100 &&
                indicatorsData.obv1h.sellSignalCount >= 100,
          // indicatorsData.obv1m.sellSignalCount >= 10,
          // (indicatorsData.dmi15m.adxUpCount >= 2 ||
          //   indicatorsData.dmi15m.adxDownCount >= 2),
        },
        sell: {
          takeProfit: null,
          // (botState.status === 'sell' &&
          //   botState.dealType === 'long' &&
          //   indicatorsData.obv15m.sellSignalCount >= 30) ||
          // (botState.status === 'sell' &&
          //   botState.dealType === 'short' &&
          //   indicatorsData.obv15m.buySignalCount >= 30),

          stopLoss: {
            long:
              botState.status === 'sell' &&
              botState.dealType === 'long' &&
              (indicatorsData.obv1d.sellSignalCount >= 100 ||
                // indicatorsData.obv1m.sellSignalCount >= 10,
                // (indicatorsData.obv15m.sellSignalCount >= 10 ||
                (indicatorsData.obv1h.sellSignalCount >= 100 &&
                  indicatorsData.obv15m.sellSignalCount >= 100)),
            short:
              botState.status === 'sell' &&
              botState.dealType === 'short' &&
              (indicatorsData.obv1d.buySignalCount >= 100 ||
                (indicatorsData.obv1h.buySignalCount >= 100 &&
                  // (indicatorsData.obv15m.buySignalCount >= 10 ||
                  indicatorsData.obv15m.buySignalCount >= 40)),
          },
        },
      },
    };

    /** ******************************************BUY ACTIONS********************************************************/
    if (botState.strategies.scalper.enabled) {
      if (conditions.scalper.buy.long) {
        if (botState.traidingMarket === 'spot') {
          await marketBuyAction(
            'long',
            false,
            symbol,
            botState,
            cryptoCoin,
            pricesStream,
            stepSize,
            'TRENDS CATCHER 2',
            spotDealUSDTAmount,
            'STRATEGY 2',
            indicatorsData,
          );
        } else if (botState.traidingMarket === 'futures') {
          await marketFuturesBuyAction(
            'long',
            false,
            symbol,
            botState,
            cryptoCoin,
            pricesStream,
            stepSize,
            'TRENDS CATCHER 2',
            futuresDealUSDTAmount,
            'STRATEGY 2',
            indicatorsData,
          );
        }
        botState.buyReason = 'scalper';
        return;
      }
      botState.updateState('prevPrice', botState.currentPrice);
      botState.updateState('currentProfit', expectedProfitPercent);
    }
    if (botState.strategies.scalper.enabled) {
      if (conditions.scalper.buy.short) {
        if (botState.traidingMarket === 'spot') {
          await marketBuyAction(
            'short',
            true,
            symbol,
            botState,
            cryptoCoin,
            pricesStream,
            stepSize,
            'TRENDS CATCHER 2',
            spotDealUSDTAmount,
            'STRATEGY 2',
            indicatorsData,
          );
        } else if (botState.traidingMarket === 'futures') {
          await marketFuturesBuyAction(
            'short',
            false,
            symbol,
            botState,
            cryptoCoin,
            pricesStream,
            stepSize,
            'TRENDS CATCHER 2',
            futuresDealUSDTAmount,
            'STRATEGY 2',
            indicatorsData,
          );
        }
        botState.buyReason = 'scalper';
        return;
      }
      botState.updateState('prevPrice', botState.currentPrice);
      botState.updateState('currentProfit', expectedProfitPercent);
    }

    /** *****************************************SELL ACTIONS********************************************************/
    if (
      conditions.scalper.sell.takeProfit &&
      !botState.strategies.scalper.stopLoss
    ) {
      if (botState.traidingMarket === 'spot') {
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
      } else if (botState.traidingMarket === 'futures') {
        await marketFuturesSellAction(
          'scalper',
          false,
          symbol,
          botState,
          cryptoCoin,
          expectedProfitPercent,
          pricesStream,
          stepSize,
          initialFuturesUSDTBalance,
          'TRENDS CATCHER 2 (TAKE PROFIT)',
          indicatorsData,
          true,
        );
      }
      return;
    }
    if (conditions.scalper.sell.stopLoss.long) {
      if (botState.traidingMarket === 'spot') {
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
            'STRATEGY 2',
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
            'STOP LOSS',
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
          'STRATEGY 2',
          indicatorsData,
        );
        return;
        // catch (e) {
        //   const { available: refreshedCryptoCoinBalance } = await getBalances(
        //     cryptoCoin,
        //   );
        //   botState.updateState(
        //     'availableCryptoCoin',
        //     +refreshedCryptoCoinBalance,
        //   );
        //   botState.sellError = true;
        //   botState.updateState('status', 'sell');
        // }
      } else if (botState.traidingMarket === 'futures') {
        await marketFuturesSellAction(
          'scalper',
          false,
          symbol,
          botState,
          cryptoCoin,
          expectedProfitPercent,
          pricesStream,
          stepSize,
          initialFuturesUSDTBalance,
          'STRATEGY 2',
          indicatorsData,
        );
      }
      return;
    }
    if (conditions.scalper.sell.stopLoss.short) {
      if (botState.traidingMarket === 'spot') {
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
          'STOP LOSS',
          indicatorsData,
        );
        return;
      } else {
        await marketFuturesSellAction(
          'scalper',
          false,
          symbol,
          botState,
          cryptoCoin,
          expectedProfitPercent,
          pricesStream,
          stepSize,
          initialFuturesUSDTBalance,
          'STOP LOSS',
          indicatorsData,
        );
        return;
      }
    }

    botState.updateState('prevPrice', botState.currentPrice);
    botState.updateState('currentProfit', expectedProfitPercent);
  };

  if (botState.testMode) {
    await sendToRecipients(`INIT TEST MODE (REMOTE)
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  Revision N: ${revisionNumber}
  Strategies: STRATEGY 1(take prof)
  Status: ${botState.status.toUpperCase()}
  Symbol: ${symbol.toUpperCase()}
  `);
  } else {
    await sendToRecipients(`INIT REAL MODE (REMOTE)
  Traiding market: ${botState.traidingMarket.toUpperCase()}
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  Revision N: ${revisionNumber}
  Strategies: ${JSON.stringify(botState.strategies)}
  Status: ${botState.status.toUpperCase()}
  Symbol: ${symbol.toUpperCase()}
    ***SPOT***
  Initial USDT balance: ${initialUSDTBalance} USDT
  Deal USDT amount: ${spotDealUSDTAmount} USDT
  Initial ${cryptoCoin} balance: ${initialCryptoCoinBalance} ${cryptoCoin}
    ***FUTURES***
  Initial USDT balance: ${initialFuturesUSDTBalance} USDT
  Deal USDT amount: ${futuresDealUSDTAmount} USDT
  `);
  }

  getTradeStream({
    symbol: symbol,
    resource: RESOURCES.TRADE,
  })
    .pipe(pluck('price'), bufferCount(1, 1))
    .subscribe(scalper);

  /** *******************************INDICATORS SECTION**************************************/

  getObvSignal(symbol, '1d', indicatorsData.obv1d, 60, 60);
  getObvSignal(symbol, '1h', indicatorsData.obv1h, 10, 10);
  getObvSignal(symbol, '15m', indicatorsData.obv15m, 10, 10);
  // getObvSignal(symbol, '5m', indicatorsData.obv5m, 10, 10);
  // getObvSignal(symbol, '1m', indicatorsData.obv1m, 10, 10);

  /** *************************DATA LOGGER********************************/
  const getSum = (numbers = []) =>
    numbers.reduce((sum, number) => Number(sum) + Number(number), 0);
  const fee = botState.traidingMarket === 'spot' ? 0.2 : 0.08;

  (() => {
    setInterval(async () => {
      console.log('isPricesStreamAlive: ' + botState.isPricesStreamAlive);
      // calculateAvgDealPriceChange(botState, indicatorsData);
      // indicatorsData.dealType = determineDealType(indicatorsData, 4);
      console.log(
        'OBV 1D: ' +
          indicatorsData.obv1d.signal +
          ' ' +
          '(Buy Count: ' +
          indicatorsData.obv1d.buySignalCount +
          ' ' +
          'Sell Count: ' +
          indicatorsData.obv1d.sellSignalCount +
          ')',
      );
      console.log(
        'OBV 4h: ' +
          indicatorsData.obv4h.signal +
          ' ' +
          '(Buy Count: ' +
          indicatorsData.obv4h.buySignalCount +
          ' ' +
          'Sell Count: ' +
          indicatorsData.obv4h.sellSignalCount +
          ')',
      );
      console.log(
        'OBV 15m: ' +
          indicatorsData.obv15m.signal +
          ' ' +
          '(Buy Count: ' +
          indicatorsData.obv15m.buySignalCount +
          ' ' +
          'Sell Count: ' +
          indicatorsData.obv15m.sellSignalCount +
          ')',
      );
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
      console.log('Deal Type: ' + botState.dealType.toUpperCase());
      // console.log('Avg Ask Bid Diff: ' + indicatorsData.prevAvgAskBidDiff);
      // console.log('Bids ask diff: ' + indicatorsData.scalper.bidsAsksDiff);
      // console.log('Last bid: ' + indicatorsData.scalper.lastBid);
      // console.log(
      //   'Candle 5m: ' +
      //     indicatorsData.haCandle.ha5mCandle.signal +
      //     ' : ' +
      //     'Shadow: ' +
      //     indicatorsData.haCandle.ha5mCandle.shadowSignal,
      // );
      // if (indicatorsData.haCandle.ha5mCandle.signal === 'buy')
      //   console.log(
      //     ': L/O: ' +
      //       indicatorsData.haCandle.ha5mCandle.low /
      //         indicatorsData.haCandle.ha5mCandle.open +
      //       ' H/C: ' +
      //       indicatorsData.haCandle.ha5mCandle.high /
      //         indicatorsData.haCandle.ha5mCandle.close,
      //   );
      // else if (indicatorsData.haCandle.ha5mCandle.signal === 'sell')
      //   console.log(
      //     ': H/O: ' +
      //       indicatorsData.haCandle.ha5mCandle.high /
      //         indicatorsData.haCandle.ha5mCandle.open +
      //       ' L/C: ' +
      //       indicatorsData.haCandle.ha5mCandle.low /
      //         indicatorsData.haCandle.ha5mCandle.close,
      //   );
      // console.log(
      //   'Candle 1m: ' +
      //     indicatorsData.haCandle.ha1mCandle.signal +
      //     ' : ' +
      //     'Shadow: ' +
      //     indicatorsData.haCandle.ha1mCandle.shadowSignal,
      // );
      // console.log(
      //   'OBV 4h: ' +
      //     indicatorsData.obv4h.signal +
      //     ' ' +
      //     '(Buy Count: ' +
      //     indicatorsData.obv4h.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.obv4h.sellSignalCount +
      //     ')',
      // );
      // console.log(
      //   'OBV 1h: ' +
      //     indicatorsData.obv1h.signal +
      //     ' ' +
      //     '(Buy Count: ' +
      //     indicatorsData.obv1h.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.obv1h.sellSignalCount +
      //     ')',
      // );
      // console.log(
      //   'OBV 15m: ' +
      //     indicatorsData.obv15m.signal +
      //     ' ' +
      //     '(Buy Count: ' +
      //     indicatorsData.obv15m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.obv15m.sellSignalCount +
      //     ')',
      // );
      // console.log(
      //   'OBV 1h: ' +
      //     indicatorsData.obv1h.signal +
      //     ' ' +
      //     '(Buy Count: ' +
      //     indicatorsData.obv1h.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.obv1h.sellSignalCount +
      //     ') ' +
      //     'OBV Curr: ' +
      //     indicatorsData.obv1h.obv +
      //     ' ' +
      //     'Obv Prev: ' +
      //     indicatorsData.obv1h.prevObv +
      //     ' ' +
      //     'Obv Diff: ' +
      //     indicatorsData.obv1h.obvDiff +
      //     '%',
      // );
      // console.log(
      //   'OBV 15m: ' +
      //     indicatorsData.obv15m.signal +
      //     ' ' +
      //     '(Buy Count: ' +
      //     indicatorsData.obv15m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.obv15m.sellSignalCount +
      //     ') ' +
      //     'OBV Curr: ' +
      //     indicatorsData.obv15m.obv +
      //     ' ' +
      //     'Obv Prev: ' +
      //     indicatorsData.obv15m.prevObv +
      //     ' ' +
      //     'Obv Diff: ' +
      //     indicatorsData.obv15m.obvDiff +
      //     '%',
      // );
      // console.log(
      //   'OBV 5m: ' +
      //     indicatorsData.obv5m.signal +
      //     ' ' +
      //     '(Buy Count: ' +
      //     indicatorsData.obv5m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.obv5m.sellSignalCount +
      //     ') ' +
      //     'OBV Curr: ' +
      //     indicatorsData.obv5m.obv +
      //     ' ' +
      //     'Obv Prev: ' +
      //     indicatorsData.obv5m.prevObv +
      //     ' ' +
      //     'Obv Diff: ' +
      //     indicatorsData.obv5m.obvDiff +
      //     '%',
      // );
      // console.log(
      //   'OBV 1m: ' +
      //     indicatorsData.obv1m.signal +
      //     ' ' +
      //     '(Buy Count: ' +
      //     indicatorsData.obv1m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.obv1m.sellSignalCount +
      //     ') ' +
      //     'OBV Curr: ' +
      //     indicatorsData.obv1m.obv +
      //     ' ' +
      //     'Obv Prev: ' +
      //     indicatorsData.obv1m.prevObv +
      //     ' ' +
      //     'Obv Diff: ' +
      //     indicatorsData.obv1m.obvDiff +
      //     '%',
      // );
      // // console.log(
      //   'ROC 1m: ' +
      //     indicatorsData.roc.roc5m.prevValue +
      //     ' ' +
      //     indicatorsData.roc.roc5m.diff +
      //     ' ' +
      //     indicatorsData.roc.roc5m.signal +
      //     ' (Buy Count: ' +
      //     indicatorsData.roc.roc5m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.roc.roc5m.sellSignalCount +
      //     ')',
      // );

      // console.log(
      //   'ADX 15m: ' +
      //     '(UP: ' +
      //     indicatorsData.dmi15m.adxUpCount +
      //     ' ' +
      //     'DOWN: ' +
      //     indicatorsData.dmi15m.adxDownCount +
      //     ')',
      // );

      // console.log(
      //   'ADX 5m: ' +
      //     '(UP: ' +
      //     indicatorsData.dmi5m.adxUpCount +
      //     '(' +
      //     botState.dmi5m.adxUpCount +
      //     ') ' +
      //     'DOWN: ' +
      //     indicatorsData.dmi5m.adxDownCount +
      //     '(' +
      //     botState.dmi5m.adxDownCount +
      //     ')' +
      //     ') ' +
      //     'BUY: ' +
      //     botState.dmi5m.adx +
      //     ' ' +
      //     'Current: ' +
      //     indicatorsData.dmi5m.adx,
      // );
      // console.log(
      //   'ADX 1m: ' +
      //     '(UP: ' +
      //     indicatorsData.dmi1m.adxUpCount +
      //     '(' +
      //     botState.dmi1m.adxUpCount +
      //     ') ' +
      //     'DOWN: ' +
      //     indicatorsData.dmi1m.adxDownCount +
      //     '(' +
      //     botState.dmi1m.adxDownCount +
      //     ') ' +
      //     'BUY: ' +
      //     botState.dmi1m.adx +
      //     ' ' +
      //     'Current: ' +
      //     indicatorsData.dmi1m.adx,
      // );

      if (botState.status === 'sell') {
        console.log(
          'Avg Deal Price: ' +
            botState.avgDealPrice +
            '( ' +
            indicatorsData.avgDealPriceDiff +
            ' %' +
            ' )',
        );
        console.log(
          'Avg Deal Price Diff: ' +
            indicatorsData.avgDealPriceSignal +
            '(UP: ' +
            indicatorsData.avgDealPriceUpSignalCount +
            ' DOWN: ' +
            indicatorsData.avgDealPriceDownSignalCount +
            ')',
        );
        console.log(
          'Avg Price: ' +
            botState.avgPrice +
            '( ' +
            indicatorsData.avgPriceDiff +
            ' %' +
            ' )',
        );
        console.log(
          'Avg Price Diff: ' +
            indicatorsData.avgPriceSignal +
            '(UP: ' +
            indicatorsData.avgPriceUpSignalCount +
            ' DOWN: ' +
            indicatorsData.avgPriceDownSignalCount +
            ')',
        );
        // console.log(
        //   'Avg Price / Avg Deal Price: ' +
        //     Number((botState.avgPrice / botState.avgDealPrice) * 100 - 100) +
        //     '%',
        // );
        // console.log('Max Price / Avg Price Diff: ' + indicatorsData.avgPriceDiff);
        console.log(
          botState.dealType === 'long'
            ? 'MAX av profit: ' +
                Number(botState.maxAvailableLongProfit - fee) +
                ' % : ' +
                (botState.traidingMarket === 'futures' && botState.order
                  ? (Number(botState.maxAvailableLongProfit - fee) *
                      Math.abs(Number(botState.order.initialMargin))) /
                      100 +
                    'USDT'
                  : ''
                ).toString()
            : 'MAX av profit: ' +
                Number(botState.maxAvailableShortProfit + fee) +
                ' % : ' +
                (botState.traidingMarket === 'futures' && botState.order
                  ? (Number(botState.maxAvailableShortProfit + fee) *
                      Math.abs(Number(botState.order.initialMargin))) /
                      100 +
                    'USDT'
                  : ''
                ).toString(),
        );
        console.log(
          botState.dealType === 'long'
            ? 'MIN av profit: ' +
                Number(botState.minAvailableLongProfit - fee) +
                ' % : ' +
                (botState.traidingMarket === 'futures' && botState.order
                  ? (Number(botState.minAvailableLongProfit - fee) *
                      Math.abs(Number(botState.order.initialMargin))) /
                      100 +
                    'USDT'
                  : ''
                ).toString()
            : 'MIN av profit: ' +
                Number(botState.minAvailableShortProfit + fee) +
                ' % : ' +
                (botState.traidingMarket === 'futures' && botState.order
                  ? (Number(botState.minAvailableShortProfit + fee) *
                      Math.abs(Number(botState.order.initialMargin))) /
                      100 +
                    'USDT'
                  : ''
                ).toString(),
        );
        console.log(
          'Profit diff (Max/Current): ' +
            Number(botState.maxAvailableProfit) /
              Number(botState.currentProfit) +
            ' %',
        );
      }
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
                  ? Number(botState.currentProfit - fee) +
                    ' % : ' +
                    (botState.traidingMarket === 'futures' && botState.order
                      ? (Number(botState.currentProfit - fee) *
                          Math.abs(Number(botState.order.initialMargin))) /
                          100 +
                        ' USDT'
                      : ''
                    ).toString()
                  : Number(botState.currentProfit + fee) +
                    ' % : ' +
                    (botState.traidingMarket === 'futures'
                      ? (Number(botState.currentProfit + fee) *
                          Math.abs(Number(botState.order.initialMargin))) /
                          100 +
                        ' USDT'
                      : ''
                    ).toString()
                : '-'),
          )
        : botState.strategies.scalper.stopLoss
        ? console.log('STATUS: SELL (TAKE PROFIT)')
        : console.log('STATUS: BUY');
      // if (botState.currentPrice)
      //   console.log(
      //     'Asset: ' +
      //       binance.roundStep(
      //         futuresDealUSDTAmount / botState.currentPrice,
      //         stepFuturesSize,
      //       ),
      //   );
      console.log('\n');
      // console.log('OBV 1m: ' + indicatorsData.obv1m.obvDiff);
      botState.updateState('isPricesStreamAlive', false);
      indicatorsData.isPricesStreamAliveNegativeSignalConfirmationCount++;
      if (
        indicatorsData.isPricesStreamAliveNegativeSignalConfirmationCount >= 100
      )
        await sendToRecipients(`WARNING (LOCAL) !!! TRENDS CATCHER
        Prices stream is DEAD!!! Be ready to restart the bot!
  `);
    }, 500);
  })();
  // binance.websockets.depthCache(
  //   ['LINKUSDT'],
  //   _throttle((symbol, depth) => {
  //     const bids = binance.sortBids(depth.bids);
  //     const asks = binance.sortAsks(depth.asks);
  //     const shortBids = binance.array(bids).slice(0, 10);
  //     const shortAsks = binance.array(asks).slice(0, 30);
  //     const bestAsk = binance.first(asks);
  //     const bestBid = binance.first(bids);
  //     const highPriceLevel = binance.array(asks).slice(0, 30)[29][0];
  //     const maxBidSize = _maxBy(shortBids, arrItem => arrItem[1]);
  //     indicatorsData.scalper.maxBidSize = maxBidSize[1];
  //     const maxAskSize = _maxBy(shortAsks, arrItem => arrItem[1]);
  //     indicatorsData.scalper.maxAskSize = maxAskSize[1];
  //     const lastBid = shortBids[9][0];
  //     const lastAsk = shortAsks[29][0];
  //     const bidsSum = getSum(shortBids.map(arr => arr[1]));
  //     const asksSum = getSum(shortAsks.map(arr => arr[1]));
  //
  //     console.log('Max BID: ' + maxBidSize);
  //     console.log('Max ASK: ' + maxAskSize);
  //
  //     // const bidsSum = getSum(shortBids.map(arr => arr[1]));
  //     // const asksSum = getSum(shortAsks.map(arr => arr[1]));
  //     // console.log((bidsSum / asksSum) * 100 - 100);
  //
  //     // console.log('bids', shortBids);
  //     // console.log('asks', shortAsks);
  //     // console.info('best bid: ' + binance.first(bids));
  //     // console.info('best ask: ' + binance.first(asks));
  //     // console.info('last bid: ' + shortBids[4][0]);
  //     // console.info('last ask: ' + shortAsks[99][0]);
  //
  //     indicatorsData.scalper.bidsAsksDiff = (bidsSum / asksSum) * 100 - 100;
  //     console.log(
  //       'Ask size / Bid size: (LONG) ' +
  //         Number((asksSum / bidsSum) * 100 - 100).toString() +
  //         '%',
  //     );
  //     console.log(
  //       'Ask size / Bid size: (SHORT) ' +
  //         Number(
  //           (getSum(
  //             binance
  //               .array(asks)
  //               .slice(0, 5)
  //               .map(arr => arr[1]),
  //           ) /
  //             getSum(
  //               binance
  //                 .array(bids)
  //                 .slice(0, 5)
  //                 .map(arr => arr[1]),
  //             )) *
  //             100 -
  //             100,
  //         ).toString() +
  //         '%',
  //     );
  //     console.log(
  //       'Best Ask / Best Bid: ' +
  //         Number((bestAsk / bestBid) * 100 - 100).toString() +
  //         '%',
  //     );
  //
  //     console.log(
  //       'Last Ask/ Last Bid: ' +
  //         Number((lastAsk / lastBid) * 100 - 100).toString(),
  //     );
  //     console.log('High price: ' + highPriceLevel);
  //     console.log('');
  //     //
  //     // if (
  //     //   indicatorsData.rsi5m.rsiValue !== null &&
  //     //   indicatorsData.rsi5m.rsiValue > indicatorsData.rsi5m.prevRsi
  //     // )
  //     //   indicatorsData.rsi5m.rsiSignal = 'buy';
  //     // else if (
  //     //   indicatorsData.rsi5m.rsiValue !== null &&
  //     //   indicatorsData.rsi5m.rsiValue < indicatorsData.rsi5m.prevRsi
  //     // )
  //     //   indicatorsData.rsi5m.rsiSignal = 'sell';
  //     // if (Number((lastAsk / lastBid) * 100 - 100) >= 0.6)
  //     //   indicatorsData.scalper.askBidSignal = 'buy';
  //     // else if (Number((lastAsk / lastBid) * 100 - 100) <= 0.3)
  //     //   indicatorsData.scalper.askBidSignal = 'sell';
  //
  //     // console.log('Stoch 15m: ' + indicatorsData.stochRsi.stoch15m.signal);
  //     // console.log('Stoch 5m: ' + indicatorsData.stochRsi.stoch5m.signal);
  //     // console.log(
  //     //   'ADX 1h: ' +
  //     //     indicatorsData.dmi1h.adxDiff +
  //     //     ' ' +
  //     //     indicatorsData.dmi1h.adxDirection +
  //     //     ' ' +
  //     //     (indicatorsData.dmi1h.adxUpCount
  //     //       ? indicatorsData.dmi1h.adxUpCount
  //     //       : indicatorsData.dmi1h.adxDownCount),
  //     // );
  //     // console.log('RSI 1h: ' + indicatorsData.rsi1h.rsiValue);
  //     // console.log(
  //     //   'ADX 5m: ' +
  //     //     indicatorsData.dmi5m.adxDiff +
  //     //     ' ' +
  //     //     indicatorsData.dmi5m.adxDirection +
  //     //     ' ' +
  //     //     (indicatorsData.dmi5m.adxUpCount
  //     //       ? indicatorsData.dmi5m.adxUpCount
  //     //       : indicatorsData.dmi5m.adxDownCount),
  //     // );
  //     // console.log('RSI 5m: ' + indicatorsData.rsi5m.rsiValue);
  //     // console.log(
  //     //   'ADX 1m: ' +
  //     //     indicatorsData.dmi1m.adxDiff +
  //     //     ' ' +
  //     //     indicatorsData.dmi1m.adxDirection +
  //     //     ' ' +
  //     //     (indicatorsData.dmi1m.adxUpCount
  //     //       ? indicatorsData.dmi1m.adxUpCount
  //     //       : indicatorsData.dmi1m.adxDownCount),
  //     // );
  //     // console.log('RSI 1m: ' + indicatorsData.rsi1m.rsiValue);
  //     // // console.log(
  //     // //   'Stoch 1m: ' +
  //     // //     indicatorsData.stochRsi.stoch1m.data.k +
  //     // //     ' : ' +
  //     // //     indicatorsData.stochRsi.stoch1m.data.d,
  //     // // );
  //     // if (
  //     //   // (shortBids[1][1] / shortAsks[1][1]) * 100 - 100 >= 50 &&
  //     //   // Number((shortBids[9][1] / shortAsks[9][1]) * 100 - 100) >= 50
  //     //   // indicatorsData.scalper.maxBidSize > indicatorsData.scalper.maxAskSize &&
  //     //   (bidsSum / asksSum) * 100 - 100 >=
  //     //   300
  //     //
  //     //   // (highPriceLevel / binance.first(asks)[0]) * 100 - 100 >= 0.3
  //     //   // (lastAsk / lastBid) * 100 - 100 >= 0.3
  //     //
  //     //   // Number((lastBid / lastAsk) * 100 - 100) > -0.08
  //     // ) {
  //     //   indicatorsData.scalper.buySignalCount++;
  //     //   indicatorsData.scalper.sellSignalCount = 0;
  //     //   // if (indicatorsData.scalper.buySignalCount >= 2)
  //     //   //   indicatorsData.scalper.signal = 'buy';
  //     // } else if (
  //     //   // (highPriceLevel / binance.first(asks)[0]) * 100 - 100 < 0.3 &&
  //     //   (asksSum / bidsSum) * 100 - 100 >=
  //     //   40
  //     //   // (shortAsks[1][1] / shortBids[1][1]) * 100 - 100 >= 50 &&
  //     //   // Number((shortAsks[9][1] / shortBids[9][1]) * 100 - 100) >= 50
  //     // ) {
  //     //   // indicatorsData.scalper.maxBidSize < indicatorsData.scalper.maxAskSize &&
  //     //   // Number((lastBid / lastAsk) * 100 - 100) < -0.08
  //     //   indicatorsData.scalper.sellSignalCount++;
  //     //   indicatorsData.scalper.buySignalCount = 0;
  //     //   // if (indicatorsData.scalper.sellSignalCount >= 2)
  //     //   //   indicatorsData.scalper.signal = 'sell';
  //     // }
  //     indicatorsData.scalper.lastBid = lastBid;
  //     indicatorsData.scalper.prevAsk = lastAsk;
  //     // if (indicatorsData.askBidDiffArr.length < 20) {
  //     //   indicatorsData.askBidDiffArr.push(
  //     //     (indicatorsData.askBidDiff = Number((lastAsk / lastBid) * 100 - 100)),
  //     //   );
  //     // } else {
  //     //   const avg = getAvarage(indicatorsData.askBidDiffArr);
  //     //   indicatorsData.askBidDiffArr.length = 0;
  //     //   indicatorsData.askBidDiffArr.push(
  //     //     (indicatorsData.askBidDiff = Number((lastAsk / lastBid) * 100 - 100)),
  //     //   );
  //     // if (indicatorsData.prevAvgAskBidDiff) {
  //     //   indicatorsData.avgAskBidDiff =
  //     //     (avg / indicatorsData.prevAvgAskBidDiff) * 100 - 100;
  //     //   indicatorsData.askBidDiffArr.push(
  //     //     (indicatorsData.askBidDiff = Number((lastAsk / lastBid) * 100 - 100)),
  //     //   );
  //     // } else {
  //     //   indicatorsData.prevAvgAskBidDiff = avg;
  //     //   return;
  //     // }
  //     // indicatorsData.prevAvgAskBidDiff = avg;
  //     // }
  //   }, 500),
  // );
})();

process.on('unhandledRejection', async (reason: Error) => {
  console.error(reason);
  await sendToRecipients(`ERROR
    ${JSON.stringify(reason)};
    ${reason};
  `);

  process.exit(1);
});
