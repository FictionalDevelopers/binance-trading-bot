import { format } from 'date-fns';
import _head from 'lodash/head';
import { bufferCount, pluck } from 'rxjs/operators';
import { getEmaStream } from './indicators/ema';
import { getBalances, getFuturesBalances } from './api/balance';
import { getCandleStreamForInterval } from './api/candles';
import { getExchangeInfo } from './api/exchangeInfo';
import {
  cancelAllOpenOrders,
  checkAllOpenOrders,
  getOrdersList,
  marketBuyAction,
  marketFuturesBuyAction,
  marketFuturesSellAction,
  marketSellAction,
} from './api/order';
import { getTradeStream } from './api/trades.js';
import { service as botStateService } from './components/botState';
import { getObvSignal } from './components/obv-signals';
import { RESOURCES } from './constants';
import { DATE_FORMAT } from './constants/date';
import { connect } from './db/connection';
import { sendToRecipients } from './services/telegram';
import getAvarage from './utils/getAverage';
import { getCRSIStream } from './indicators/crsi';
import { getDMISignal } from './components/dmi-signals';
import { getCCIStream } from './indicators/cci';
import { getATRSignal } from './components/atr-signals';
import { getObvStream } from './indicators/obv';
import { getMACDSignal } from './components/macd-signals';
import { getMACDStream } from './indicators/macd';
import { calculateAvgPriceChange } from './tools/avgPriceTools';
import { getCCISignal } from './components/cci-signals';
import { getTrixSignal } from './components/trix-signal';
import {
  getHeikinAshiSignal,
  getHeikinAshiSignalForTheLastCandles,
} from './indicators/heikinAshi';
import { getForceIndexSignal } from './components/forceIndex';
import { getRocSignal } from './components/roc-signals';
import { getRSISignal } from './components/rsi-signals';
import { getVolumeProfileStream } from './indicators/volumeProfile';
import { getMfiStream } from './indicators/mfi';
import { getMfiSignal } from './components/mfi-signals';
import { getStochRSISignal } from './components/stochRSI-signals';

(async function() {
  await connect();
  // await processSubscriptions();
  const revisionNumber = 'ffa2bef39307f7d13bf20d5b92ebaafe4115b081';
  const startTime = format(new Date(), DATE_FORMAT);
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
  const futuresDealUSDTAmount = 500;
  // const symbol = process.argv[2];

  const initialLocalBotState = {
    traidingMarket: 'spot',
    initialDealType: 'undetermined',
    dealType: 'undetermined',
    maxAvailableLongProfit: 0,
    minAvailableLongProfit: 0,
    maxAvailableShortProfit: 0,
    minAvailableShortProfit: 0,
    totalMinAvailableLongProfit: 0,
    totalMinAvailableShortProfit: 0,
    totalMaxAvailableLongProfit: 0,
    totalMaxAvailableShortProfit: 0,
    dealPricesArr: [],
    avgDealPrice: null,
    prevAvgDealPrice: null,
    avgPrice: null,
    prevAvgPrice: null,
    profitDiff: 0,
    isPricesStreamAlive: false,
    avrDealProfit: null,
    buyPrice: 0,
    buyReason: 'upTrend',
    cummulativeQuoteQty: null,
    currentPrice: 0,
    currentProfit: null,
    dealsCount: 1,
    emaStartPoint: null,
    enabledLimits: false,
    order: null,
    prevPrice: 0,
    sellError: false,
    status: 'buy',
    strategies: {
      scalper: { enabled: true, stopLoss: false },
      upTrend: { enabled: false, stopLoss: false },
      downTrend: { enabled: false, stopLoss: false },
      upFlat: { enabled: false, stopLoss: false },
      downFlat: { enabled: false, stopLoss: false },
      stochRsi: { enabled: false, stopLoss: false },
      trendsCatcher: { enabled: false, stopLoss: false },
    },
    testMode: true,
    totalProfit: 0,
    totalPercentProfit: null,
    totalLongProfit: 0,
    totalShortProfit: 0,
    tradeAmountPercent: 0.95,
    dmi5m: {
      adx: null,
      adxUpCount: 0,
      adxDownCount: 0,
    },
    dmi1m: {
      adx: null,
      adxUpCount: 0,
      adxDownCount: 0,
    },
  };

  let botState;
  //
  try {
    const response = await botStateService.getBotState();
    const initialState = JSON.parse(JSON.stringify(_head(response)));

    botState = {
      ...initialState,
      availableUSDT: initialUSDTBalance,
      availableCryptoCoin: initialCryptoCoinBalance,
      availableFuturesUSDT: initialFuturesUSDTBalance,
      // availableFuturesCryptocoin: initialFuturesCryptocoinBalance,
      local: false,
      // status: 'buy',
      testMode: true,
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
    atr: {
      atr1m: {
        prevAtr: null,
        atr: null,
        buySignalCount: 0,
        sellSignalCount: 0,
      },
      atr5m: {
        prevAtr: null,
        atr: null,
        buySignalCount: 0,
        sellSignalCount: 0,
      },
    },
    candle: {
      candle1m: null,
    },
    mfi: {
      mfi1m: {
        mfi: null,
        prevMfi: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
      mfi12m: {
        mfi: null,
        prevMfi: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
      mfi13m: {
        mfi: null,
        prevMfi: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
      mfi14m: {
        mfi: null,
        prevMfi: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
      mfi5m: {
        mfi: null,
        prevMfi: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
      mfi52m: {
        mfi: null,
        prevMfi: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
      mfi53m: {
        mfi: null,
        prevMfi: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
      mfi54m: {
        mfi: null,
        prevMfi: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
      mfi15m: {
        mfi: null,
        prevMfi: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
      mfi30m: {
        mfi: null,
        prevMfi: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
    },
    crsi: {
      crsi15m: {
        crsi: null,
        values: [],
      },
      crsi5m: {
        crsi: null,
        values: [],
      },
      crsi1m: {
        crsi: null,
        values: [],
      },
    },
    cci: {
      cci1h: {
        prev: null,
        av: null,
        cci: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        upSignalCount: 0,
        downSignalCount: 0,
      },
      cci30m: {
        prev: null,
        av: null,
        cci: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        upSignalCount: 0,
        downSignalCount: 0,
      },
      cci15m: {
        prev: null,
        av: null,
        cci: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        upSignalCount: 0,
        downSignalCount: 0,
      },
      cci5m: {
        prev: null,
        av: null,
        cci: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        upSignalCount: 0,
        downSignalCount: 0,
      },
      cci1m: {
        prev: null,
        av: null,
        cci: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        upSignalCount: 0,
        downSignalCount: 0,
      },
    },
    macd: {
      macd5m: {
        histogram: null,
        prevHistogram: null,
        buySignalCount: 0,
        sellSignalCount: 0,
      },
    },
    obvAv5m: {
      prevObvAv: null,
      buySignalCount: 0,
      sellSignalCount: 0,
      signal: null,
    },
    obvAv1m: {
      prevObvAv: null,
      buySignalCount: 0,
      sellSignalCount: 0,
      signal: null,
    },
    ema: {
      ema30m: {
        fast: {
          emaAvSignal: null,
          emaAv: null,
          emaSignal: null,
          emaUpCount: 0,
          emaDownCount: 0,
        },
        middle: {
          emaAvSignal: null,
          emaAv: null,
          emaSignal: null,
          emaUpCount: 0,
          emaDownCount: 0,
        },
        slow: {
          emaAvSignal: null,
          emaAv: null,
          emaSignal: null,
          emaUpCount: 0,
          emaDownCount: 0,
        },
      },
      ema15m: {
        fast: {
          emaAvSignal: null,
          emaAv: null,
          emaSignal: null,
          emaUpCount: 0,
          emaDownCount: 0,
        },
        middle: {
          emaAvSignal: null,
          emaAv: null,
          emaSignal: null,
          emaUpCount: 0,
          emaDownCount: 0,
        },
        slow: {
          emaAvSignal: null,
          emaAv: null,
          emaSignal: null,
          emaUpCount: 0,
          emaDownCount: 0,
        },
      },
      ema5m: {
        fast: {
          emaAvSignal: null,
          emaAv: null,
          emaSignal: null,
          emaUpCount: 0,
          emaDownCount: 0,
        },
        middle: {
          emaAvSignal: null,
          emaAv: null,
          emaSignal: null,
          emaUpCount: 0,
          emaDownCount: 0,
        },
        slow: {
          emaAvSignal: null,
          emaAv: null,
          emaSignal: null,
          emaUpCount: 0,
          emaDownCount: 0,
        },
      },
      ema1m: {
        fast: {
          emaAvSignal: null,
          emaAv: null,
          emaSignal: null,
          emaUpCount: 0,
          emaDownCount: 0,
          ema: null,
          prevEMA: null,
        },
        middle: {
          emaAvSignal: null,
          emaAv: null,
          emaSignal: null,
          emaUpCount: 0,
          emaDownCount: 0,
          ema: null,
          prevEMA: null,
        },
        slow: {
          emaAvSignal: null,
          emaAv: null,
          emaSignal: null,
          emaUpCount: 0,
          emaDownCount: 0,
          ema: null,
          prevEMA: null,
        },
      },
    },
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
    prevAvgPrice: null,
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
        prevCandle: {
          signal: null,
        },
        currentCandle: {},
      },
    },
    maxAvailableProfit: 0,
    totalMaxAvailableProfit: 0,
    isPricesStreamAliveNegativeSignalConfirmationCount: 0,
    scalper: {
      sellVolume: null,
      buyVolume: null,
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
      roc1h: {
        value: null,
        prevValue: null,
        diff: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
      roc30m: {
        value: null,
        prevValue: null,
        diff: null,
        buySignalCount: 0,
        sellSignalCount: 0,
        signal: null,
      },
      roc15m: {
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
    efi1d: {
      efiBuySignalCount: 0,
      efiSellSignalCount: 0,
      prevEfi: null,
      efi: null,
      efiSignal: null,
      av: null,
      prevAv: null,
    },
    efi30m: {
      efiBuySignalCount: 0,
      efiSellSignalCount: 0,
      prevEfi: null,
      efi: null,
      efiSignal: null,
      av: null,
      prevAv: null,
    },
    efi15m: {
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
    obv1w: {
      signal: null,
      buySignalCount: 0,
      sellSignalCount: 0,
      obv: null,
      prevObv: null,
      obvDiff: null,
    },
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
    obv2h: {
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
      prevTimerObv: null,
    },
    obv30m: {
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
      prevTimerObv: null,
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
    emaUpCount: 0,
    emaDownCount: 0,
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
      adx: null,
      prevAdx: null,
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
    dmi30m: {
      adx: null,
      prevAdx: null,
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
      adx: null,
      prevAdx: null,
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
    dmi4h: {
      adx: null,
      prevAdx: null,
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
      prevAdx: null,
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
                indicatorsData.rsi5m.signal === 'buy' &&
                indicatorsData.obv15m.buySignalCount >= 2 &&
                indicatorsData.obv5m.buySignalCount >= 2 &&
                indicatorsData.dmi15m.adxBuySignalVolume >= 2 &&
                indicatorsData.dmi5m.adxBuySignalVolume >= 2 &&
                indicatorsData.dmi1m.adxBuySignalVolume >= 2,
          // indicatorsData.obv1m.buySignalCount >= 5 &&
          // indicatorsData.avgPrices.avgBig.avgPriceUpSignalCount >= 4 &&
          // indicatorsData.avgPrices.avgSmall.avgPriceUpSignalCount >= 4,
          // indicatorsData.dmi15m.adxSellSignalVolume >= 10) &&
          // indicatorsData.dmi5m.adxSellSignalVolume >= 10) &&
          // indicatorsData.dmi1m.adxSellSignalVolume >= 10),

          // indicatorsData.dmi1m.adxBuySignalVolume >= 10,
          // indicatorsData.dmi15m.adxSellSignalVolume >= 10),
          // indicatorsData.haCandle.ha1mCandle.prevCandle.signal ===
          //   'buy' &&
          // indicatorsData.haCandle.ha1mCandle.signal === 'buy',
          // indicatorsData.haCandle.ha1mCandle.signal === 'buy' &&
          // indicatorsData.obv4h.buySignalCount >= 4 &&
          // indicatorsData.obv1h.buySignalCount >= 4 &&
          // indicatorsData.obv30m.buySignalCount >= 4 &&
          // indicatorsData.obv15m.buySignalCount >= 4 &&
          // indicatorsData.obv5m.buySignalCount >= 4 &&
          // indicatorsData.dmi1h.willPriceGrow,
          // indicatorsData.dmi4h.willPriceGrow &&
          // indicatorsData.obv5m.buySignalCount >= 20 &&
          // (indicatorsData.dmi1h.adxBuySignalVolume >= 2 ||
          //   indicatorsData.dmi1h.adxSellSignalVolume >= 2),

          // ((indicatorsData.dmi1h.trend === 'UP' &&
          //   indicatorsData.dmi1h.adxBuySignalVolume >= 2) ||
          //   (indicatorsData.dmi1h.trend === 'DOWN' &&
          //     indicatorsData.dmi1h.adxSellSignalVolume >= 2)),

          // indicatorsData.obv1h.buySignalCount >= 20 &&
          // indicatorsData.obv5m.buySignalCount >= 20 &&
          // indicatorsData.dmi5m.adxBuySignalVolume >= 8,
          // indicatorsData.obv1m.buySignalCount >= 4,
          // indicatorsData.dmi5m.adxBuySignalVolume >= 8,
          // indicatorsData.dmi15m.adxBuySignalVolume >= 8 &&
          // indicatorsData.dmi5m.adxBuySignalVolume >= 6,
          // (indicatorsData.dmi5m.adxBuySignalVolume >= 2 ||
          //   indicatorsData.dmi5m.adxSellSignalVolume >= 1),
          // indicatorsData.stochRsi.stoch15m.buySignalCount >= 6,
          // indicatorsData.cci.cci1h.buySignalCount >= 3 &&
          // indicatorsData.cci.cci30m.buySignalCount >= 3 &&
          // indicatorsData.cci.cci15m.buySignalCount >= 3 &&
          // indicatorsData.obv15m.buySignalCount >= 8 &&
          // (indicatorsData.dmi5m.adxBuySignalVolume >= 2 ||
          // (indicatorsData.dmi15m.adxSellSignalVolume >= 1 ||
          //   indicatorsData.dmi15m.adxBuySignalVolume >= 2) &&
          // indicatorsData.obv15m.buySignalCount >= 20 &&
          // indicatorsData.rsi15m.rsiValue < 30 &&
          // indicatorsData.rsi1m.rsiValue > 70,
          // indicatorsData.mfi.mfi12m.buySignalCount >= 4,
          // indicatorsData.dmi5m.adx > 90,
          // (indicatorsData.dmi1m.adxBuySignalVolume >= 4 ||
          //   indicatorsData.dmi1m.adxSellSignalVolume >= 4) &&
          // indicatorsData.rsi15m.rsiValue > 70 &&
          // indicatorsData.obv15m.buySignalCount >= 20,
          // indicatorsData.mfi.mfi15m.buySignalCount >= 4 &&
          // indicatorsData.mfi.mfi5m.buySignalCount >= 4 &&
          // indicatorsData.mfi.mfi15m.prevMfi >= 60 &&
          // indicatorsData.dmi15m.adxBuySignalVolume >= 2,
          // indicatorsData.roc.roc15m.prevValue > 0,
          // indicatorsData.roc.roc5m.prevValue > 0,
          // indicatorsData.mfi.mfi13m.buySignalCount >= 4 &&
          // indicatorsData.mfi.mfi14m.buySignalCount >= 4,
          // indicatorsData.obv1m.buySignalCount >= 2,
          // indicatorsData.mfi.mfi52m.buySignalCount >= 6 &&
          // indicatorsData.mfi.mfi1m.buySignalCount >= 4 &&
          // indicatorsData.mfi.mfi12m.buySignalCount >= 4 &&
          // indicatorsData.atr.atr1m.buySignalCount >= 2,
          // indicatorsData.dmi1m.adxUpCount >= 2,
          // indicatorsData.mfi.mfi13m.buySignalCount >= 10,

          // indicatorsData.mfi.mfi12m.buySignalCount >= 6,
          // indicatorsData.roc.roc1m.prevValue > 0 &&
          // indicatorsData.roc.roc5m.prevValue > 0 &&
          // indicatorsData.dmi5m.adxUpCount >= 1 &&
          // indicatorsData.dmi1m.adxUpCount >= 5 &&
          // ||
          // indicatorsData.dmi5m.adxDownCount >= 3
          // indicatorsData.haCandle.ha1mCandle.buySignalCount >= 3 &&
          // indicatorsData.ema.ema1m.slow.emaUpCount >= 4 &&
          // indicatorsData.obv30m.buySignalCount >= 20 &&
          // indicatorsData.cci.cci1m.cci > 0 &&
          // indicatorsData.obv15m.buySignalCount >= 20 &&
          // indicatorsData.rsi1m.rsiValue > 60 &&
          // indicatorsData.rsi5m.rsiValue > 60 &&
          // indicatorsData.efi1m.prevEfi > 0 &&
          // indicatorsData.obv15m.buySignalCount >= 10 &&
          // indicatorsData.dmi5m.adxUpCount >= 2,
          // indicatorsData.cci.cci5m.cci > 0 &&
          // indicatorsData.crsi.crsi15m.crsi > 70 &&
          // indicatorsData.crsi.crsi5m.crsi > 70,
          // indicatorsData.haCandle.ha5mCandle.buySignalCount >= 3 &&
          // indicatorsData.obv1m.buySignalCount >= 6 &&
          //   indicatorsData.dmi1m.adxUpCount >= 3),
          // indicatorsData.ema.ema1m.slow.emaUpCount >= 2 &&
          // indicatorsData.obv1m.buySignalCount >= 6 &&
          // indicatorsData.dmi1m.adxDownCount >= 3),
          // indicatorsData.avgPrices.avgSmall.avgPriceUpSignalCount >= 1 &&
          // indicatorsData.macd.macd5m.buySignalCount >= 2 &&
          // indicatorsData.obv1h.buySignalCount >= 30 &&
          // indicatorsData.obv15m.buySignalCount >= 20 &&
          // indicatorsData.cci.cci1m.buySignalCount >= 3,
          // indicatorsData.dmi15m.buySignalCount >= 3 &&
          // indicatorsData.obv1m.buySignalCount >= 4 &&
          // indicatorsData.macd.macd5m.buySignalCount >= 2,
          // indicatorsData.ema.ema1m.middle.emaUpCount >= 1,
          // indicatorsData.obv5m.buySignalCount >= 10 &&
          // indicatorsData.obvAv5m.buySignalCount >= 2 &&
          // indicatorsData.obv1m.buySignalCount >= 10,
          // indicatorsData.obvAv1m.buySignalCount >= 2,
          // indicatorsData.obv1m.buySignalCount >= 6 &&
          // indicatorsData.ema.ema1m.slow.emaSignal === 'buy',
          // indicatorsData.ema.ema1m.fast.emaSignal === 'buy',
          // indicatorsData.obv1h.buySignalCount >= 30,
          // indicatorsData.avgPrices.avgSmall.avgPriceSignal === 'buy' &&
          // (indicatorsData.dmi1m.adxUpCount >= 4 ||
          //   indicatorsData.dmi1m.adxDownCount >= 4),
          // indicatorsData.dmi1m.adx > 20,
          // indicatorsData.obv1m.buySignalCount >= 2,
          // indicatorsData.rsi15m.rsiValue > 50,
          // indicatorsData.rsi5m.rsiValue > 50 &&
          // indicatorsData.rsi1m.rsiValue > 50,
          // indicatorsData.avgPrices.avgBig.avgPriceUpSignalCount >= 2,
          // indicatorsData.avgPrices.avgSmall.avgPriceUpSignalCount >= 4,
          // indicatorsData.haCandle.ha1hCandle.signal === 'buy' &&
          // indicatorsData.haCandle.ha4hCandle.signal === 'buy' &&
          // indicatorsData.obv1d.buySignalCount >= 30 &&
          // indicatorsData.haCandle.ha1hCandle.signal === 'buy',
          short:
            botState.initialDealType === 'long'
              ? null
              : botState.status === 'buy' &&
                indicatorsData.rsi5m.signal === 'sell' &&
                indicatorsData.obv15m.sellSignalCount >= 2 &&
                indicatorsData.obv5m.sellSignalCount >= 2 &&
                indicatorsData.dmi15m.adxBuySignalVolume >= 2 &&
                indicatorsData.dmi5m.adxBuySignalVolume >= 2 &&
                indicatorsData.dmi1m.adxBuySignalVolume >= 2,
          // indicatorsData.obv1m.sellSignalCount >= 5 &&
          // indicatorsData.avgPrices.avgBig.avgPriceDownSignalCount >= 4 &&
          // indicatorsData.avgPrices.avgSmall.avgPriceDownSignalCount >= 4,
          // &&
          // indicatorsData.dmi15m.adxSellSignalVolume >= 10) &&
          // indicatorsData.dmi5m.adxSellSignalVolume >= 10) &&
          // indicatorsData.dmi1m.adxSellSignalVolume >= 10),

          // indicatorsData.dmi1m.adxBuySignalVolume >= 10,
          // indicatorsData.dmi15m.adxSellSignalVolume >= 10),
          // indicatorsData.haCandle.ha1mCandle.prevCandle.signal ===
          //   'sell' &&
          // indicatorsData.haCandle.ha1mCandle.signal === 'sell',
          // indicatorsData.haCandle.ha1mCandle.signal === 'sell' &&
          // indicatorsData.obv4h.sellSignalCount >= 4 &&
          // indicatorsData.obv1h.sellSignalCount >= 4 &&
          // indicatorsData.obv30m.sellSignalCount >= 4 &&
          // indicatorsData.obv15m.sellSignalCount >= 4 &&
          // indicatorsData.obv5m.sellSignalCount >= 4 &&
          // indicatorsData.dmi1h.willPriceGrow,
          // indicatorsData.dmi4h.willPriceGrow &&
          // indicatorsData.obv5m.sellSignalCount >= 20 &&

          // (indicatorsData.dmi1h.adxBuySignalVolume >= 2 ||
          //   indicatorsData.dmi1h.adxSellSignalVolume >= 2),

          // ((indicatorsData.dmi1h.trend === 'DOWN' &&
          //   indicatorsData.dmi1h.adxBuySignalVolume >= 2) ||
          //   (indicatorsData.dmi1h.trend === 'UP' &&
          //     indicatorsData.dmi1h.adxSellSignalVolume >= 2)),

          // indicatorsData.obv1h.sellSignalCount >= 20 &&
          // indicatorsData.obv5m.sellSignalCount >= 20 &&
          // indicatorsData.dmi1h.adxBuySignalVolume >= 6 &&
          // indicatorsData.dmi5m.adxBuySignalVolume >= 8,
          // indicatorsData.obv1m.sellSignalCount >= 4,
          // indicatorsData.dmi5m.adxBuySignalVolume >= 8,
          // indicatorsData.dmi15m.adxBuySignalVolume >= 8 &&
          // indicatorsData.dmi5m.adxBuySignalVolume >= 6,
          // (indicatorsData.dmi5m.adxSellSignalVolume >= 1 ||
          //   indicatorsData.dmi5m.adxBuySignalVolume >= 2),
          // indicatorsData.stochRsi.stoch15m.sellSignalCount >= 6,

          // indicatorsData.cci.cci1h.sellSignalCount >= 3 &&
          // indicatorsData.cci.cci30m.sellSignalCount >= 3 &&
          // indicatorsData.cci.cci15m.sellSignalCount >= 3 &&
          // indicatorsData.obv15m.sellSignalCount >= 8 &&
          // (indicatorsData.dmi5m.adxBuySignalVolume >= 2 ||
          // (indicatorsData.dmi15m.adxSellSignalVolume >= 1 ||
          //   indicatorsData.dmi15m.adxBuySignalVolume >= 2) &&
          // indicatorsData.obv15m.sellSignalCount >= 20 &&
          // indicatorsData.mfi.mfi12m.sellSignalCount >= 4,
          // indicatorsData.rsi15m.rsiValue > 70 &&
          // indicatorsData.rsi1m.rsiValue < 30,
          // indicatorsData.dmi5m.adx > 90,
          // (indicatorsData.dmi1m.adxBuySignalVolume >= 4 ||
          //   indicatorsData.dmi1m.adxSellSignalVolume >= 4) &&
          // indicatorsData.rsi15m.rsiValue < 30 &&
          // indicatorsData.obv15m.sellSignalCount >= 20,

          // indicatorsData.obv1h.sellSignalCount >= 20,
          // indicatorsData.obv30m.sellSignalCount >= 8 &&
          // indicatorsData.obv15m.sellSignalCount >= 8 &&
          // indicatorsData.mfi.mfi15m.prevMfi <= 20 &&
          // indicatorsData.mfi.mfi5m.sellSignalCount >= 4 &&
          // indicatorsData.mfi.mfi1m.sellSignalCount >= 4 &&
          // indicatorsData.mfi.mfi12m.sellSignalCount >= 4 &&
          // indicatorsData.dmi15m.adxBuySignalVolume >= 2,
          // indicatorsData.dmi5m.adxBuySignalVolume >= 2 &&
          // indicatorsData.roc.roc15m.prevValue < 0,
          // indicatorsData.roc.roc5m.prevValue < 0,
          // indicatorsData.mfi.mfi13m.sellSignalCount >= 4 &&
          // indicatorsData.mfi.mfi14m.sellSignalCount >= 4,
          // indicatorsData.obv1m.sellSignalCount >= 2,
          // indicatorsData.mfi.mfi52m.sellSignalCount >= 6 &&
          // indicatorsData.mfi.mfi1m.sellSignalCount >= 4 &&
          // indicatorsData.mfi.mfi12m.sellSignalCount >= 4 &&
          // indicatorsData.obv1m.sellSignalCount >= 4,
          // indicatorsData.atr.atr1m.buySignalCount >= 2,

          // indicatorsData.dmi1m.adxUpCount >= 2,
          // indicatorsData.mfi.mfi13m.sellSignalCount >= 10,

          // indicatorsData.mfi.mfi12m.sellSignalCount >= 6,
          // indicatorsData.rsi1m.rsiValue !== null &&
          // indicatorsData.rsi1m.rsiValue < 40 &&
          // indicatorsData.rsi5m.rsiValue !== null &&
          // indicatorsData.rsi5m.rsiValue < 40 &&
          // indicatorsData.roc.roc1m.prevValue < 0 &&
          // indicatorsData.roc.roc5m.prevValue < 0 &&
          // indicatorsData.dmi5m.adxUpCount >= 1 &&
          // indicatorsData.dmi1m.adxUpCount >= 5 &&
          // ||
          // indicatorsData.dmi5m.adxDownCount >= 3
          // indicatorsData.haCandle.ha1mCandle.sellSignalCount >= 3 &&
          // indicatorsData.ema.ema1m.slow.emaDownCount >= 4 &&
          // indicatorsData.obv30m.sellSignalCount >= 20 &&
          // indicatorsData.efi1m.prevEfi < 0 &&
          // indicatorsData.obv15m.sellSignalCount >= 20 &&
          // indicatorsData.cci.cci1m.cci < 0 &&
          // indicatorsData.obv15m.sellSignalCount >= 10 &&
          // indicatorsData.dmi5m.adxUpCount >= 2,

          // indicatorsData.obv15m.sellSignalCount >= 6 &&
          // indicatorsData.cci.cci5m.cci < 0 &&
          // indicatorsData.crsi.crsi15m.crsi < 30 &&
          // indicatorsData.crsi.crsi5m.crsi < 30,
          // indicatorsData.haCandle.ha5mCandle.sellSignalCount >= 3 &&
          // indicatorsData.obv1m.sellSignalCount >= 6 &&
          // (indicatorsData.dmi1m.adxDownCount >= 3 ||
          //   indicatorsData.dmi1m.adxUpCount >= 3) &&
          // indicatorsData.obv1m.sellSignalCount >= 6 &&
          // indicatorsData.avgPrices.avgSmall.avgPriceDownSignalCount >=
          //   1 &&
          // indicatorsData.macd.macd5m.sellSignalCount >= 2 &&
          // indicatorsData.obv1h.sellSignalCount >= 30 &&
          // indicatorsData.ema.ema1m.slow.emaDownCount >= 3 &&
          // indicatorsData.obv15m.sellSignalCount >= 20 &&
          // indicatorsData.cci.cci1m.sellSignalCount >= 3,

          // indicatorsData.obv1m.sellSignalCount >= 20 &&
          // indicatorsData.dmi1h.buySignalCount >= 3,
          // indicatorsData.ema.ema1m.slow.emaDownCount >= 3,

          // indicatorsData.obv1m.sellSignalCount >= 4 &&
          // indicatorsData.macd.macd5m.sellSignalCount >= 2,

          // indicatorsData.ema.ema1m.fast.emaDownCount >= 1 &&
          // indicatorsData.ema.ema1m.middle.emaDownCount >= 1,
          // indicatorsData.obv5m.sellSignalCount >= 10 &&
          // indicatorsData.obvAv5m.sellSignalCount >= 2 &&
          // indicatorsData.obv1m.sellSignalCount >= 10,
          // indicatorsData.obvAv1m.sellSignalCount >= 2,

          // indicatorsData.obv1m.sellSignalCount >= 6 &&
          // indicatorsData.ema.ema1m.slow.emaSignal === 'sell',
          // indicatorsData.ema.ema1m.fast.emaSignal === 'sell',

          // indicatorsData.obv1h.sellSignalCount >= 30,
          // indicatorsData.avgPrices.avgSmall.avgPriceSignal === 'sell' &&
          // indicatorsData.obv5m.sellSignalCount >= 10 &&
          // (indicatorsData.dmi1m.adxUpCount >= 4 ||
          //   indicatorsData.dmi1m.adxDownCount >= 4),
          // indicatorsData.dmi1m.adx > 20,

          // indicatorsData.obv1m.sellSignalCount >= 2,
          // indicatorsData.rsi15m.rsiValue < 50,
          // indicatorsData.rsi15m.rsiValue !== null &&
          // indicatorsData.rsi5m.rsiValue < 50 &&
          // indicatorsData.rsi5m.rsiValue !== null &&
          // indicatorsData.rsi1m.rsiValue < 50 &&
          // indicatorsData.rsi1m.rsiValue !== null,
          // indicatorsData.avgPrices.avgBig.avgPriceDownSignalCount >= 2,
          // indicatorsData.avgPrices.avgSmall.avgPriceDownSignalCount >= 4,

          // indicatorsData.avgPriceSignal === 'sell',
          // indicatorsData.haCandle.ha1hCandle.signal === 'sell' &&
          // indicatorsData.haCandle.ha4hCandle.signal === 'sell' &&
          // indicatorsData.obv1d.sellSignalCount >= 30 &&
          // indicatorsData.obv4h.sellSignalCount >= 30 &&
          // indicatorsData.obv1h.signal === 'sell' &&
          // indicatorsData.obv15m.sellSignalCount >= 20,
          // indicatorsData.obv1m.sellSignalCount >= 15,

          // indicatorsData.obv5m.sellSignalCount >= 4,
          // indicatorsData.obv1m.sellSignalCount >= 20,
          // indicatorsData.haCandle.ha1hCandle.signal === 'sell',
        },
        sell: {
          takeProfit: null,
          // (botState.status === 'sell' &&
          //   botState.dealType === 'long' &&
          //   expectedProfitPercent <= -0.5) ||
          // (botState.status === 'sell' &&
          //   botState.dealType === 'short' &&
          //   expectedProfitPercent >= 0.5),
          stopLoss: {
            long:
              botState.status === 'sell' &&
              botState.dealType === 'long' &&
              indicatorsData.obv15m.sellSignalCount >= 2 &&
              indicatorsData.obv5m.sellSignalCount >= 2 &&
              indicatorsData.dmi15m.adxBuySignalVolume >= 2 &&
              indicatorsData.dmi5m.adxBuySignalVolume >= 2 &&
              indicatorsData.dmi1m.adxBuySignalVolume >= 2,
            // indicatorsData.rsi5m.signal === 'sell'),

            // indicatorsData.obv15m.sellSignalCount >= 20 &&
            // indicatorsData.obv5m.sellSignalCount >= 20 &&
            // indicatorsData.obv1m.sellSignalCount >= 5 &&
            // indicatorsData.avgPrices.avgBig.avgPriceDownSignalCount >= 4 &&
            // indicatorsData.avgPrices.avgSmall.avgPriceDownSignalCount >= 4,
            // (indicatorsData.dmi15m.adxBuySignalVolume >= 10 ||
            //   indicatorsData.dmi15m.adxSellSignalVolume >= 10) &&
            // (indicatorsData.dmi5m.adxBuySignalVolume >= 10 ||
            //   indicatorsData.dmi5m.adxSellSignalVolume >= 10) &&
            // (indicatorsData.dmi1m.adxBuySignalVolume >= 10 ||
            //   indicatorsData.dmi1m.adxSellSignalVolume >= 10),
            // (indicatorsData.dmi15m.adxBuySignalVolume >= 20 ||
            //   indicatorsData.dmi5m.adxBuySignalVolume >= 20 ||
            //   indicatorsData.dmi1m.adxBuySignalVolume >= 20),
            // indicatorsData.dmi1m.adxBuySignalVolume >= 10,
            // indicatorsData.dmi15m.adxSellSignalVolume >= 10),

            // indicatorsData.obv1h.sellSignalCount >= 4 &&
            // (indicatorsData.dmi1h.adxBuySignalVolume >= 1 ||
            //   indicatorsData.dmi1h.adxSellSignalVolume >= 1),

            // (indicatorsData.dmi1h.adxBuySignalVolume >= 2 ||
            //   indicatorsData.dmi1h.adxSellSignalVolume >= 2),

            // indicatorsData.haCandle.ha1mCandle.signal === 'sell' &&
            // indicatorsData.obv1h.sellSignalCount >= 20 &&
            // indicatorsData.obv5m.sellSignalCount >= 20 &&
            // indicatorsData.dmi1h.adxBuySignalVolume >= 6 &&
            // indicatorsData.dmi5m.adxBuySignalVolume >= 8,
            // indicatorsData.obv1m.sellSignalCount >= 4,
            // indicatorsData.dmi5m.adxBuySignalVolume >= 8,
            // indicatorsData.dmi5m.adxBuySignalVolume >= 6,
            // (indicatorsData.dmi5m.adxSellSignalVolume >= 1 ||
            //   indicatorsData.dmi5m.adxBuySignalVolume >= 2),
            // (indicatorsData.dmi15m.adxSellSignalVolume >= 1 ||
            // indicatorsData.dmi15m.adxBuySignalVolume >= 8 &&
            //   indicatorsData.dmi15m.adxBuySignalVolume >= 2) &&
            // indicatorsData.obv15m.sellSignalCount >= 20 &&
            // indicatorsData.obv5m.sellSignalCount >= 20,
            // ((indicatorsData.dmi15m.adxSellSignalVolume >= 1 &&
            //   indicatorsData.obv15m.sellSignalCount >= 10) ||
            //   (indicatorsData.dmi15m.adxBuySignalVolume >= 2 &&
            //     indicatorsData.obv15m.sellSignalCount >= 10)),
            // indicatorsData.stochRsi.stoch15m.sellSignalCount >= 6,

            // indicatorsData.dmi5m.adxBuySignalVolume >=  &&
            // indicatorsData.mfi.mfi12m.sellSignalCount >= 4,
            // indicatorsData.rsi15m.rsiValue > 70 &&
            // indicatorsData.rsi1m.rsiValue < 30,
            // indicatorsData.cci.cci15m.sellSignalCount >= 3,
            // indicatorsData.dmi5m.adx > 90,

            // (indicatorsData.dmi1m.adxBuySignalVolume >= 4 ||
            //   indicatorsData.dmi1m.adxSellSignalVolume >= 4) &&
            // indicatorsData.rsi5m.rsiValue < 30 &&
            // indicatorsData.mfi.mfi15m.sellSignalCount >= 2 &&
            // indicatorsData.mfi.mfi5m.sellSignalCount >= 2 &&
            // indicatorsData.mfi.mfi1m.sellSignalCount >= 4 &&
            // indicatorsData.mfi.mfi12m.sellSignalCount >= 4 &&
            // indicatorsData.dmi15m.adxSellSignalVolume >= 1,
            // indicatorsData.mfi.mfi13m.sellSignalCount >= 4 &&
            // indicatorsData.mfi.mfi14m.sellSignalCount >= 4,
            // indicatorsData.obv1m.sellSignalCount >= 2,
            // indicatorsData.obv15m.sellSignalCount >= 4 &&
            // indicatorsData.obv5m.sellSignalCount >= 10,
            // indicatorsData.mfi.mfi52m.sellSignalCount >= 6 &&
            // indicatorsData.mfi.mfi1m.sellSignalCount >= 4 &&
            // indicatorsData.mfi.mfi12m.sellSignalCount >= 4 &&
            // indicatorsData.obv5m.sellSignalCount >= 20 &&
            // indicatorsData.cci.cci1h.sellSignalCount >= 3 &&
            // indicatorsData.cci.cci30m.sellSignalCount >= 3 &&
            // indicatorsData.cci.cci5m.sellSignalCount >= 3 &&
            // (indicatorsData.dmi5m.adxBuySignalVolume >= 2 ||
            // indicatorsData.dmi5m.adxSellSignalVolume >= 1,
            // indicatorsData.atr.atr1m.buySignalCount >= 2,

            // indicatorsData.dmi1m.adxDownCount >= 1),
            // indicatorsData.mfi.mfi13m.sellSignalCount >= 10,

            // indicatorsData.mfi.mfi12m.sellSignalCount >= 6,
            // indicatorsData.dmi5m.adxDownCount >= 2,

            // (indicatorsData.dmi1m.adxDownCount >= 2 ||
            // indicatorsData.obv1m.sellSignalCount >= 4 &&
            // indicatorsData.rsi1m.rsiValue < 60,

            // indicatorsData.cci.cci1m.cci < 0,
            // indicatorsData.obv30m.sellSignalCount >= 20 &&
            // indicatorsData.haCandle.ha1mCandle.sellSignalCount >= 3 &&
            // indicatorsData.efi1m.prevEfi < 0 &&
            // indicatorsData.crsi.crsi5m.crsi < 30,
            // (indicatorsData.dmi1m.adxDownCount >= 3 ||
            //   indicatorsData.dmi1m.adxUpCount >= 3) &&
            // indicatorsData.obv1h.sellSignalCount >= 30,
            // indicatorsData.obv15m.sellSignalCount >= 10 &&
            // indicatorsData.cci.cci5m.cci < 0 &&
            // indicatorsData.ema.ema1m.slow.emaDownCount >= 2 &&
            // indicatorsData.obv15m.sellSignalCount >= 20,
            // indicatorsData.obv1m.sellSignalCount >= 6 &&
            // (indicatorsData.dmi1m.adxUpCount >= 3 ||
            // indicatorsData.dmi1m.adxDownCount >= 3,
            // indicatorsData.cci.cci15m.downSignalCount >= 3,
            // indicatorsData.macd.macd5m.sellSignalCount >= 2 &&
            // indicatorsData.ema.ema1m.slow.emaDownCount >= 3 &&
            // indicatorsData.cci.cci1m.downSignalCount >= 3,

            // indicatorsData.obv15m.sellSignalCount >= 20,
            // indicatorsData.ema.ema1m.slow.emaDownCount >= 3,

            // ((indicatorsData.obv5m.sellSignalCount >= 4 &&
            //   indicatorsData.obvAv5m.sellSignalCount >= 1) ||
            //   (indicatorsData.obv5m.sellSignalCount >= 1 &&
            //     indicatorsData.obvAv1m.sellSignalCount >= 1 &&
            //     indicatorsData.obv1m.sellSignalCount >= 4)),
            // indicatorsData.ema.ema1m.middle.emaDownCount >= 2 &&
            // indicatorsData.obv5m.sellSignalCount >= 20 &&
            // indicatorsData.obv1m.sellSignalCount >= 4 &&
            // indicatorsData.macd.macd5m.sellSignalCount >= 2,

            // indicatorsData.ema.ema1m.fast.emaDownCount >= 1,
            // indicatorsData.obv5m.sellSignalCount >= 10 &&
            // indicatorsData.obv1m.sellSignalCount >= 10,
            // indicatorsData.ema.ema1m.slow.emaSignal === 'sell',
            // (botState.dmi1m.adxUpCount > 0
            // ? indicatorsData.dmi1m.adxDownCount >= 4
            // : indicatorsData.dmi1m.adxUpCount >= 4 ||
            // indicatorsData.avgPrices.avgBig.avgPriceDownSignalCount >= 2 &&
            // indicatorsData.avgPrices.avgSmall.avgPriceDownSignalCount >= 4 &&
            // indicatorsData.dmi1m.adxDownCount >= 2,
            // indicatorsData.obv1m.sellSignalCount >= 10,

            // indicatorsData.avgPriceSignal === 'sell',
            // indicatorsData.obv1d.sellSignalCount >= 30 &&
            // (indicatorsData.haCandle.ha1hCandle.signal === 'sell' &&
            //   indicatorsData.haCandle.ha4hCandle.signal === 'sell')),
            // indicatorsData.obv1h.signal === 'sell' &&
            // indicatorsData.obv5m.sellSignalCount >= 4 &&

            // indicatorsData.obv1h.sellSignalCount >= 30,
            // indicatorsData.avgPrices.avgSmall.avgPriceSignal === 'sell' &&
            // (indicatorsData.dmi1m.adxUpCount >= 4 ||
            //   indicatorsData.dmi1m.adxDownCount >= 4),
            // (indicatorsData.obv15m.sellSignalCount >= 2 &&
            //   indicatorsData.obv5m.sellSignalCount >= 2) ||
            // (indicatorsData.obv1m.sellSignalCount >= 2 &&
            //   indicatorsData.obv15m.sellSignalCount >= 2) ||
            // (indicatorsData.obv5m.sellSignalCount >= 2 &&
            //   indicatorsData.obv1m.sellSignalCount >= 2)),
            // botState.status === 'sell' &&
            // botState.dealType === 'long' &&
            // indicatorsData.obv1h.signal === 'sell' &&
            // indicatorsData.obv15m.signal === 'sell' &&
            // indicatorsData.obv5m.signal === 'sell' &&
            // indicatorsData.obv1m.signal === 'sell',
            short:
              botState.status === 'sell' &&
              botState.dealType === 'short' &&
              indicatorsData.obv15m.buySignalCount >= 2 &&
              indicatorsData.obv5m.buySignalCount >= 2 &&
              indicatorsData.dmi15m.adxBuySignalVolume >= 2 &&
              indicatorsData.dmi5m.adxBuySignalVolume >= 2 &&
              indicatorsData.dmi1m.adxBuySignalVolume >= 2,
            // indicatorsData.rsi5m.signal === 'buy'),

            // indicatorsData.obv15m.buySignalCount >= 20 &&
            // indicatorsData.obv5m.buySignalCount >= 20 &&
            // indicatorsData.obv1m.buySignalCount >= 5 &&
            // indicatorsData.avgPrices.avgBig.avgPriceUpSignalCount >= 4 &&
            // indicatorsData.avgPrices.avgSmall.avgPriceUpSignalCount >= 4,
            // (indicatorsData.dmi15m.adxBuySignalVolume >= 10 ||
            //   indicatorsData.dmi15m.adxSellSignalVolume >= 10) &&
            // (indicatorsData.dmi5m.adxBuySignalVolume >= 10 ||
            //   indicatorsData.dmi5m.adxSellSignalVolume >= 10) &&
            // (indicatorsData.dmi1m.adxBuySignalVolume >= 10 ||
            //   indicatorsData.dmi1m.adxSellSignalVolume >= 10),
            // (indicatorsData.dmi15m.adxBuySignalVolume >= 20 ||
            //   indicatorsData.dmi5m.adxBuySignalVolume >= 20 ||
            //   indicatorsData.dmi1m.adxBuySignalVolume >= 20),
            // indicatorsData.dmi1m.adxBuySignalVolume >= 10,
            // indicatorsData.dmi15m.adxSellSignalVolume >= 10),
            // indicatorsData.obv1h.buySignalCount >= 4 &&
            // (indicatorsData.dmi1h.adxBuySignalVolume >= 1 ||
            //   indicatorsData.dmi1h.adxSellSignalVolume >= 1),

            // (indicatorsData.dmi1h.adxBuySignalVolume >= 2 ||
            //   indicatorsData.dmi1h.adxSellSignalVolume >= 2),
            // indicatorsData.haCandle.ha1mCandle.signal === 'buy' &&
            // indicatorsData.obv1h.buySignalCount >= 20 &&
            // indicatorsData.obv5m.buySignalCount >= 20 &&
            // indicatorsData.dmi1h.adxBuySignalVolume >= 6 &&
            // indicatorsData.dmi5m.adxBuySignalVolume >= 8,
            // indicatorsData.obv1m.buySignalCount >= 4,
            // indicatorsData.dmi5m.adxBuySignalVolume >= 8,
            // indicatorsData.dmi15m.adxBuySignalVolume >= 8 &&
            // indicatorsData.dmi5m.adxBuySignalVolume >= 6,
            // (indicatorsData.dmi5m.adxBuySignalVolume >= 2 ||
            //   indicatorsData.dmi5m.adxSellSignalVolume >= 1),
            // (indicatorsData.dmi15m.adxSellSignalVolume >= 1 ||
            //   indicatorsData.dmi15m.adxBuySignalVolume >= 2) &&
            // indicatorsData.obv15m.buySignalCount >= 20 &&
            // indicatorsData.obv5m.buySignalCount >= 20,
            // indicatorsData.stochRsi.stoch15m.buySignalCount >= 6,

            // indicatorsData.obv15m.buySignalCount >= 8 &&
            // indicatorsData.dmi5m.adxBuySignalVolume >= 2 &&
            // (indicatorsData.dmi15m.adxSellSignalVolume >= 1 ||
            //   indicatorsData.dmi15m.adxBuySignalVolume >= 2) &&
            // indicatorsData.obv15m.buySignalCount >= 10,

            // indicatorsData.mfi.mfi12m.buySignalCount >= 4,
            // indicatorsData.rsi15m.rsiValue < 30 &&
            // indicatorsData.rsi1m.rsiValue > 70,
            // indicatorsData.cci.cci15m.buySignalCount >= 3,
            // indicatorsData.dmi5m.adx > 90,

            // (indicatorsData.dmi1m.adxBuySignalVolume >= 4 ||
            //   indicatorsData.dmi1m.adxSellSignalVolume >= 4) &&
            // indicatorsData.rsi5m.rsiValue > 70 &&
            // indicatorsData.obv1h.buySignalCount >= 20,
            // indicatorsData.cci.cci1h.buySignalCount >= 3 &&
            // indicatorsData.cci.cci30m.buySignalCount >= 3 &&
            // indicatorsData.cci.cci5m.buySignalCount >= 3 &&
            // (indicatorsData.dmi5m.adxBuySignalVolume >= 2 ||
            // indicatorsData.dmi5m.adxSellSignalVolume >= 1,
            // indicatorsData.mfi.mfi15m.buySignalCount >= 2 &&
            // indicatorsData.mfi.mfi5m.buySignalCount >= 2 &&
            // indicatorsData.mfi.mfi1m.buySignalCount >= 4 &&
            // indicatorsData.mfi.mfi12m.buySignalCount >= 4 &&
            // indicatorsData.dmi15m.adxSellSignalVolume >= 1,
            // indicatorsData.mfi.mfi13m.buySignalCount >= 4 &&
            // indicatorsData.mfi.mfi14m.buySignalCount >= 4,
            // indicatorsData.obv1m.buySignalCount >= 2,
            // indicatorsData.obv15m.buySignalCount >= 4 &&
            // indicatorsData.mfi.mfi52m.buySignalCount >= 6 &&
            // indicatorsData.mfi.mfi1m.buySignalCount >= 4 &&
            // indicatorsData.mfi.mfi12m.buySignalCount >= 4 &&
            // indicatorsData.atr.atr1m.buySignalCount >= 2,

            // indicatorsData.dmi1m.adxDownCount >= 1),
            // indicatorsData.mfi.mfi13m.buySignalCount >= 10,
            // indicatorsData.mfi.mfi12m.buySignalCount >= 6,
            // indicatorsData.dmi5m.adxDownCount >= 2,

            // (indicatorsData.dmi1m.adxDownCount >= 2 ||
            // indicatorsData.cci.cci1m.cci > 0 &&
            // indicatorsData.obv5m.buySignalCount >= 4 &&
            // indicatorsData.rsi1m.rsiValue > 60,
            // indicatorsData.haCandle.ha1mCandle.buySignalCount >= 3 &&
            // indicatorsData.obv30m.buySignalCount >= 20 &&
            // indicatorsData.efi1m.prevEfi > 0,

            // indicatorsData.obv15m.buySignalCount >= 20 &&
            // indicatorsData.obv1h.buySignalCount >= 30,

            // indicatorsData.crsi.crsi15m.crsi > 70 &&
            // indicatorsData.crsi.crsi5m.crsi > 70,
            // indicatorsData.obv1m.buySignalCount >= 6 &&
            // indicatorsData.cci.cci5m.cci > 0 &&
            // indicatorsData.cci.cci1m.cci > 0,
            // indicatorsData.ema.ema1m.slow.emaUpCount >= 2,
            // (indicatorsData.dmi1m.adxDownCount >= 3 ||
            //   indicatorsData.dmi1m.adxUpCount >= 3),
            // indicatorsData.obv1m.buySignalCount >= 6 &&
            // (indicatorsData.dmi1m.adxUpCount >= 3 ||
            // indicatorsData.dmi1m.adxDownCount >= 3,
            // indicatorsData.cci.cci15m.upSignalCount >= 3,

            // indicatorsData.ema.ema1m.slow.emaUpCount >= 3 &&
            // indicatorsData.macd.macd5m.buySignalCount >= 2 &&
            // indicatorsData.obv5m.buySignalCount >= 10,
            // indicatorsData.obv5m.buySignalCount >= 20 &&
            // (indicatorsData.dmi1m.buySignalCount >= 2 ||
            //   indicatorsData.dmi1m.sellSignalCount >= 2),

            // indicatorsData.ema.ema1m.slow.emaUpCount >= 3,

            // ((indicatorsData.obv5m.buySignalCount >= 4 &&
            //   indicatorsData.obvAv5m.buySignalCount >= 1) ||
            //   (indicatorsData.obv5m.buySignalCount >= 1 &&
            //     indicatorsData.obvAv1m.buySignalCount >= 1 &&
            //     indicatorsData.obv1m.buySignalCount >= 4)),
            // indicatorsData.ema.ema1m.middle.emaUpCount >= 2 &&
            // indicatorsData.obv5m.buySignalCount >= 20 &&
            // indicatorsData.obv1m.buySignalCount >= 4 &&
            // indicatorsData.macd.macd5m.buySignalCount >= 2,

            // indicatorsData.ema.ema1m.fast.emaUpCount >= 1,
            // indicatorsData.cci.cci1m.upSignalCount >= 3,
            // indicatorsData.ema.ema1m.slow.emaSignal === 'buy',
            // indicatorsData.avgPrices.avgBig.avgPriceUpSignalCount >= 2,
            // indicatorsData.avgPrices.avgSmall.avgPriceSignal === 'buy' &&
            // (botState.dmi1m.adxUpCount > 0
            //   ? indicatorsData.dmi1m.adxDownCount >= 4
            //   : indicatorsData.dmi1m.adxUpCount >= 4 ||
            // indicatorsData.avgPrices.avgSmall.avgPriceUpSignalCount >= 4 &&
            // indicatorsData.obv5m.buySignalCount >= 10),
            // indicatorsData.dmi5m.adxDownCount > 0,
            // indicatorsData.obv1m.buySignalCount >= 10,
            // indicatorsData.avgPriceSignal === 'buy',
            // indicatorsData.obv4h.buySignalCount >= 20 &&
            // indicatorsData.obv1d.buySignalCount >= 30 &&
            // indicatorsData.haCandle.ha1hCandle.signal === 'buy' &&
            //   indicatorsData.haCandle.ha4hCandle.signal === 'buy',
            // indicatorsData.obv1h.signal === 'buy' &&
            // indicatorsData.obv15m.buySignalCount > 0 &&
            // indicatorsData.obv5m.buySignalCount >= 5,
            // indicatorsData.obv5m.buySignalCount >= 6,
            // (indicatorsData.obv15m.buySignalCount >= 2 &&
            //   indicatorsData.obv5m.buySignalCount >= 2) ||
            // (indicatorsData.obv1m.buySignalCount >= 2 &&
            //   indicatorsData.obv15m.buySignalCount >= 2) ||
            // (indicatorsData.obv5m.buySignalCount >= 2 &&
            //   indicatorsData.obv1m.buySignalCount >= 2)),
            // botState.status === 'sell' &&
            // botState.dealType === 'short' &&
            // indicatorsData.obv1h.signal === 'buy' &&
            // indicatorsData.obv15m.signal === 'buy' &&
            // indicatorsData.obv5m.signal === 'buy' &&
            // indicatorsData.obv1m.signal === 'buy',
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

  // getTradeStream({
  //   symbol: symbol,
  //   resource: RESOURCES.TRADE,
  // })
  //   .pipe(bufferCount(1, 1))
  //   .subscribe(data => console.log(data));

  // getVolumeProfileStream({
  //   symbol,
  //   interval: '1m',
  //   pricesRangeCount: 5,
  //   barsCount: 20,
  // }).subscribe(data => {
  //   indicatorsData.candle.candle1m = data;
  // });

  // getCRSIStream({ symbol, interval: '15m' }, indicatorsData.crsi.crsi15m);
  // getCRSIStream({ symbol, interval: '5m' }, indicatorsData.crsi.crsi5m);
  // getCRSIStream({ symbol, interval: '1m' }, indicatorsData.crsi.crsi1m);

  // calculateAvgPriceChange(
  //   symbol,
  //   RESOURCES.TRADE,
  //   25,
  //   botState,
  //   indicatorsData.avgPrices.avgBig,
  // );
  // calculateAvgPriceChange(
  //   symbol,
  //   RESOURCES.TRADE,
  //   10,
  //   botState,
  //   indicatorsData.avgPrices.avgSmall,
  // );

  /** *******************************INDICATORS SECTION**************************************/

  // getStochRSISignal(
  //   symbol,
  //   '1h',
  //   indicatorsData.stochRsi.stoch1h,
  //   1.5,sect
  //   1.5,
  //   2,
  //   2,
  // );
  // getStochRSISignal(
  //   symbol,
  //   '5m',
  //   indicatorsData.stochRsi.stoch5m,
  //   1.5,
  //   1.5,
  //   2,
  //   2,
  // );
  // getStochRSISignal(symbol, '15m', indicatorsData.stochRsi.stoch15m, 2.5, 2.5);

  // getObvSignal(symbol, '1d', indicatorsData.obv1d, 20, 20);
  // getObvSignal(symbol, '2h', indicatorsData.obv2h, 2, 2);
  // getObvSignal(symbol, '4h', indicatorsData.obv4h, 2, 2);
  // getObvSignal(symbol, '1h', indicatorsData.obv1h, 60, 60);
  // getObvSignal(symbol, '30m', indicatorsData.obv30m, 60, 60);
  getRSISignal(symbol, '5m', indicatorsData.rsi5m);
  getObvSignal(symbol, '15m', indicatorsData.obv15m, 2, 2);
  getObvSignal(symbol, '5m', indicatorsData.obv5m, 60, 60);
  getObvSignal(symbol, '1m', indicatorsData.obv1m, 60, 60);
  getDMISignal(symbol, '15m', 4, indicatorsData.dmi15m, botState, true, false);
  getDMISignal(symbol, '5m', 4, indicatorsData.dmi5m, botState, true, false);
  getDMISignal(symbol, '1m', 4, indicatorsData.dmi1m, botState, true, false);

  // getDMISignal(symbol, '1h', 14, indicatorsData.dmi1h, botState, true, true);
  // getDMISignal(symbol, '4h', 14, indicatorsData.dmi4h, botState, true, true);
  // getDMISignal(symbol, '30m', 14, indicatorsData.dmi30m, botState, true, true);
  // getHeikinAshiSignal(symbol, '4h', 6, 6, indicatorsData.haCandle.ha4hCandle);
  // getHeikinAshiSignalForTheLastCandles(
  //   symbol,
  //   '1m',
  //   3,
  //   3,
  //   indicatorsData.haCandle.ha1mCandle,
  // );

  // getHeikinAshiSignal(symbol, '1m', 6, 6, indicatorsData.haCandle.ha1mCandle);
  // getObvSignal(symbol, '15m', indicatorsData.obv15m, 20, 20);
  // getMfiSignal(symbol, '5m', 14, indicatorsData.mfi.mfi1m, 1, 1);
  // getObvSignal(symbol, '1m', indicatorsData.obv1m, 60, 60);
  // getDMISignal(symbol, '15m', 14, indicatorsData.dmi15m, botState, true, true);
  // getDMISignal(symbol, '5m', 14, indicatorsData.dmi5m, botState, true, true);
  // getDMISignal(symbol, '15m', 14, indicatorsData.dmi1m, botState, true, false);
  // getDMISignal(symbol, '1d', 2, indicatorsData.dmi1m, botState, true);
  // getDMISignal(s
  //   // gymbol, '5m', 2, indicatorsData.dmi5m, botState, true);
  // getDMISignal(symbol, '5m', 2, indicatorsData.dmi5m, botState, true);
  // getObvSignal(symbol, '1h', indicatorsData.obv1h, 60, 60);
  // getEMASignal(symbol, '1m', indicatorsData.fast1mEMA);
  // getATRSignal(symbol, '5m', 14, indicatorsData.atr.atr1m);
  // getDMISignal(
  //   symbol,
  //   '15m',
  //   3,
  //   indicatorsData.dmi15m,
  //   botState,
  //   1,
  //   true,
  //   0,
  //   0,
  // );
  // getDMISignal(symbol, '1h', 2, indicatorsData.dmi1h, botState, true);
  // getDMISignal(symbol, '30m', 2, indicatorsData.dmi30m, botState, true);
  // getDMISignal(symbol, '1m', 2, indicatorsData.dmi1m, botState, true);
  // getDMISignal(symbol, '15m', 2, indicatorsData.dmi15m, botState, true);
  // getMfiSignal(symbol, '1m', 6, indicatorsData.mfi.mfi12m, 1, 1);
  // getMfiSignal(symbol, '5m', 2, indicatorsData.mfi.mfi5m, 1, 1);
  // getMfiSignal(symbol, '1m', 20, indicatorsData.mfi.mfi12m, 1, 1);
  // getMfiSignal(symbol, '1m', 40, indicatorsData.mfi.mfi13m, 1, 1);
  // getRocSignal(symbol, '15m', 3, indicatorsData.roc.roc15m, 0, -0.1, 4, 2);
  // getRocSignal(symbol, '5m', 3, indicatorsData.roc.roc5m, 0, -0.1, 4, 2);
  // getMfiSignal(symbol, '1m', 30, indicatorsData.mfi.mfi13m, 1, 1);
  // getMfiSignal(symbol, '1m', 40, indicatorsData.mfi.mfi14m, 1, 1);
  // getMfiSignal(symbol, '30m', 14, indicatorsData.mfi.mfi30m, 1, 1);
  // getObvSignal(symbol, '15m', indicatorsData.obv15m, 6, 6);
  // getObvSignal(symbol, '5m', indicatorsData.obv5m, 6, 6);
  // getMfiSignal(symbol, '5m', 6, indicatorsData.mfi.mfi13m, 1, 1);
  // getMfiSignal(symbol, '15m', 4, indicatorsData.mfi.mfi14m, 1, 1);
  // getCCISignal(symbol, '1h', indicatorsData.cci.cci1h);
  // getCCISignal(symbol, '30m', indicatorsData.cci.cci30m);
  // getCCISignal(symbol, '5m', indicatorsData.cci.cci5m);
  // getStochRSISignal(
  //   symbol,
  //   '15m',
  //   indicatorsData.stochRsi.stoch15m,
  //   null,
  //   null,
  //   null,
  //   null,
  // );
  // getObvSignal(symbol, '15m', indicatorsData.obv15m, 6, 6);
  // getObvSignal(symbol, '5m', indicatorsData.obv5m, 6, 6);
  // getObvSignal(symbol, '1m', indicatorsData.obv1m, 6, 6);
  // getDMISignal(symbol, '1m', indicatorsData.dmi1m, 1, 0, 0);

  // getMfiSignal(symbol, '15m', 14, indicatorsData.mfi.mfi5m, 1, 1);
  // getMfiSignal(symbol, '15m', 4, indicatorsData.mfi.mfi52m, 1, 1);
  // getMfiSignal(symbol, '5m', 14, indicatorsData.mfi.mfi1m, 1, 1);
  // getMfiSignal(symbol, '5m', 4, indicatorsData.mfi.mfi12m, 1, 1);
  // getRSISignal(symbol, '1m', indicatorsData.rsi1m);
  // getRocSignal(symbol, '1d', indicatorsData.roc.roc15m, 0, -0.1, 4, 2);
  // getRocSignal(symbol, '1m', indicatorsData.roc.roc1m, 0, -0.1, 4, 2);
  // getRocSignal(symbol, '5m', indicatorsData.roc.roc5m, 0, -0.1, 4, 2);
  // getRocSignal(symbol, '1m', indicatorsData.roc.roc1m, 0, -0.1, 4, 2);
  // getHeikinAshiSignal(symbol, '1m', 3, 3, indicatorsData.haCandle.ha1mCandle);

  // getForceIndexSignal(symbol, '1m', 13, indicatorsData.efi1m);
  // getObvSignal(symbol, '30m', indicatorsData.obv30m, 10, 10);
  // getObvSignal(symbol, '1m', indicatorsData.obv1m, 10, 10);
  // getObvSignal(symbol, '5m', indicatorsData.obv5m, 10, 10);
  // getObvSignal(symbol, '1h', indicatorsData.obv1h, 6, 6);
  // getObvSignal(symbol, '15m', indicatorsData.obv15m, 6, 6);
  // getCCISignal(symbol, '5m', indicatorsData.cci.cci5m);

  // getDMISignal(symbol, '1m', 1, indicatorsData.dmi1m, 1, 0, 0, true);
  // getCCISignal(symbol, '15m', indicatorsData.cci.cci15m);
  // getDMISignal(symbol, '1h', indicatorsData.dmi1h, 1, 0, 0);
  // getObvSignal(symbol, '1m', indicatorsData.obv1m, 30, 30);

  // const calculateAvgObv = (symbol, timeframe, dst) => {
  //   getObvStream({
  //     symbol: symbol,
  //     interval: timeframe,
  //   })
  //     .pipe(bufferCount(5, 5))
  //     .subscribe(obv => {
  //       console.log(obv);
  //       if (obv) {
  //         if (!dst.prevObvAv) {
  //           dst.prevObvAv = getAvarage(obv);
  //           return;
  //         }
  //         const obvAv = getAvarage(obv);
  //         if (dst.prevObvAv > obvAv) {
  //           dst.buySignalCount = 0;
  //           dst.sellSignalCount++;
  //         } else if (dst.prevObvAv < obvAv) {
  //           dst.sellSignalCount = 0;
  //           dst.buySignalCount++;
  //         } else if (dst.prevObvAv === obvAv) {
  //         }
  //
  //         // if (dst.buySignalCount >= buySignalCount) dst.signal = 'buy';
  //         // else if (dst.sellSignalCount >= sellSignalCount) dst.signal = 'sell';
  //
  //         dst.prevObvAv = obvAv;
  //       }
  //     });
  // };
  // calculateAvgObv(symbol, '5m', indicatorsData.obvAv5m);
  // calculateAvgObv(symbol, '1m', indicatorsData.obvAv1m);

  const calculateEMADiff = (symbol, interval, period, indicatorsData) => {
    getEmaStream({
      symbol: symbol,
      interval: interval,
      period: period,
    })
      .pipe(bufferCount(1, 1))
      .subscribe(values => {
        console.log(values);
        if (!indicatorsData.emaAv) {
          indicatorsData.emaAv = getAvarage(values);
          return;
        }
        const currentEmaAv = getAvarage(values);
        if ((currentEmaAv / indicatorsData.emaAv) * 100 - 100 > 0) {
          indicatorsData.emaUpCount++;
          indicatorsData.emaDownCount = 0;
        }
        if ((currentEmaAv / indicatorsData.emaAv) * 100 - 100 < 0) {
          indicatorsData.emaDownCount++;
          indicatorsData.emaUpCount = 0;
        }
        // console.log(
        //   indicatorsData.emaSignal,
        //   (currentEmaAv / indicatorsData.emaAv) * 100 - 100,
        // );
        if (indicatorsData.emaUpCount >= 3) indicatorsData.emaSignal = 'buy';
        else if (indicatorsData.emaDownCount >= 3)
          indicatorsData.emaSignal = 'sell';
        indicatorsData.emaAv = currentEmaAv;
      });
  };
  // calculateEMADiff(symbol, '1m', 99, indicatorsData.ema.ema1m.slow);
  // setInterval(
  //   src => {
  //     if (!src.prevAdx) {
  //       src.prevAdx = src.adx;
  //       return;
  //     }
  //     const currentAdx = src.adx;
  //     if (currentAdx > src.prevAdx) {
  //       src.buySignalCount++;
  //       src.sellSignalCount = 0;
  //     } else if (currentAdx < src.prevAdx) {
  //       src.sellSignalCount++;
  //       src.buySignalCount = 0;
  //     }
  //     src.prevAdx = currentAdx;
  //   },
  //   1000,
  //   indicatorsData.dmi5m,
  // );
  // setInterval(
  //   src => {
  //     if (!src.prevAdx) {
  //       src.prevAdx = src.adx;
  //       return;
  //     }
  //     const currentAdx = src.adx;
  //     if (currentAdx > src.prevAdx) {
  //       src.buySignalCount++;
  //       src.sellSignalCount = 0;
  //     } else if (currentAdx < src.prevAdx) {
  //       src.sellSignalCount++;
  //       src.buySignalCount = 0;
  //     }
  //     src.prevAdx = currentAdx;
  //   },
  //   60000,
  //   indicatorsData.dmi1h,
  // );
  // setInterval(
  //   src => {
  //     if (!src.prevAdx) {
  //       src.prevAdx = src.adx;
  //       return;
  //     }
  //     const currentAdx = src.adx;
  //     if (currentAdx > src.prevAdx) {
  //       src.buySignalCount++;
  //       src.sellSignalCount = 0;
  //     } else if (currentAdx < src.prevAdx) {
  //       src.sellSignalCount++;
  //       src.buySignalCount = 0;
  //     }
  //     src.prevAdx = currentAdx;
  //   },
  //   1000,
  //   indicatorsData.dmi1h,
  // );

  // getMACDStream({
  //   symbol: symbol,
  //   interval: '1m',
  // }).subscribe(macd => {
  //   indicatorsData.macd.macd5m.histogram = macd.histogram;
  // });
  //
  // setInterval(() => {
  //   if (!indicatorsData.macd.macd5m.prevHistogram) {
  //     indicatorsData.macd.macd5m.prevHistogram =
  //       indicatorsData.macd.macd5m.histogram;
  //     return;
  //   }
  //   if (
  //     indicatorsData.macd.macd5m.prevHistogram >
  //     indicatorsData.macd.macd5m.histogram
  //   ) {
  //     indicatorsData.macd.macd5m.sellSignalCount++;
  //     indicatorsData.macd.macd5m.buySignalCount = 0;
  //   } else if (
  //     indicatorsData.macd.macd5m.prevHistogram <
  //     indicatorsData.macd.macd5m.histogram
  //   ) {
  //     indicatorsData.macd.macd5m.buySignalCount++;
  //     indicatorsData.macd.macd5m.sellSignalCount = 0;
  //   }
  //   indicatorsData.macd.macd5m.prevHistogram =
  //     indicatorsData.macd.macd5m.histogram;
  // }, 10000);

  // getMACDStream({
  //   symbol: symbol,
  //   interval: '5m',
  // }).subscribe(macd => {
  //   indicatorsData.macd.macd5m.histogram = macd.histogram;
  // });

  // setInterval(() => {
  //   if (!indicatorsData.macd.macd5m.prevHistogram) {
  //     indicatorsData.macd.macd5m.prevHistogram =
  //       indicatorsData.macd.macd5m.histogram;
  //     return;
  //   }
  //   if (
  //     indicatorsData.macd.macd5m.prevHistogram >
  //     indicatorsData.macd.macd5m.histogram
  //   ) {
  //     indicatorsData.macd.macd5m.sellSignalCount++;
  //     indicatorsData.macd.macd5m.buySignalCount = 0;
  //   } else if (
  //     indicatorsData.macd.macd5m.prevHistogram <
  //     indicatorsData.macd.macd5m.histogram
  //   ) {
  //     indicatorsData.macd.macd5m.buySignalCount++;
  //     indicatorsData.macd.macd5m.sellSignalCount = 0;
  //   }
  //   indicatorsData.macd.macd5m.prevHistogram =
  //     indicatorsData.macd.macd5m.histogram;
  // }, 1000);

  // setInterval(() => {
  //   if (!indicatorsData.obv1h.prevTimerObv) {
  //     indicatorsData.obv1h.prevTimerObv = indicatorsData.obv1h.obv;
  //     return;
  //   }
  //   indicatorsData.obv1h.obvDiff =
  //     (indicatorsData.obv1h.obv / indicatorsData.obv1h.prevTimerObv) * 100 -
  //     100;
  //   indicatorsData.obv1h.prevTimerObv = indicatorsData.obv1h.obv;
  // }, 60000);

  // getEmaStream({
  //   symbol: symbol,
  //   interval: '1m',
  //   period: 7,
  // }).subscribe(fastEMA => {
  //   indicatorsData.ema.ema1m.fast.ema = fastEMA;
  // });
  // getEmaStream({
  //   symbol: symbol,
  //   interval: '1m',
  //   period: 25,
  // }).subscribe(middleEMA => {
  //   indicatorsData.ema.ema1m.middle.ema = middleEMA;
  // });
  // getEmaStream({
  //   symbol: symbol,
  //   interval: '1m',
  //   period: 99,
  // }).subscribe(slowEMA => {
  //   indicatorsData.ema.ema1m.slow.emaAv = slowEMA;
  // });

  // setInterval(() => {
  //   if (
  //     !indicatorsData.ema.ema1m.slow.prevEMA &&
  //     indicatorsData.ema.ema1m.slow.ema
  //   ) {
  //     indicatorsData.ema.ema1m.slow.prevEMA = indicatorsData.ema.ema1m.slow.ema;
  //     return;
  //   }
  //   if (!indicatorsData.ema.ema1m.slow.ema) return;
  //
  //   const currentEma = indicatorsData.ema.ema1m.slow.ema;
  //
  //   if (currentEma > indicatorsData.ema.ema1m.slow.prevEMA) {
  //     indicatorsData.ema.ema1m.slow.emaUpCount++;
  //     indicatorsData.ema.ema1m.slow.emaDownCount = 0;
  //   }ct
  //   if (currentEma < indicatorsData.ema.ema1m.slow.prevEMA) {
  //     indicatorsData.ema.ema1m.slow.emaDownCount++;
  //     indicatorsData.ema.ema1m.slow.emaUpCount = 0;
  //   }
  //
  //   if (indicatorsData.ema.ema1m.slow.emaUpCount >= 1)
  //     indicatorsData.ema.ema1m.slow.emaSignal = 'buy';
  //   else if (indicatorsData.ema.ema1m.slow.emaDownCount >= 1)
  //     indicatorsData.ema.ema1m.slow.emaSignal = 'sell';
  //
  //   indicatorsData.ema.ema1m.slow.prevEMA = currentEma;
  //
  //   // if (
  //   //   !indicatorsData.ema.ema1m.fast.prevEMA &&
  //   //   indicatorsData.ema.ema1m.fast.ema
  //   // ) {
  //   //   indicatorsData.ema.ema1m.fast.prevEMA = indicatorsData.ema.ema1m.fast.ema;
  //   //   return;
  //   // }
  //   // if (!indicatorsData.ema.ema1m.fast.ema) return;
  //   //
  //   // const currentEmaFast = indicatorsData.ema.ema1m.fast.ema;
  //   //
  //   // if (currentEmaFast > indicatorsData.ema.ema1m.fast.prevEMA) {
  //   //   indicatorsData.ema.ema1m.fast.emaUpCount++;
  //   //   indicatorsData.ema.ema1m.fast.emaDownCount = 0;
  //   // }
  //   // if (currentEmaFast < indicatorsData.ema.ema1m.fast.prevEMA) {
  //   //   indicatorsData.ema.ema1m.fast.emaDownCount++;
  //   //   indicatorsData.ema.ema1m.fast.emaUpCount = 0;
  //   // }
  //
  //   // if (indicatorsData.ema.ema1m.fast.emaUpCount >= 1)
  //   //   indicatorsData.ema.ema1m.fast.emaSignal = 'buy';
  //   // else if (indicatorsData.ema.ema1m.fast.emaDownCount >= 1)
  //   //   indicatorsData.ema.ema1m.fast.emaSignal = 'sell';
  //
  //   // indicatorsData.ema.ema1m.fast.prevEMA = currentEmaFast;
  //
  //   // if (
  //   //   !indicatorsData.ema.ema1m.middle.prevEMA &&
  //   //   indicatorsData.ema.ema1m.middle.ema
  //   // ) {
  //   //   indicatorsData.ema.ema1m.middle.prevEMA =
  //   //     indicatorsData.ema.ema1m.middle.ema;
  //   //   return;
  //   // }
  //   // if (!indicatorsData.ema.ema1m.middle.ema) return;
  //   //
  //   // const currentEmaMiddle = indicatorsData.ema.ema1m.middle.ema;
  //   //
  //   // if (currentEmaMiddle > indicatorsData.ema.ema1m.middle.prevEMA) {
  //   //   indicatorsData.ema.ema1m.middle.emaUpCount++;
  //   //   indicatorsData.ema.ema1m.middle.emaDownCount = 0;
  //   // }
  //   // if (currentEmaMiddle < indicatorsData.ema.ema1m.middle.prevEMA) {
  //   //   indicatorsData.ema.ema1m.middle.emaDownCount++;
  //   //   indicatorsData.ema.ema1m.middle.emaUpCount = 0;
  //   // }
  //   //
  //   // // if (indicatorsData.ema.ema1m.fast.emaUpCount >= 1)
  //   // //   indicatorsData.ema.ema1m.fast.emaSignal = 'buy';
  //   // // else if (indicatorsData.ema.ema1m.fast.emaDownCount >= 1)
  //   // //   indicatorsData.ema.ema1m.fast.emaSignal = 'sell';
  //   //
  //   // indicatorsData.ema.ema1m.middle.prevEMA = currentEmaMiddle;
  // }, 5000);

  // getEmaStream({
  //   symbol: symbol,
  //   interval: '1m',
  //   period: 25,
  // }).subscribe(middleEMA => {
  //   indicatorsData.ema.ema1m.middle.ema = middleEMA;
  //   if (
  //     !indicatorsData.ema.ema1m.middle.prevEMA &&
  //     indicatorsData.ema.ema1m.middle.ema
  //   ) {
  //     indicatorsData.ema.ema1m.middle.prevEMA =
  //       indicatorsData.ema.ema1m.middle.ema;
  //     return;
  //   }
  //   if (!indicatorsData.ema.ema1m.middle.ema) return;
  //
  //   const currentEmaMiddle = indicatorsData.ema.ema1m.middle.ema;
  //
  //   if (currentEmaMiddle > indicatorsData.ema.ema1m.middle.prevEMA) {
  //     indicatorsData.ema.ema1m.middle.emaUpCount++;
  //     indicatorsData.ema.ema1m.middle.emaDownCount = 0;
  //   }
  //   if (currentEmaMiddle < indicatorsData.ema.ema1m.middle.prevEMA) {
  //     indicatorsData.ema.ema1m.middle.emaDownCount++;
  //     indicatorsData.ema.ema1m.middle.emaUpCount = 0;
  //   }
  //
  //   // if (indicatorsData.ema.ema1m.fast.emaUpCount >= 1)
  //   //   indicatorsData.ema.ema1m.fast.emaSignal = 'buy';
  //   // else if (indicatorsData.ema.ema1m.fast.emaDownCount >= 1)
  //   //   indicatorsData.ema.ema1m.fast.emaSignal = 'sell';
  //
  //   indicatorsData.ema.ema1m.middle.prevEMA = currentEmaMiddle;
  // });

  // getEmaStream({
  //   symbol: symbol,d
  //   interval: '1m',
  //   period: 99,
  // }).subscribe(slowEMA => {
  //   indicatorsData.ema.ema1m.slow.ema = slowEMA;
  //   if (
  //     !indicatorsData.ema.ema1m.slow.prevEMA &&
  //     indicatorsData.ema.ema1m.slow.ema
  //   ) {
  //     indicatorsData.ema.ema1m.slow.prevEMA = indicatorsData.ema.ema1m.slow.ema;
  //     return;
  //   }
  //   if (!indicatorsData.ema.ema1m.slow.ema) return;
  //
  //   const currentEma = indicatorsData.ema.ema1m.slow.ema;
  //
  //   if (currentEma > indicatorsData.ema.ema1m.slow.prevEMA) {
  //     indicatorsData.ema.ema1m.slow.emaUpCount++;
  //     indicatorsData.ema.ema1m.slow.emaDownCount = 0;
  //   }
  //   if (currentEma < indicatorsData.ema.ema1m.slow.prevEMA) {
  //     indicatorsData.ema.ema1m.slow.emaDownCount++;
  //     indicatorsData.ema.ema1m.slow.emaUpCount = 0;
  //   }
  //
  //   if (indicatorsData.ema.ema1m.slow.emaUpCount >= 1)
  //     indicatorsData.ema.ema1m.slow.emaSignal = 'buy';
  //   else if (indicatorsData.ema.ema1m.slow.emaDownCount >= 1)
  //     indicatorsData.ema.ema1m.slow.emaSignal = 'sell';
  //
  //   indicatorsData.ema.ema1m.slow.prevEMA = currentEma;
  // });

  // setInterval(() => {
  // }, 60000);

  // calculateEMADiff(symbol, '1m', 99, indicatorsData.ema.ema30m.slow);

  // getRSISignal(symbol, '15m', indicatorsData.rsi15m);
  // getRSISignal(symbol, '15m', indicatorsData.rsi15m);
  // getRSISignal(symbol, '1m', indicatorsData.rsi1m);
  // getObvSignal(symbol, '5m', indicatorsData.obv5m, 10, 10);
  // getObvSignal(symbol, '1m', indicatorsData.obv1m, 10, 10);
  // getObvSignal(symbol, '4h', indicatorsData.obv4h, 4, 4);

  // getDMISignal(symbol, '15m', indicatorsData.dmi15m, 1, 0, 0);
  // getDMISignal(symbol, '5m', indicatorsData.dmi5m, 1, 0, 0);
  // getDMISignal(symbol, '1m', indicatorsData.dmi1m, 1, 0, 0);
  // getHeikinAshiSignal(symbol, '5m', 6, 6, indicatorsData.haCandle.ha5mCandle);
  // getRSISignal(symbol, '1m', indicatorsData.rsi1m);

  // getHeikinAshiSignal(symbol, '1h', 3, 3, indicatorsData.haCandle.ha1hCandle);
  // getObvSignal(symbol, '15m', indicatorsData.obv15m, 2, 2);
  // getHeikinAshiSignal(symbol, '15m', 3, 3, indicatorsData.haCandle.ha15mCandle);
  // getHeikinAshiSignal(symbol, '5m', 3, 3, indicatorsData.haCandle.ha5mCandle);
  // getDMISignal(symbol, '5m', indicatorsData.dmi5m, 1, 0, 0);

  // getDMISignal(symbol, '1h', indicatorsData.dmi1h, 1, 0, 0);
  // getDMISignal(symbol, '1m', indicatorsData.dmi1m, 1, 0, 0);
  // getDMISignal(symbol, '15m', 2, indicatorsData.dmi5m, botState, true);
  // getRSISignal(symbol, '15m', indicatorsData.rsi1m);
  // getDMISignal(symbol, '1m', 2, indicatorsData.dmi1m, botState, true);
  // getRSISignal(symbol, '15m', indicatorsData.rsi15m);
  // getRSISignal(symbol, '1h', indicatorsData.rsi1h);
  // getRSISignal(symbol, '5m', indicatorsData.rsi5m);
  // getRSISignal(symbol, '5m', indicatorsData.rsi5m);
  // getObvSignal(symbol, '1m', indicatorsData.obv1m);
  // getObvSignal(symbol, '5m', indicatorsData.obv5m, 1, 1);
  // getObvSignal(symbol, '30m', indicatorsData.obv15m, 4, 4);
  // getObvSignal(symbol, '1h', indicatorsData.obv1h, 4, 4);
  // getObvSignal(symbol, '5m', indicatorsData.obv5m, 4, 4);
  // getHeikinAshiSignal(symbol, '1m', 3, 3, indicatorsData.haCandle);
  // getObvSignal(symbol, '5m', indicatorsData.obv5m, 2, 2);
  // getForceIndexSignal(symbol, '5m', 13, indicatorsData.efi5m);
  // getObvSignal(symbol, '1m', indicatorsData.obv1m, 4, 4);

  /** *************************DATA LOGGER********************************/
  const getSum = (numbers = []) =>
    numbers.reduce((sum, number) => Number(sum) + Number(number), 0);
  const fee = 0.08;
  const getVolumeByPrice = (price, from, to) => {
    return price > from && price < to;
  };

  (() => {
    setInterval(async () => {
      console.log('isPricesStreamAlive: ' + botState.isPricesStreamAlive);
      console.log('Started at: ' + startTime);
      // console.log(
      //   'Avg Price Big: ' +
      //     indicatorsData.avgPrices.avgBig.avgPrice +
      //     '( ' +
      //     indicatorsData.avgPrices.avgBig.avgPriceDiff +
      //     ' %' +
      //     ' )',
      // );
      // console.log(
      //   'Avg Price Big Diff: ' +
      //     indicatorsData.avgPrices.avgBig.avgPriceSignal +
      //     '(UP: ' +
      //     indicatorsData.avgPrices.avgBig.avgPriceUpSignalCount +
      //     ' DOWN: ' +
      //     indicatorsData.avgPrices.avgBig.avgPriceDownSignalCount +
      //     ')',
      // );
      // console.log(
      //   'Avg Price Small: ' +
      //     indicatorsData.avgPrices.avgSmall.avgPrice +
      //     '( ' +
      //     indicatorsData.avgPrices.avgSmall.avgPriceDiff +
      //     ' %' +
      //     ' )',
      // );
      // console.log(
      //   'Avg Price Small Diff: ' +
      //     indicatorsData.avgPrices.avgSmall.avgPriceSignal +
      //     '(UP: ' +
      //     indicatorsData.avgPrices.avgSmall.avgPriceUpSignalCount +
      //     ' DOWN: ' +
      //     indicatorsData.avgPrices.avgSmall.avgPriceDownSignalCount +
      //     ')',
      // );
      // calculateAvgDealPriceChange(botState, indicatorsData);
      // indicatorsData.dealType = determineDealType(indicatorsData, 4);
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
      //   'OBV Av 5m: ' +
      //     '(Buy Count: ' +
      //     indicatorsData.obvAv5m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.obvAv5m.sellSignalCount +
      //     ')',
      // );
      // console.log(
      //   'OBV 1w: ' +
      //     indicatorsData.obv1w.signal +
      //     ' ' +
      //     '(Buy Count: ' +
      //     indicatorsData.obv1w.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.obv1w.sellSignalCount +
      //     ')',
      // );
      // console.log(
      //   'OBV 1D: ' +
      //     indicatorsData.obv1d.signal +
      //     ' ' +
      //     '(Buy Count: ' +
      //     indicatorsData.obv1d.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.obv1d.sellSignalCount +
      //     ')',
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
      //   'OBV 2h: ' +
      //     indicatorsData.obv2h.signal +
      //     ' ' +
      //     '(Buy Count: ' +
      //     indicatorsData.obv2h.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.obv2h.sellSignalCount +
      //     ')',
      // );
      console.log(
        'OBV 1h: ' +
          indicatorsData.obv1h.signal +
          ' ' +
          '(Buy Count: ' +
          indicatorsData.obv1h.buySignalCount +
          ' ' +
          'Sell Count: ' +
          indicatorsData.obv1h.sellSignalCount +
          ')',
      );
      console.log(
        'OBV 30m: ' +
          indicatorsData.obv30m.signal +
          ' ' +
          '(Buy Count: ' +
          indicatorsData.obv30m.buySignalCount +
          ' ' +
          'Sell Count: ' +
          indicatorsData.obv30m.sellSignalCount +
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
      console.log(
        'ADX 1h: ' +
          'TREND: ' +
          indicatorsData.dmi1h.trend +
          ' ' +
          '(UP: ' +
          indicatorsData.dmi1h.adxBuySignalVolume +
          ' ' +
          'DOWN: ' +
          indicatorsData.dmi1h.adxSellSignalVolume +
          ' ' +
          'Current: ' +
          indicatorsData.dmi1h.adx +
          ') ' +
          'willPriceGrow: ' +
          indicatorsData.dmi1h.willPriceGrow,
      );
      console.log(
        'ADX 1m: ' +
          '(UP: ' +
          indicatorsData.dmi1m.adxBuySignalVolume +
          ' DOWN: ' +
          indicatorsData.dmi1m.adxSellSignalVolume +
          ' ' +
          'Current: ' +
          indicatorsData.dmi1m.adx,
        ')',
      );
      console.log(
        'ADX 5m: ' +
          '(UP: ' +
          indicatorsData.dmi5m.adxBuySignalVolume +
          ' DOWN: ' +
          indicatorsData.dmi5m.adxSellSignalVolume +
          ' ' +
          'Current: ' +
          indicatorsData.dmi5m.adx,
        ')',
      );
      console.log(
        'ADX 15m: ' +
          '(UP: ' +
          indicatorsData.dmi15m.adxBuySignalVolume +
          ' DOWN: ' +
          indicatorsData.dmi15m.adxSellSignalVolume +
          ' ' +
          'Current: ' +
          indicatorsData.dmi15m.adx,
        ')',
      );

      console.log('haCandle 1m: ' + indicatorsData.haCandle.ha1mCandle.signal);
      // console.log(
      //   'MFI 30m: ' +
      //     '(Buy Count: ' +
      //     indicatorsData.mfi.mfi30m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.mfi.mfi30m.sellSignalCount +
      //     ')',
      // );
      // console.log(
      //   'MFI 15m: ' +
      //     indicatorsData.mfi.mfi15m.prevMfi +
      //     '(Buy Count: ' +
      //     indicatorsData.mfi.mfi15m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.mfi.mfi15m.sellSignalCount +
      //     ')',
      // );
      // console.log(
      //   'MFI 5m: ' +
      //     '(Buy Count: ' +
      //     indicatorsData.mfi.mfi5m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.mfi.mfi5m.sellSignalCount +
      //     ')',
      // );
      // // console.log(
      // //   'MFI 52m: ' +
      // //     '(Buy Count: ' +
      // //     indicatorsData.mfi.mfi52m.buySignalCount +
      // //     ' ' +
      // //     'Sell Count: ' +
      // //     indicatorsData.mfi.mfi52m.sellSignalCount +
      // //     ')',
      // // );
      // console.log(
      //   'MFI 1m: ' +
      //     '(Buy Count: ' +
      //     indicatorsData.mfi.mfi1m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.mfi.mfi1m.sellSignalCount +
      //     ')',
      // );
      // console.log(
      //   'MFI 12m: ' +
      //     '(Buy Count: ' +
      //     indicatorsData.mfi.mfi12m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.mfi.mfi12m.sellSignalCount +
      //     ')',
      // );
      // console.log(
      //   'MFI 13m: ' +
      //     '(Buy Count: ' +
      //     indicatorsData.mfi.mfi13m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.mfi.mfi13m.sellSignalCount +
      //     ')',
      // );
      // console.log(
      //   'MFI 14m: ' +
      //     '(Buy Count: ' +
      //     indicatorsData.mfi.mfi14m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.mfi.mfi14m.sellSignalCount +
      //     ')',
      // );

      // console.log(
      //   'MFI 53m: ' +
      //     '(Buy Count: ' +
      //     indicatorsData.mfi.mfi53m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.mfi.mfi53m.sellSignalCount +
      //     ')',
      // );
      // console.log(
      //   'MFI 54m: ' +
      //     '(Buy Count: ' +
      //     indicatorsData.mfi.mfi54m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.mfi.mfi54m.sellSignalCount +
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
      //   'MFI 14m: ' +
      //     '(Buy Count: ' +
      //     indicatorsData.mfi.mfi14m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.mfi.mfi14m.sellSignalCount +
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
      //   'OBV 5m: ' +
      //     indicatorsData.obv5m.signal +
      //     ' ' +
      //     '(Buy Count: ' +
      //     indicatorsData.obv5m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.obv5m.sellSignalCount +
      //     ')',
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
      //     ')',
      // );
      // console.log(
      //   'ATR 1m: ' +
      //     indicatorsData.atr.atr1m.prevAtr +
      //     ' ' +
      //     '(Buy Count: ' +
      //     indicatorsData.atr.atr1m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.atr.atr1m.sellSignalCount +
      //     ')',
      // );

      // // console.log('CRSI 15m: ' + indicatorsData.crsi.crsi15m.crsi);

      // console.log(
      //   'STOCH 15m ' + JSON.stringify(indicatorsData.stochRsi.stoch15m.data),
      // );
      // console.log('CCI 15m ' + indicatorsData.cci.cci15m.cci);

      // console.log(
      //   'OBV 1m: ' +
      //     indicatorsData.obv1m.signal +
      //     ' ' +
      //     '(Buy Count: ' +
      //     indicatorsData.obv1m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.obv1m.sellSignalCount +
      //     ')',
      // );
      // console.log('RSI 1m: ' + indicatorsData.rsi1m.rsiValue);
      // console.log('RSI 5m: ' + indicatorsData.rsi5m.rsiValue);
      // console.log(
      //   'ROC 15m: ' +
      //     indicatorsData.roc.roc15m.prevValue +
      //     ' (Buy Count: ' +
      //     indicatorsData.roc.roc15m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.roc.roc15m.sellSignalCount +
      //     ')',
      // );
      // console.log(
      //   'ROC 5m: ' +
      //     indicatorsData.roc.roc5m.prevValue +
      //     ' (Buy Count: ' +
      //     indicatorsData.roc.roc5m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.roc.roc5m.sellSignalCount +
      //     ')',
      // );
      //
      // console.log(
      //   'ROC 5m: ' +
      //     '(Buy Count: ' +
      //     indicatorsData.roc.roc5m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.roc.roc5m.sellSignalCount +
      //     ')',
      // );
      // console.log(
      //   'ROC 1m: ' +
      //     '(Buy Count: ' +
      //     indicatorsData.roc.roc1m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.roc.roc1m.sellSignalCount +
      //     ')',
      // );

      // console.log('CRSI 15m: ' + indicatorsData.crsi.crsi15m.crsi);
      // console.log('CRSI 5m: ' + indicatorsData.crsi.crsi5m.crsi);
      // console.log('CRSI 1m: ' + indicatorsData.crsi.crsi1m.crsi);

      // console.log('CCI 5m: ' + indicatorsData.cci.cci5m.cci);
      // console.log(
      //   'OBV DIFF: ' +
      //     indicatorsData.obv1h.obvDiff +
      //     ' ' +
      //     '( ' +
      //     indicatorsData.obv1h.obv +
      //     ', ' +
      //     indicatorsData.obv1h.prevTimerObv +
      //     ')',
      // );
      // console.log('CCI 1m: ' + indicatorsData.cci.cci1m.cci);

      // console.log(
      //   'MACD 5m: ' +
      //     '(Buy Count: ' +
      //     indicatorsData.macd.macd5m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.macd.macd5m.sellSignalCount +
      //     ')',
      // );

      // console.log(
      //   'OBV Av 1m: ' +
      //     '(Buy Count: ' +
      //     indicatorsData.obvAv1m.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.obvAv1m.sellSignalCount +
      //     ')',
      // );

      //       console.log(
      //         'OBV 30m: ' +
      //           indicatorsData.obv30m.signal +
      //           ' ' +
      //           '(Buy Count: ' +
      //           indicatorsData.obv30m.buySignalCount +
      //           ' ' +
      //           'Sell Count: ' +
      //           indicatorsData.obv30m.sellSignalCount +
      //           ')',
      //       );

      // console.log(
      //   'EMA 99: ' +
      //     indicatorsData.ema.ema1m.slow.emaSignal +
      //     ' ' +
      //     '(UpCount: ' +
      //     indicatorsData.ema.ema1m.slow.emaUpCount +
      //     ' ' +
      //     'DownCount: ' +
      //     indicatorsData.ema.ema1m.slow.emaDownCount +
      //     ')',
      // );
      // console.log(
      //   'EMA 25: ' +
      //     indicatorsData.ema.ema1m.middle.emaSignal +
      //     ' ' +
      //     '(UpCount: ' +
      //     indicatorsData.ema.ema1m.middle.emaUpCount +
      //     ' ' +
      //     'DownCount: ' +
      //     indicatorsData.ema.ema1m.middle.emaDownCount +
      //     ')',
      // );
      // console.log(
      //   'EMA 7: ' +
      //     indicatorsData.ema.ema1m.fast.emaSignal +
      //     ' ' +
      //     '(UpCount: ' +
      //     indicatorsData.ema.ema1m.fast.emaUpCount +
      //     ' ' +
      //     'DownCount: ' +
      //     indicatorsData.ema.ema1m.fast.emaDownCount +
      //     ')',
      // );

      // console.log('RSI 15m: ' + indicatorsData.rsi15m.rsiValue);
      // console.log('RSI 5m: ' + indicatorsData.rsi5m.rsiValue);
      // console.log('RSI 1m: ' + indicatorsData.rsi1m.rsiValue);
      console.log('Deal Type: ' + botState.dealType.toUpperCase());
      console.log('Total Long Profit: ' + botState.totalLongProfit + ' %');
      console.log('Total Short Profit: ' + botState.totalShortProfit + ' %');
      // console.log('Avg Ask Bid Diff: ' + indicatorsData.prevAvgAskBidDiff);
      // console.log('Bids ask diff: ' + indicatorsData.scalper.bidsAsksDiff);
      // console.log('Last bid: ' + indicatorsData.scalper.lastBid);
      // console.log(
      //   'Candle HA 15m: ' +
      //     '(Buy: ' +
      //     indicatorsData.haCandle.ha15mCandle.buySignalCount +
      //     ' : ' +
      //     'Sell: ' +
      //     indicatorsData.haCandle.ha15mCandle.sellSignalCount +
      //     ')',
      //   // 'Shadow: ' +
      //   // indicatorsData.haCandle.ha5mCandle.shadowSignal,
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
      // //     ' ' +
      //     '(Buy Count: ' +
      //     indicatorsData.obv4h.buySignalCount +
      //     ' ' +
      //     'Sell Count: ' +
      //     indicatorsData.obv4h.sellSignalCount +
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
      //     ' (UP: ' +
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

      if (botState.status === 'sell') {
        // console.log(
        //   'Avg Deal Price: ' +
        //     botState.avgDealPrice +
        //     '( ' +
        //     indicatorsData.avgDealPriceDiff +
        //     ' %' +
        //     ' )',
        // );
        // console.log(
        //   'Avg Deal Price Diff: ' +
        //     indicatorsData.avgDealPriceSignal +
        //     '(UP: ' +
        //     indicatorsData.avgDealPriceUpSignalCount +
        //     ' DOWN: ' +
        //     indicatorsData.avgDealPriceDownSignalCount +
        //     ')',
        // );

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
      ) {
        console.log(`WARNING (LOCAL) !!! TRENDS CATCHER
            Prices stream is DEAD!!! Be ready to restart the bot!
      `);
        await sendToRecipients(`WARNING (LOCAL) !!! TRENDS CATCHER
            Prices stream is DEAD!!! Be ready to restart the bot!
      `);
      }
    }, 500);
  })();

  // (() => {
  //   binance.websockets.depthCache(
  //     ['LINKUSDT'],
  //     _throttle((symbol, depth) => {
  //       const bids = binance.sortBids(depth.bids);
  //       const asks = binance.sortAsks(depth.asks);
  //       const shortBids = binance.array(bids).slice(0, 100);
  //       const shortAsks = binance.array(asks).slice(0, 100);
  //       const bestAsk = binance.first(asks);
  //       const bestBid = binance.first(bids);
  //       const highPriceLevel = binance.array(asks).slice(0, 100)[99][0];
  //       const maxBidSize = _maxBy(shortBids, arrItem => arrItem[1]);
  //       indicatorsData.scalper.maxBidSize = maxBidSize[1];
  //       const maxAskSize = _maxBy(shortAsks, arrItem => arrItem[1]);
  //       indicatorsData.scalper.maxAskSize = maxAskSize[1];
  //       const lastBid = shortBids[29][0];
  //       const lastAsk = shortAsks[29][0];
  //       const bidsSum = getSum(shortBids.map(arr => arr[1]));
  //       const asksSum = getSum(shortAsks.map(arr => arr[1]));
  //       const filteredAsks = shortAsks.filter(item => {
  //         const price = item[0];
  //         return getVolumeByPrice(
  //           price,
  //           botState.currentPrice,
  //           botState.currentPrice * 1.002,
  //         );
  //       });
  //       const filteredAsksByBuyPrice = shortAsks.filter(item => {
  //         const price = item[0];
  //         return getVolumeByPrice(
  //           price,
  //           botState.buyPrice,
  //           botState.buyPrice * 1.002,
  //         );
  //       });
  //       const filteredBids = shortBids.filter(item => {
  //         const price = item[0];
  //         return getVolumeByPrice(
  //           price,
  //           botState.currentPrice * 0.998,
  //           botState.currentPrice,
  //         );
  //       });
  //       const filteredBidsByBuyPrice = shortBids.filter(item => {
  //         const price = item[0];
  //         return getVolumeByPrice(
  //           price,
  //           botState.buyPrice * 0.998,
  //           botState.buyPrice,
  //         );
  //       });
  //       const sellVolume = getSum(filteredAsks.map(arr => arr[1]));
  //       indicatorsData.scalper.sellVolume = sellVolume;
  //       const buyVolume = getSum(filteredBids.map(arr => arr[1]));
  //       indicatorsData.scalper.buyVolume = buyVolume;
  //       if (botState.buyPrice) {
  //         console.log('Buy Price: ' + botState.buyPrice);
  //         console.log('Deal Type: ' + botState.dealType);
  //         console.log('Sell volume: ' + botState.sellVolume);
  //         console.log('Buy volume: ' + botState.buyVolume);
  //         console.log('****SELL****');
  //         console.log(
  //           'Highest price: ' +
  //             filteredAsksByBuyPrice[filteredAsksByBuyPrice.length - 1][0],
  //         );
  //         console.log('Lowest price: ' + filteredAsksByBuyPrice[0][0]);
  //         console.log(
  //           'Volume: ' + getSum(filteredAsksByBuyPrice.map(arr => arr[1])),
  //         );
  //         // console.log('Max BID: ' + maxBidSize);
  //         // console.log('Max ASK: ' + maxAskSize);
  //         console.log('****BUY****');
  //         console.log('Highest price: ' + filteredBidsByBuyPrice[0][0]);
  //         console.log(
  //           'Lowest price: ' +
  //             filteredBidsByBuyPrice[filteredBidsByBuyPrice.length - 1][0],
  //         );
  //         console.log(
  //           'Volume: ' + getSum(filteredBidsByBuyPrice.map(arr => arr[1])),
  //         );
  //       }
  //       // console.log('Max BID: ' + maxBidSize);
  //       // console.log('Max ASK: ' + maxAskSize);
  //       // const bidsSum = getSum(shortBids.map(arr => arr[1]));
  //       // const asksSum = getSum(shortAsks.map(arr => arr[1]));
  //       // console.log((bidsSum / asksSum) * 100 - 100);
  //
  //       // console.log('bids', shortBids);
  //       // console.log('asks', shortAsks);
  //       // console.info('best bid: ' + binance.first(bids));
  //       // console.info('best ask: ' + binance.first(asks));
  //       // console.info('last bid: ' + shortBids[4][0]);
  //       // console.info('last ask: ' + shortAsks[99][0]);
  //
  //       indicatorsData.scalper.bidsAsksDiff = (bidsSum / asksSum) * 100 - 100;
  //       // console.log(
  //       //   'Ask size / Bid size: (LONG) ' +
  //       //     Number((asksSum / bidsSum) * 100 - 100).toString() +
  //       //     '%',
  //       // );
  //       // console.log(
  //       //   'Ask size / Bid size: (SHORT) ' +
  //       //     Number(
  //       //       (getSum(
  //       //         binance
  //       //           .array(asks)
  //       //           .slice(0, 5)
  //       //           .map(arr => arr[1]),
  //       //       ) /
  //       //         getSum(
  //       //           binance
  //       //             .array(bids)
  //       //             .slice(0, 5)
  //       //             .map(arr => arr[1]),
  //       //         )) *
  //       //         100 -
  //       //         100,
  //       //     ).toString() +
  //       //     '%',
  //       // );
  //       // console.log(
  //       //   'Best Ask / Best Bid: ' +
  //       //     Number((bestAsk / bestBid) * 100 - 100).toString() +
  //       //     '%',
  //       // );
  //       //
  //       // console.log(
  //       //   'Last Ask/ Last Bid: ' +
  //       //     Number((lastAsk / lastBid) * 100 - 100).toString(),
  //       // );
  //       // console.log('High price: ' + highPriceLevel);
  //       console.log('');
  //       //
  //       // if (
  //       //   indicatorsData.rsi5m.rsiValue !== null &&
  //       //   indicatorsData.rsi5m.rsiValue > indicatorsData.rsi5m.prevRsi
  //       // )
  //       //   indicatorsData.rsi5m.rsiSignal = 'buy';
  //       // else if (
  //       //   indicatorsData.rsi5m.rsiValue !== null &&
  //       //   indicatorsData.rsi5m.rsiValue < indicatorsData.rsi5m.prevRsi
  //       // )
  //       //   indicatorsData.rsi5m.rsiSignal = 'sell';
  //       // if (Number((lastAsk / lastBid) * 100 - 100) >= 0.6)
  //       //   indicatorsData.scalper.askBidSignal = 'buy';
  //       // else if (Number((lastAsk / lastBid) * 100 - 100) <= 0.3)
  //       //   indicatorsData.scalper.askBidSignal = 'sell';
  //
  //       // console.log('Stoch 15m: ' + indicatorsData.stochRsi.stoch15m.signal);
  //       // console.log('Stoch 5m: ' + indicatorsData.stochRsi.stoch5m.signal);
  //       // console.log(
  //       //   'ADX 1h: ' +
  //       //     indicatorsData.dmi1h.adxDiff +
  //       //     ' ' +
  //       //     indicatorsData.dmi1h.adxDirection +
  //       //     ' ' +
  //       //     (indicatorsData.dmi1h.adxUpCount
  //       //       ? indicatorsData.dmi1h.adxUpCount
  //       //       : indicatorsData.dmi1h.adxDownCount),
  //       // );
  //       // console.log('RSI 1h: ' + indicatorsData.rsi1h.rsiValue);
  //       // console.log(
  //       //   'ADX 5m: ' +
  //       //     indicatorsData.dmi5m.adxDiff +
  //       //     ' ' +
  //       //     indicatorsData.dmi5m.adxDirection +
  //       //     ' ' +
  //       //     (indicatorsData.dmi5m.adxUpCount
  //       //       ? indicatorsData.dmi5m.adxUpCount
  //       //       : indicatorsData.dmi5m.adxDownCount),
  //       // );
  //       // console.log('RSI 5m: ' + indicatorsData.rsi5m.rsiValue);
  //       // console.log(
  //       //   'ADX 1m: ' +
  //       //     indicatorsData.dmi1m.adxDiff +
  //       //     ' ' +
  //       //     indicatorsData.dmi1m.adxDirection +
  //       //     ' ' +
  //       //     (indicatorsData.dmi1m.adxUpCount
  //       //       ? indicatorsData.dmi1m.adxUpCount
  //       //       : indicatorsData.dmi1m.adxDownCount),
  //       // );
  //       // console.log('RSI 1m: ' + indicatorsData.rsi1m.rsiValue);
  //       // // console.log(
  //       // //   'Stoch 1m: ' +
  //       // //     indicatorsData.stochRsi.stoch1m.data.k +
  //       // //     ' : ' +
  //       // //     indicatorsData.stochRsi.stoch1m.data.d,
  //       // // );
  //       // if (
  //       //   // (shortBids[1][1] / shortAsks[1][1]) * 100 - 100 >= 50 &&
  //       //   // Number((shortBids[9][1] / shortAsks[9][1]) * 100 - 100) >= 50
  //       //   // indicatorsData.scalper.maxBidSize > indicatorsData.scalper.maxAskSize &&
  //       //   (bidsSum / asksSum) * 100 - 100 >=
  //       //   300
  //       //
  //       //   // (highPriceLevel / binance.first(asks)[0]) * 100 - 100 >= 0.3
  //       //   // (lastAsk / lastBid) * 100 - 100 >= 0.3
  //       //
  //       //   // Number((lastBid / lastAsk) * 100 - 100) > -0.08
  //       // ) {
  //       //   indicatorsData.scalper.buySignalCount++;
  //       //   indicatorsData.scalper.sellSignalCount = 0;
  //       //   // if (indicatorsData.scalper.buySignalCount >= 2)
  //       //   //   indicatorsData.scalper.signal = 'buy';
  //       // } else if (
  //       //   // (highPriceLevel / binance.first(asks)[0]) * 100 - 100 < 0.3 &&
  //       //   (asksSum / bidsSum) * 100 - 100 >=
  //       //   40
  //       //   // (shortAsks[1][1] / shortBids[1][1]) * 100 - 100 >= 50 &&
  //       //   // Number((shortAsks[9][1] / shortBids[9][1]) * 100 - 100) >= 50
  //       // ) {
  //       //   // indicatorsData.scalper.maxBidSize < indicatorsData.scalper.maxAskSize &&
  //       //   // Number((lastBid / lastAsk) * 100 - 100) < -0.08
  //       //   indicatorsData.scalper.sellSignalCount++;
  //       //   indicatorsData.scalper.buySignalCount = 0;
  //       //   // if (indicatorsData.scalper.sellSignalCount >= 2)
  //       //   //   indicatorsData.scalper.signal = 'sell';
  //       // }
  //       indicatorsData.scalper.lastBid = lastBid;
  //       indicatorsData.scalper.prevAsk = lastAsk;
  //       // if (indicatorsData.askBidDiffArr.length < 20) {
  //       //   indicatorsData.askBidDiffArr.push(
  //       //     (indicatorsData.askBidDiff = Number((lastAsk / lastBid) * 100 - 100)),
  //       //   );
  //       // } else {
  //       //   const avg = getAvarage(indicatorsData.askBidDiffArr);
  //       //   indicatorsData.askBidDiffArr.length = 0;
  //       //   indicatorsData.askBidDiffArr.push(
  //       //     (indicatorsData.askBidDiff = Number((lastAsk / lastBid) * 100 - 100)),
  //       //   );
  //       // if (indicatorsData.prevAvgAskBidDiff) {
  //       //   indicatorsData.avgAskBidDiff =
  //       //     (avg / indicatorsData.prevAvgAskBidDiff) * 100 - 100;
  //       //   indicatorsData.askBidDiffArr.push(
  //       //     (indicatorsData.askBidDiff = Number((lastAsk / lastBid) * 100 - 100)),
  //       //   );
  //       // } else {
  //       //   indicatorsData.prevAvgAskBidDiff = avg;
  //       //   return;
  //       // }
  //       // indicatorsData.prevAvgAskBidDiff = avg;
  //       // }
  //     }, 500),
  //   );
  // })();
})();

process.on('unhandledRejection', async (reason: Error) => {
  console.error(reason);
  await sendToRecipients(`ERROR
    ${JSON.stringify(reason)};
    ${reason};
  `);

  process.exit(1);
});
