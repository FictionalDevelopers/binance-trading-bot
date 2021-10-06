// import { pluck, bufferCount } from 'rxjs/operators';
// import { format } from 'date-fns';
// import { connect } from './db/connection';
// import { RESOURCES } from './constants';
// import { DATE_FORMAT } from './constants/date';
// import { getTradeStream } from './api/trades.js';
// import { sendToRecipients } from './services/telegram';
// import getBalances from './api/balance';
// import { getExchangeInfo } from './api/exchangeInfo';
// import { marketSellAction, marketBuyAction, getOrdersList } from './api/order';
// import _maxBy from 'lodash/maxBy';
// import { binance } from './api/binance';
// import { getEMASignal, runEMAInterval } from './components/ema-signals';
// import getAvarage from './utils/getAverage';
// import { getEmaStream } from '../src/indicators/ema';
// import { getObvStream } from './indicators/obv';
//
// import { getRSISignal } from './components/rsi-signals';
// import { getTrixSignal, runTrixInterval } from './components/trix-signal';
// import {
//   getStochRSISignal,
//   runStochRsiInterval,
// } from './components/stochRSI-signals';
// import { getObvSignal, runObvInterval } from './components/obv-signals';
// import { service as botStateService } from './components/botState';
// import _head from 'lodash/head';
// import { getForceIndexSignal, runEFIInterval } from './components/forceIndex';
// import { getForceIndexStream } from './indicators/forceIndex';
// import { getStochRsiStream } from './indicators/stochRSI';
// import { getTrixStream } from './indicators/trix';
// import { getRocSignal } from './components/roc-signals';
// import { getRocStream } from './indicators/roc';
// import { getDMISignal } from './components/dmi-signals';
// import _throttle from 'lodash/throttle';
// import _debounce from 'lodash/debounce';
// // import { indicatorsData } from './index2';
// import readline from 'readline';
//
// (async function() {
//   await connect();
//   // await processSubscriptions();
//   const revisionNumber = 'ffa2bef39307f7d13bf20d5b92ebaafe4115b081';
//   const symbol = 'linkusdt';
//   const cryptoCoin = symbol.toUpperCase().slice(0, -4);
//   const { available: initialUSDTBalance } = await getBalances('USDT');
//   const { available: initialCryptoCoinBalance } = await getBalances(cryptoCoin);
//   const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');
//   // const openOrders = await checkAllOpenOrders(symbol.toUpperCase());
//   // const ordersList = await getOrdersList(symbol.toUpperCase());
//   // const lastOrder = ordersList[ordersList.length - 1] || null;
//   const workingDeposit = 400;
//   // const symbol = process.argv[2];
//   // let botState;
//   //
//   // try {
//   //   const response = await botStateService.getBotState();
//   //   const initialState = JSON.parse(JSON.stringify(_head(response)));
//   //
//   //   botState = {
//   //     ...initialState,
//   //     availableUSDT: initialUSDTBalance,
//   //     availableCryptoCoin: initialCryptoCoinBalance,
//   //     updateState: function(fieldName, value) {
//   //       this[`${fieldName}`] = value;
//   //     },
//   //   };
//   // } catch (e) {
//   //   await sendToRecipients(`ERROR
//   //   ${JSON.stringify(e)};
//   // `);
//   //
//   //   process.exit(1);
//   // }
//
//   const botState = {
//     actionConfirmation: true,
//     confirmation: false,
//     local: true,
//     strategies: {
//       scalper: { enabled: true, stopLoss: false },
//       upTrend: { enabled: false, stopLoss: false },
//       downTrend: { enabled: false, stopLoss: false },
//       upFlat: { enabled: false, stopLoss: false },
//       downFlat: { enabled: false, stopLoss: false },
//       stochRsi: { enabled: false, stopLoss: false },
//       trendsCatcher: { enabled: false, stopLoss: false },
//     },
//     buyReason: null,
//     enabledLimits: false,
//     sellError: false,
//     emaStartPoint: null,
//     strategy: 'MIXED STRATEGY',
//     testMode: true,
//     useProfitLevels: false,
//     useEMAStopLoss: false,
//     status: 'buy',
//     // status: 'buy',
//     profitLevels: {
//       '1': {
//         id: 1,
//         profitPercent: 1,
//         amountPercent: 0.5,
//         isFilled: false,
//       },
//       '2': {
//         id: 2,
//         profitPercent: 2,
//         amountPercent: 0.5,
//         isFilled: false,
//       },
//       '3': {
//         id: 3,
//         profitPercent: 4,
//         amountPercent: 0.5,
//         isFilled: false,
//       },
//     },
//     currentProfit: null,
//     totalProfit: null,
//     totalPercentProfit: null,
//     tradeAmountPercent: 0.95,
//     availableUSDT: initialUSDTBalance,
//     availableCryptoCoin: initialCryptoCoinBalance,
//     cummulativeQuoteQty: null,
//     buyPrice: null,
//     lastBid: null,
//     currentPrice: null,
//     order: null,
//     avrDealProfit: null,
//     dealsCount: 1,
//     startTime: new Date().getTime(),
//     workDuration: null,
//     stopLoss: null,
//     prevPrice: null,
//     updateState: function(fieldName, value) {
//       this[`${fieldName}`] = value;
//     },
//   };
//
//   const indicatorsData = {
//     scalper: {
//       askBidSignal: null,
//       tradesVolume: {
//         buySignalCount: null,
//         sellSignalCount: null,
//         signal: null,
//       },
//       bidsAsksDiff: null,
//       prevAsk: null,
//       lastAsk: null,
//       lastBid: null,
//       buySignalCount: 0,
//       sellSignalCount: 0,
//       signal: null,
//       maxBidSize: null,
//       maxAskSize: null,
//     },
//     growCount: 0,
//     fallCount: 0,
//     rocSignalBuyCount: 0,
//     rocSignalSellCount: 0,
//     roc: {
//       roc1m: {
//         value: null,
//         prevValue: null,
//         diff: null,
//         buySignalCount: 0,
//         sellSignalCount: 0,
//         signal: null,
//       },
//       roc5m: {
//         value: null,
//         prevValue: null,
//         diff: null,
//         buySignalCount: 0,
//         sellSignalCount: 0,
//         signal: null,
//       },
//     },
//     trix: {
//       trix5m: {
//         av: null,
//         prevAv: null,
//         signal: null,
//         value: null,
//         prev: null,
//       },
//     },
//     efi1m: {
//       efiBuySignalCount: 0,
//       efiSellSignalCount: 0,
//       prevEfi: null,
//       efi: null,
//       efiSignal: null,
//       av: null,
//       prevAv: null,
//     },
//     efi1h: {
//       efiBuySignalCount: 0,
//       efiSellSignalCount: 0,
//       prevEfi: null,
//       efi: null,
//       efiSignal: null,
//       av: null,
//       prevAv: null,
//     },
//     efi5m: {
//       efiBuySignalCount: 0,
//       efiSellSignalCount: 0,
//       prevEfi: null,
//       efi: null,
//       efiSignal: null,
//       av: null,
//       prevAv: null,
//     },
//     obvBuySignalCount: 0,
//     obvSellSignalCount: 0,
//     prevObv: null,
//     obv5m: {
//       signal: null,
//       buySignalCount: 0,
//       sellSignalCount: 0,
//       obv: null,
//       prevObv: null,
//       obvDiff: null,
//     },
//     obv15m: {
//       signal: null,
//       buySignalCount: 0,
//       sellSignalCount: 0,
//       obv: null,
//       prevObv: null,
//       obvDiff: null,
//     },
//     obv1m: {
//       signal: null,
//       buySignalCount: 0,
//       sellSignalCount: 0,
//       obv: null,
//       prevObv: null,
//       obvDiff: null,
//     },
//     obv: null,
//     obvSignal: null,
//     priceGrowArea: false,
//     stochRsi: {
//       stoch1m: {
//         buySignalCount: 0,
//         sellSignalCount: 0,
//         prev: null,
//         value: null,
//         signal: null,
//         av: null,
//         prevAv: null,
//         data: {},
//       },
//       stoch5m: {
//         buySignalCount: 0,
//         sellSignalCount: 0,
//         prev: null,
//         value: null,
//         signal: null,
//         av: null,
//         prevAv: null,
//         data: {},
//       },
//       stoch15m: {
//         BuySignalCount: 0,
//         SellSignalCount: 0,
//         prev: null,
//         value: null,
//         signal: null,
//         av: null,
//         prevAv: null,
//       },
//       stoch1h: null,
//     },
//     emaSignal: null,
//     dmi5m: {
//       adxUpCount: 0,
//       adxDownCount: 0,
//       adxDiff: null,
//       adxDirection: null,
//       prevDmi: null,
//       dmiMdiSignal: 0,
//       adxSignal: null,
//       mdiSignal: 0,
//       adxBuySignalVolume: 0,
//       adxSellSignalVolume: 0,
//       willPriceGrow: false,
//       trend: null,
//       signal: null,
//       buySignalCount: 0,
//       sellSignalCount: 0,
//     },
//     dmi15m: {
//       adxUpCount: 0,
//       adxDownCount: 0,
//       adxDiff: null,
//       adxDirection: null,
//       prevDmi: null,
//       dmiMdiSignal: 0,
//       adxSignal: 0,
//       mdiSignal: 0,
//       adxBuySignalVolume: 0,
//       adxSellSignalVolume: 0,
//       willPriceGrow: false,
//       trend: null,
//       signal: null,
//       buySignalCount: 0,
//       sellSignalCount: 0,
//     },
//     dmi1h: {
//       adxUpCount: 0,
//       adxDownCount: 0,
//       adxDiff: null,
//       adxDirection: null,
//       prevDmi: null,
//       dmiMdiSignal: 0,
//       adxSignal: null,
//       mdiSignal: 0,
//       adxBuySignalVolume: 0,
//       adxSellSignalVolume: 0,
//       willPriceGrow: false,
//       trend: null,
//       signal: null,
//       buySignalCount: 0,
//       sellSignalCount: 0,
//     },
//     dmi1m: {
//       adxDirection: null,
//       adxUpCount: 0,
//       adxDownCount: 0,
//       adxDiff: null,
//       prevDmi: null,
//       dmiMdiSignal: 0,
//       mdiSignal: 0,
//       adxBuySignalVolume: 0,
//       adxSellSignalVolume: 0,
//       willPriceGrow: false,
//       trend: null,
//       signal: null,
//       adxSignal: null,
//       buySignalCount: 0,
//       sellSignalCount: 0,
//     },
//     rsi1m: {
//       growCount: 0,
//       downCount: 0,
//       rsiSignal: null,
//       rsiValue: null,
//       prevRsi: null,
//       signal: null,
//     },
//     rsi1h: {
//       growCount: 0,
//       downCount: 0,
//       rsiSignal: null,
//       rsiValue: null,
//       prevRsi: null,
//       signal: null,
//     },
//     rsi5m: {
//       growCount: 0,
//       downCount: 0,
//       rsiSignal: null,
//       rsiValue: null,
//       prevRsi: null,
//       signal: null,
//     },
//     rsi15m: {
//       growCount: 0,
//       downCount: 0,
//       rsiSignal: null,
//       rsiValue: null,
//       prevRsi: null,
//       signal: null,
//     },
//     slow1mEMA: 0,
//     middle1mEMA: 0,
//     fast1mEMA: 0,
//     avFast1mEMA: 0,
//     slow5mEMA: 0,
//     middle5mEMA: 0,
//     fast5mEMA: 0,
//     slow1hEMA: 0,
//     middle1hEMA: 0,
//     fast1hEMA: 0,
//     slow15mEMA: 0,
//     middle15mEMA: 0,
//     fast15mEMA: 0,
//     summaryEMABuySignal: false,
//     rsiRebuy: {
//       value: true,
//     },
//     emaAvSignal: null,
//     emaAv: null,
//   };
//   // const trader = async pricesStream => {
//   //   const { tradeAmountPercent } = botState;
//   //   if (botState.status === 'isPending') return;
//   //   botState.updateState(
//   //     'currentPrice',
//   //     Number(pricesStream[pricesStream.length - 1]),
//   //   );
//   //   const expectedProfitPercent = botState.buyPrice
//   //     ? botState.currentPrice / botState.buyPrice > 1
//   //       ? Number((botState.currentPrice / botState.buyPrice) * 100 - 100)
//   //       : Number(-1 * (100 - (botState.currentPrice / botState.buyPrice) * 100))
//   //     : 0;
//   //
//   //   const conditions = {
//   //     upTrend: {
//   //       buy:
//   //         botState.status === 'buy' &&
//   //         Number(
//   //           (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
//   //         ) >= 0.1 &&
//   //         indicatorsData.rsi5m.rsiValue !== null &&
//   //         indicatorsData.rsi5m.rsiValue <= 67 &&
//   //         // indicatorsData.rsi5m.rsiValue >= 61 &&
//   //         indicatorsData.rsi1m.rsiValue !== null &&
//   //         indicatorsData.rsi1m.rsiValue < 68,
//   //       sell: {
//   //         takeProfit: null,
//   //         stopLoss:
//   //           botState.status === 'sell' &&
//   //           botState.buyReason === 'upTrend' &&
//   //           Number(
//   //             (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
//   //               100,
//   //           ) >= 0.05,
//   //       },
//   //     },
//   //     downTrend: {
//   //       buy:
//   //         botState.status === 'buy' &&
//   //         indicatorsData.rsi1m.rsiValue >= 62 &&
//   //         Number(
//   //           (indicatorsData.fast1mEMA / indicatorsData.middle1mEMA) * 100 - 100,
//   //         ) >= 0.1,
//   //
//   //       // indicatorsData.rsiRebuy.value &&
//   //       // indicatorsData.middle1mEMA < indicatorsData.slow1mEMA &&
//   //       // indicatorsData.rsi1m.rsiValue !== null &&
//   //       // indicatorsData.rsi1m.rsiValue >= 41 &&
//   //       // indicatorsData.rsi1m.rsiValue <= 40 &&
//   //       // indicatorsData.rsi5m.rsiValue !== null &&
//   //       // indicatorsData.rsi5m.rsiValue >= 41 &&
//   //       // indicatorsData.rsi5m.rsiValue <= 45,
//   //
//   //       sell: {
//   //         takeProfit:
//   //           botState.status === 'sell' &&
//   //           botState.buyReason === 'downTrend' &&
//   //           expectedProfitPercent >= 0.7,
//   //
//   //         // // indicatorsData.rsi1m.rsiValue >= 59 &&
//   //         // ((Number(
//   //         //   (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
//   //         //     100,
//   //         // ) >= 0.1 &&
//   //         //   expectedProfitPercent > 0.5) ||
//   //         //   expectedProfitPercent >= 0.7),
//   //         stopLoss:
//   //           botState.status === 'sell' &&
//   //           botState.buyReason === 'downTrend' &&
//   //           Number(
//   //             (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
//   //               100,
//   //           ) >= 0.1,
//   //         // indicatorsData.rsi1m.rsiValue !== null &&
//   //         // indicatorsData.rsi1m.rsiValue < 39 &&
//   //         // indicatorsData.rsi5m.rsiValue !== null &&
//   //         // indicatorsData.rsi5m.rsiValue < 39,
//   //       },
//   //     },
//   //     upFlat: {
//   //       buy:
//   //         botState.status === 'buy' &&
//   //         indicatorsData.fast5mEMA > indicatorsData.middle5mEMA &&
//   //         // indicatorsData.fast1mEMA > indicatorsData.middle1mEMA &&
//   //         // indicatorsData.emaSignal === 'buy' &&
//   //         indicatorsData.rsi1m.rsiValue <= 50 &&
//   //         indicatorsData.rsi1m.rsiValue !== null,
//   //       sell: {
//   //         takeProfit:
//   //           botState.status === 'sell' &&
//   //           botState.buyReason === 'upFlat' &&
//   //           indicatorsData.rsi1m.rsiValue >= 69 &&
//   //           expectedProfitPercent > 0,
//   //         stopLoss:
//   //           botState.status === 'sell' &&
//   //           botState.buyReason === 'upFlat' &&
//   //           Number(
//   //             (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
//   //               100,
//   //           ) >= 0.05,
//   //         // (Number(
//   //         //   (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
//   //         //     100,
//   //         // ) >= 0.1 ||
//   //       },
//   //     },
//   //     downFlat: {
//   //       buy:
//   //         botState.status === 'buy' &&
//   //         // indicatorsData.fast5mEMA < indicatorsData.middle5mEMA &&
//   //         // indicatorsData.emaSignal === 'buy' &&
//   //         indicatorsData.rsi1m.rsiValue < 35 &&
//   //         indicatorsData.rsi1m.rsiValue !== null &&
//   //         indicatorsData.rsi5m.rsiValue >= 40,
//   //       sell: {
//   //         takeProfit:
//   //           botState.status === 'sell' &&
//   //           botState.buyReason === 'downFlat' &&
//   //           indicatorsData.rsi1m.rsiValue >= 59 &&
//   //           expectedProfitPercent > 0,
//   //         stopLoss:
//   //           botState.status === 'sell' &&
//   //           botState.buyReason === 'downFlat' &&
//   //           indicatorsData.rsi5m.rsiValue !== null &&
//   //           indicatorsData.rsi5m.rsiValue < 39,
//   //       },
//   //     },
//   //     stochRsiStrategy: {
//   //       buy: botState.status === 'buy' && indicatorsData.emaSignal === 'buy',
//   //       // indicatorsData.roc.roc1m > 0.05 &&
//   //       // indicatorsData.stochRsi.stoch1m.signal === 'buy',
//   //
//   //       // indicatorsData.emaSignal === 'buy',
//   //       // ((indicatorsData.dmi5m.signal === 'BUY' &&
//   //       //   Number(
//   //       //     (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 -
//   //       //       100,
//   //       //   ) >= 0.05) ||
//   //       //   (indicatorsData.dmi5m.signal === 'SELL' &&
//   //       //     Number(
//   //       //       (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
//   //       //         100,
//   //       //     ) >= 0.05)),
//   //       // indicatorsData.dmi5m.willPriceGrow &&
//   //       // indicatorsData.dmi1m.willPriceGrow,
//   //       // && indicatorsData.emaSignal === 'buy',
//   //       // indicatorsData.stochRsi.stoch1m.signal === 'buy' &&
//   //       // indicatorsData.roc.roc1m > 0.05,
//   //       // ((indicatorsData.dmi5m.signal === 'BUY' &&
//   //       //   indicatorsData.rsi5m.rsiValue > 51) ||
//   //       //   (indicatorsData.dmi5m.signal === 'SELL' &&
//   //       //     indicatorsData.rsi5m.rsiValue !== null &&
//   //       //     indicatorsData.rsi5m.rsiValue < 49)),
//   //       // &&
//   //       // ((indicatorsData.rsi1m.rsiValue > 40 &&
//   //       //   indicatorsData.rsi1m.rsiValue !== null &&
//   //       //   indicatorsData.rsi1m.rsiValue < 45) ||
//   //       //   indicatorsData.rsi1m.rsiValue > 60),
//   //       // indicatorsData.dmi5m.adxSignal === 'buy',
//   //       // indicatorsData.dmi5m.willPriceGrow,
//   //       // ((indicatorsData.rsi1m.rsiValue > 40 &&
//   //       //   indicatorsData.rsi1m.rsiValue !== null &&
//   //       //   indicatorsData.rsi1m.rsiValue < 43) ||
//   //       //   (indicatorsData.rsi1m.rsiValue > 60 &&
//   //       //     indicatorsData.rsi1m.rsiValue !== null &&
//   //       //     indicatorsData.rsi1m.rsiValue < 63)),
//   //
//   //       // Number(
//   //       //   (indicatorsData.fast1mEMA / indicatorsData.middle1mEMA) * 100 - 100,
//   //       // ) >= 0.1 &&
//   //       // indicatorsData.trix.trix5m.signal === 'buy',
//   //       // indicatorsData.rsi1m.rsiValue !== null &&
//   //       // indicatorsData.rsi1m.rsiValue > 50 &&
//   //       // indicatorsData.rsi5m.rsiValue !== null &&
//   //       // indicatorsData.rsi5m.rsiValue < 68 &&
//   //       // indicatorsData.efi1h.efiSignal === 'buy' &&
//   //       // ((indicatorsData.efi5m.efi > 0 &&
//   //       // indicatorsData.stochRsi.stoch5m.signal === 'buy' &&
//   //       // indicatorsData.stochRsi.stoch1m.signal === 'buy',
//   //       // indicatorsData.efi.efi15m.efi > 0 &&
//   //       //   indicatorsData.stochRsiSignal.stoch1m === 'buy' &&
//   //       //   indicatorsData.dmi5m.adx > 20) ||
//   //       //   (indicatorsData.efi1m.efi > 0 &&
//   //       // indicatorsData.efi.efi5m.efi > 0,
//   //       //     indicatorsData.dmi1m.adx > 20 &&
//   //       //     indicatorsData.stochRsiSignal.stoch1m === 'buy')),
//   //       // indicatorsData.obvSignal === 'buy' &&
//   //       // indicatorsData.rsi5m.rsiValue >= 41 &&
//   //       // indicatorsData.rsi15m.rsiValue >= 41 &&
//   //       // indicatorsData.stochRsiSignal.stoch5m === 'buy' &&
//   //       // indicatorsData.stochRsiSignal.stoch1m === 'buy',
//   //       // indicatorsData.efi.efi > 0,
//   //       sell: {
//   //         takeProfit: null,
//   //         // botState.status === 'sell' && expectedProfitPercent >= 0.5,
//   //         // botState.buyReason === 'stochRsi' &&
//   //         // indicatorsData.stochRsiSignal.stoch5m === 'sell' ||
//   //         // expectedProfitPercent <= -1,
//   //
//   //         stopLoss:
//   //           botState.status === 'sell' && indicatorsData.emaSignal === 'sell',
//   //         // indicatorsData.stochRsi.stoch1m.signal === 'sell',
//   //         // indicatorsData.emaSignal === 'sell',
//   //         // ((indicatorsData.dmi5m.signal === 'SELL' &&
//   //         //   Number(
//   //         //     (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 -
//   //         //       100,
//   //         //   ) >= 0.05) ||
//   //         //   (indicatorsData.dmi5m.signal === 'BUY' &&
//   //         //     Number(
//   //         //       (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) *
//   //         //         100 -
//   //         //         100,
//   //         //     ) >= 0.05) ||
//   //         //   indicatorsData.roc.roc1m < -0.1),
//   //         // indicatorsData.stochRsi.stoch1m.signal === 'sell',
//   //         // indicatorsData.roc.roc1m < -0.1,
//   //         // ((indicatorsData.dmi5m.signal === 'SELL' &&
//   //         //   indicatorsData.rsi5m.rsiValue > 51) ||
//   //         //   (indicatorsData.dmi5m.signal === 'BUY' &&
//   //         //     indicatorsData.rsi5m.rsiValue !== null &&
//   //         //     indicatorsData.rsi5m.rsiValue < 49)),
//   //         // ||
//   //         // (indicatorsData.rsi1m.rsiValue < 40 &&
//   //         //   indicatorsData.rsi1m.rsiValue !== null) ||
//   //         // (indicatorsData.rsi1m.rsiValue !== null &&
//   //         //   indicatorsData.rsi1m.rsiValue < 60 &&
//   //         //   indicatorsData.rsi1m.rsiValue > 58)
//   //         // !indicatorsData.dmi1m.willPriceGrow,
//   //         // indicatorsData.emaSignal === 'sell',
//   //         // indicatorsData.stochRsi.stoch5m.signal === 'sell',
//   //         // indicatorsData.dmi5m.signal === 'SELL',
//   //         // indicatorsData.dmi5m.adxSignal === 'sell',
//   //
//   //         // !indicatorsData.dmi5m.willPriceGrow,
//   //
//   //         // botState.buyReason === 'stochRsi' &&
//   //         // indicatorsData.rsi1m.rsiValue < 40,
//   //
//   //         // indicatorsData.trix.trix5m.signal === 'sell',
//   //         // ((indicatorsData.stochRsi.stoch5m.signal === 'sell' &&
//   //         //   indicatorsData.stochRsi.stoch15m.signal === 'sell') ||
//   //         //   (Number(
//   //         //     (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
//   //         //       100,
//   //         //   ) >= 0.1 &&
//   //         //     expectedProfitPercent < 0)),
//   //         // indicatorsData.efi1h.efiSignal === 'sell',
//   //
//   //         // indicatorsData.obvSignal === 'sell',
//   //         // indicatorsData.stochRsiSignal.stoch15m === 'sell',
//   //         //   expectedProfitPercent >= 1),
//   //
//   //         // ((indicatorsData.stochRsiSignal.stoch5m === 'sell' &&
//   //         //   !indicatorsData.priceGrowArea) ||
//   //         //   (indicatorsData.priceGrowArea &&
//   //         //     Number(
//   //         //       (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) *
//   //         //         100 -
//   //         //         100,
//   //         //     ) >= 0.5)),
//   //
//   //         // (indicatorsData.rsi5m.rsiValue !== null &&
//   //         //   indicatorsData.rsi5m.rsiValue < 39)),)
//   //       },
//   //     },
//   //     trendsCatcher: {
//   //       buy:
//   //         botState.status === 'buy' && indicatorsData.dmi15m.signal === 'BUY',
//   //       // indicatorsData.dmi1h.willPriceGrow &&
//   //       // Number(
//   //       //   (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
//   //       // ) >= 0.1,
//   //       sell: {
//   //         takeProfit:
//   //           expectedProfitPercent >= 1 &&
//   //           botState.buyReason === 'trendsCatcher',
//   //         stopLoss:
//   //           botState.status === 'sell' &&
//   //           indicatorsData.dmi15m.signal === 'SELL' &&
//   //           botState.buyReason === 'trendsCatcher',
//   //         // (Number(
//   //         //   (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
//   //         //     100,
//   //         // ) >= 0.5 ||
//   //         //   !indicatorsData.dmi1h.willPriceGrow),
//   //       },
//   //     },
//   //   };
//   //
//   //   /** ******************************************BUY ACTIONS********************************************************/
//   //
//   //   /** *********************UP TREND***********************/
//   //   if (botState.strategies.upTrend.enabled) {
//   //     if (conditions.upTrend.buy) {
//   //       await marketBuyAction(
//   //         false,
//   //         symbol,
//   //         botState,
//   //         cryptoCoin,
//   //         pricesStream,
//   //         stepSize,
//   //         'TRENDS CATCHER',
//   //         workingDeposit,
//   //         'RESISTANCE LEVEL',
//   //       );
//   //       botState.buyReason = 'upTrend';
//   //       return;
//   //     }
//   //   }
//   //
//   //   /** *********************DOWN TREND***********************/
//   //
//   //   if (botState.strategies.downTrend.enabled) {
//   //     if (conditions.downTrend.buy) {
//   //       await marketBuyAction(
//   //         false,
//   //         symbol,
//   //         botState,
//   //         cryptoCoin,
//   //         pricesStream,
//   //         stepSize,
//   //         'WAVES CATCHER',
//   //         workingDeposit,
//   //         'DOWN TREND CORRECTION LEVEL',
//   //       );
//   //       botState.buyReason = 'downTrend';
//   //       indicatorsData.rsiRebuy.value = false;
//   //       return;
//   //     }
//   //   }
//   //
//   //   /** *********************UP FLAT***********************/
//   //
//   //   if (botState.strategies.upFlat.enabled) {
//   //     if (conditions.upFlat.buy) {
//   //       await marketBuyAction(
//   //         false,
//   //         symbol,
//   //         botState,
//   //         cryptoCoin,
//   //         pricesStream,
//   //         stepSize,
//   //         'WAVES CATCHER',
//   //         workingDeposit,
//   //         'UP FLAT ',
//   //       );
//   //       botState.buyReason = 'upFlat';
//   //       return;
//   //     }
//   //   }
//   //
//   //   /** *********************DOWN FLAT***********************/
//   //
//   //   if (botState.strategies.downFlat.enabled) {
//   //     if (conditions.downFlat.buy) {
//   //       await marketBuyAction(
//   //         false,
//   //         symbol,
//   //         botState,
//   //         cryptoCoin,
//   //         pricesStream,
//   //         stepSize,
//   //         'WAVES CATCHER',
//   //         workingDeposit,
//   //         'DOWN FLAT',
//   //       );
//   //       botState.buyReason = 'downFlat';
//   //       return;
//   //     }
//   //   }
//   //
//   //   /** *********************StochRSI Strategy***********************/
//   //
//   //   if (botState.strategies.stochRsi.enabled) {
//   //     if (conditions.stochRsiStrategy.buy) {
//   //       await marketBuyAction(
//   //         false,
//   //         symbol,
//   //         botState,
//   //         cryptoCoin,
//   //         pricesStream,
//   //         stepSize,
//   //         'STOCH RSI',
//   //         workingDeposit,
//   //         'STOCH RSI SIGNAL',
//   //       );
//   //       botState.buyReason = 'stochRsi';
//   //       indicatorsData.obvBuySignalCount = 0;
//   //       return;
//   //     }
//   //   }
//   //
//   //   /** ******************** TRENDS CATHCER ***********************/
//   //
//   //   if (botState.strategies.trendsCatcher.enabled) {
//   //     if (conditions.trendsCatcher.buy) {
//   //       await marketBuyAction(
//   //         false,
//   //         symbol,
//   //         botState,
//   //         cryptoCoin,
//   //         pricesStream,
//   //         stepSize,
//   //         'TRENDS CATCHER',
//   //         workingDeposit,
//   //         'ADX SIGNAL',
//   //       );
//   //       botState.buyReason = 'trendsCatcher';
//   //       return;
//   //     }
//   //   }
//   //
//   //   /** *****************************************SELL ACTIONS********************************************************/
//   //
//   //   /** *********************UP TREND***********************/
//   //
//   //   if (conditions.upTrend.sell.stopLoss) {
//   //     await marketSellAction(
//   //       'upTrend',
//   //       false,
//   //       symbol,
//   //       botState,
//   //       cryptoCoin,
//   //       expectedProfitPercent,
//   //       pricesStream,
//   //       stepSize,
//   //       initialUSDTBalance,
//   //       'STOP LOSS OR TAKE PROFIT',
//   //       indicatorsData,
//   //     );
//   //     indicatorsData.rsiRebuy.value = true;
//   //     return;
//   //   }
//   //
//   //   /** *********************DOWN TREND***********************/
//   //
//   //   if (conditions.downTrend.sell.takeProfit) {
//   //     await marketSellAction(
//   //       'downTrend',
//   //       false,
//   //       symbol,
//   //       botState,
//   //       cryptoCoin,
//   //       expectedProfitPercent,
//   //       pricesStream,
//   //       stepSize,
//   //       initialUSDTBalance,
//   //       'DOWNTREND CORRECTION TAKE PROFIT',
//   //       indicatorsData,
//   //     );
//   //     indicatorsData.rsiRebuy.value = false;
//   //     return;
//   //   }
//   //
//   //   if (conditions.downTrend.sell.stopLoss) {
//   //     await marketSellAction(
//   //       'downTrend',
//   //       false,
//   //       symbol,
//   //       botState,
//   //       cryptoCoin,
//   //       expectedProfitPercent,
//   //       pricesStream,
//   //       stepSize,
//   //       initialUSDTBalance,
//   //       'DOWNTREND CORRECTION STOP LOSS',
//   //       indicatorsData,
//   //     );
//   //     indicatorsData.rsiRebuy.value = true;
//   //     return;
//   //   }
//   //
//   //   /** *********************UP FLAT***********************/
//   //
//   //   if (conditions.upFlat.sell.takeProfit) {
//   //     if (
//   //       false
//   //       // Number(
//   //       //   (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
//   //       // ) >= 0.1 &&
//   //       // Number(
//   //       //   (indicatorsData.fast15mEMA / indicatorsData.middle15mEMA) * 100 - 100,
//   //       // ) >= 0.1
//   //     ) {
//   //       botState.buyReason = 'upTrend';
//   //       await sendToRecipients(` INFO
//   //                    Bot was switched to the TRENDS CATCHER strategy!
//   //       `);
//   //       indicatorsData.rsiRebuy.value = true;
//   //       return;
//   //     } else {
//   //       await marketSellAction(
//   //         'upFlat',
//   //         false,
//   //         symbol,
//   //         botState,
//   //         cryptoCoin,
//   //         expectedProfitPercent,
//   //         pricesStream,
//   //         stepSize,
//   //         initialUSDTBalance,
//   //         'UP FLAT TAKE PROFIT',
//   //         indicatorsData,
//   //       );
//   //       indicatorsData.rsiRebuy.value = true;
//   //       return;
//   //     }
//   //   }
//   //   //
//   //   if (conditions.upFlat.sell.stopLoss) {
//   //     await marketSellAction(
//   //       'upFlat',
//   //       false,
//   //       symbol,
//   //       botState,
//   //       cryptoCoin,
//   //       expectedProfitPercent,
//   //       pricesStream,
//   //       stepSize,
//   //       initialUSDTBalance,
//   //       'UP FLAT STOP LOSS',
//   //       indicatorsData,
//   //     );
//   //     indicatorsData.rsiRebuy.value = true;
//   //     return;
//   //   }
//   //
//   //   /** *********************DOWN FLAT***********************/
//   //
//   //   if (conditions.downFlat.sell.takeProfit) {
//   //     await marketSellAction(
//   //       'downFlat',
//   //       false,
//   //       symbol,
//   //       botState,
//   //       cryptoCoin,
//   //       expectedProfitPercent,
//   //       pricesStream,
//   //       stepSize,
//   //       initialUSDTBalance,
//   //       'DOWN FLAT TAKE PROFIT',
//   //       indicatorsData,
//   //     );
//   //     indicatorsData.rsiRebuy.value = true;
//   //     return;
//   //   }
//   //
//   //   if (conditions.downFlat.sell.stopLoss) {
//   //     await marketSellAction(
//   //       'downFlat',
//   //       false,
//   //       symbol,
//   //       botState,
//   //       cryptoCoin,
//   //       expectedProfitPercent,
//   //       pricesStream,
//   //       stepSize,
//   //       initialUSDTBalance,
//   //       'DOWN FLAT LEVEL STOP LOSS',
//   //       indicatorsData,
//   //     );
//   //     indicatorsData.rsiRebuy.value = true;
//   //     return;
//   //   }
//   //
//   //   /** *********************STOCH RSI ***********************/
//   //
//   //   if (
//   //     conditions.stochRsiStrategy.sell.takeProfit &&
//   //     !botState.strategies.stochRsi.stopLoss
//   //   ) {
//   //     await marketSellAction(
//   //       'stochRsi',
//   //       false,
//   //       symbol,
//   //       botState,
//   //       cryptoCoin,
//   //       expectedProfitPercent,
//   //       pricesStream,
//   //       stepSize,
//   //       initialUSDTBalance,
//   //       'STOCH RSI TAKE PROFIT',
//   //       indicatorsData,
//   //       true,
//   //     );
//   //     return;
//   //   }
//   //
//   //   if (conditions.stochRsiStrategy.sell.stopLoss) {
//   //     await marketSellAction(
//   //       'stochRsi',
//   //       false,
//   //       symbol,
//   //       botState,
//   //       cryptoCoin,
//   //       expectedProfitPercent,
//   //       pricesStream,
//   //       stepSize,
//   //       initialUSDTBalance,
//   //       'ADX STOP LOSS',
//   //       indicatorsData,
//   //       false,
//   //     );
//   //     indicatorsData.obvSellSignalCount = 0;
//   //
//   //     // indicatorsData.priceGrowArea = false;
//   //     return;
//   //   }
//   //
//   //   /** *********************TRENDS CATCHER***********************/
//   //
//   //   if (
//   //     conditions.trendsCatcher.sell.takeProfit &&
//   //     !botState.strategies.trendsCatcher.stopLoss
//   //   ) {
//   //     await marketSellAction(
//   //       'trendsCatcher',
//   //       false,
//   //       symbol,
//   //       botState,
//   //       cryptoCoin,
//   //       expectedProfitPercent,
//   //       pricesStream,
//   //       stepSize,
//   //       initialUSDTBalance,
//   //       'TRENDS CATCHER TAKE PROFIT',
//   //       indicatorsData,
//   //       true,
//   //     );
//   //     return;
//   //   }
//   //
//   //   if (conditions.trendsCatcher.sell.stopLoss) {
//   //     await marketSellAction(
//   //       'trendsCatcher',
//   //       true,
//   //       symbol,
//   //       botState,
//   //       cryptoCoin,
//   //       expectedProfitPercent,
//   //       pricesStream,
//   //       stepSize,
//   //       initialUSDTBalance,
//   //       'STOP LOSS',
//   //       indicatorsData,
//   //     );
//   //     return;
//   //   }
//   //
//   //   botState.updateState('prevPrice', botState.currentPrice);
//   // };
//
//   const askConfirmation = action => {
//     const rl = readline.createInterface({
//       input: process.stdin,
//       output: process.stdout,
//     });
//     process.stdin.resume();
//     rl.question(`Confirm ${action}?:\n`, function(line) {
//       // switch (line) {
//       //   case '':
//       //     botState.confirmation = true;
//       //     break;
//       //   default:
//       //     break;
//       // }
//       if (line == '') botState.confirmation = 'true';
//       rl.close();
//     });
//   };
//
//   const scalper = async pricesStream => {
//     const { tradeAmountPercent } = botState;
//     if (botState.status === 'isPending') return;
//     botState.updateState(
//       'currentPrice',
//       Number(pricesStream[pricesStream.length - 1]),
//     );
//     const expectedProfitPercent = botState.buyPrice
//       ? botState.currentPrice / botState.buyPrice > 1
//         ? Number((botState.currentPrice / botState.buyPrice) * 100 - 100)
//         : Number(-1 * (100 - (botState.currentPrice / botState.buyPrice) * 100))
//       : 0;
//
//     const conditions = {
//       scalper: {
//         buy: botState.status === 'buy' && indicatorsData.obv5m.signal === 'buy',
//         // indicatorsData.stochRsi.stoch5m.signal === 'buy',
//         // (indicatorsData.dmi5m.adxUpCount >= 2 ||
//         //   indicatorsData.dmi5m.adxDownCount >= 2) &&
//         // indicatorsData.stochRsi.stoch1m.signal === 'buy' &&
//
//         // indicatorsData.obv1m.signal === 'buy' &&
//         // indicatorsData.roc.roc1m.value > 0 &&
//         // indicatorsData.obv1m.signal === 'buy',
//         // indicatorsData.rsi5m.signal === 'buy' &&
//         // indicatorsData.rsi1m.signal === 'buy' &&
//         // indicatorsData.stochRsi.stoch1m.data.k < 20 &&
//         // indicatorsData.stochRsi.stoch1m.data.d < 25 &&
//         // (indicatorsData.dmi1m.adxUpCount >= 2 ||
//         //   indicatorsData.dmi1m.adxDownCount >= 2),
//         // indicatorsData.scalper.askBidSignal === 'buy' &&
//         // ((indicatorsData.rsi5m.rsiValue !== null &&
//         //   indicatorsData.rsi5m.rsiValue >= 51 &&
//         //   indicatorsData.dmi5m.adxUpCount >= 1) ||
//         // indicatorsData.rsi5m.rsiValue !== null &&
//         // indicatorsData.rsi5m.rsiValue >= 51 &&
//         // indicatorsData.dmi5m.adxUpCount >= 1
//         // (indicatorsData.rsi5m.rsiValue !== null &&
//         //   indicatorsData.rsi5m.rsiValue <= 49 &&
//         //   indicatorsData.dmi5m.adxDownCount >= 1)) &&
//         // ((indicatorsData.rsi1m.rsiValue !== null &&
//         //   indicatorsData.rsi1m.rsiValue >= 51 &&
//         //   indicatorsData.dmi1m.adxUpCount >= 2) ||
//         // indicatorsData.rsi5m.rsiValue !== null &&
//         // indicatorsData.rsi5m.rsiValue >= 51 &&
//         // indicatorsData.dmi5m.adxUpCount >= 1
//         // (indicatorsData.rsi1m.rsiValue !== null &&
//         //   indicatorsData.rsi1m.rsiValue <= 49 &&
//         //   indicatorsData.dmi1m.adxDownCount >= 2)),
//         // indicatorsData.rsi5m.rsiValue !== null &&
//         // indicatorsData.rsi5m.rsiValue <= 49 &&
//         // indicatorsData.dmi5m.adxDownCount >= 1)
//
//         // indicatorsData.scalper.signal === 'buy' &&
//         // indicatorsData.scalper.buySignalCount >= 1,
//         // indicatorsData.scalper.tradesVolume.signal === 'buy' &&
//         // indicatorsData.scalper.tradesVolume.buySignalCount >= 1,
//
//         sell: {
//           takeProfit: null,
//           // botState.status === 'sell' &&
//           // expectedProfitPercent > 0.2 &&
//           // indicatorsData.obv5m.sellSignalCount >= 1,
//           stopLoss:
//             botState.status === 'sell' &&
//             // (indicatorsData.dmi5m.adxUpCount >= 2 ||
//             //   indicatorsData.dmi5m.adxDownCount >= 2) &&
//             indicatorsData.obv5m.signal === 'sell',
//
//           // ((indicatorsData.obv5m.signal === 'sell' &&
//           //   indicatorsData.stochRsi.stoch1m.signal === 'buy' &&
//           //   botState.currentProfit < 0) ||
//           //   (indicatorsData.obv5m.signal === 'sell' &&
//           //     indicatorsData.stochRsi.stoch1m.signal === 'sell')),
//           //
//
//           // indicatorsData.roc.roc5m.signal === 'sell',
//           // ||
//           // indicatorsData.obv5m.signal === 'sell'
//           // indicatorsData.rsi5m.signal === 'sell' &&
//           // indicatorsData.rsi1m.signal === 'sell' &&
//           // (indicatorsData.dmi1m.adxUpCount >= 1 ||
//           //   indicatorsData.dmi1m.adxDownCount >= 1),
//           // indicatorsData.scalper.askBidSignal === 'sell',
//
//           // ((indicatorsData.rsi5m.rsiValue !== null &&
//           //   indicatorsData.rsi5m.rsiValue >= 51 &&
//           //   indicatorsData.dmi5m.adxDownCount >= 1) ||
//           //   (indicatorsData.rsi5m.rsiValue !== null &&
//           //     indicatorsData.rsi5m.rsiValue <= 49 &&
//           //     indicatorsData.dmi5m.adxUpCount >= 1)) &&
//           //
//           // ((indicatorsData.rsi1m.rsiValue !== null &&
//           //   indicatorsData.rsi1m.rsiValue >= 51 &&
//           //   indicatorsData.dmi1m.adxDownCount >= 2) ||
//           //   (indicatorsData.rsi1m.rsiValue !== null &&
//           //     indicatorsData.rsi1m.rsiValue <= 49 &&
//           //     indicatorsData.dmi1m.adxUpCount >= 2)),
//           // indicatorsData.scalper.tradesVolume.signal === 'sell' &&
//           // indicatorsData.scalper.sellSignalCount >= 1 &&
//           // expectedProfitPercent < 0,
//           // (botState.lastBid / indicatorsData.scalper.lastBid) * 100 - 100 >=
//           //   0)
//           // expectedProfitPercent >= 0.3,
//           // ||
//           // expectedProfitPercent >= 0.3
//           // ||
//           // && expectedProfitPercent >= 0.3
//
//           // ((indicatorsData.scalper.signal === 'sell' &&
//           //   expectedProfitPercent <= -0.5) ||
//           //   expectedProfitPercent >= 1.5),
//         },
//       },
//       // downTrend: {
//       //   buy:
//       //     botState.status === 'buy' &&
//       //     indicatorsData.rsi1m.rsiValue >= 62 &&
//       //     Number(
//       //       (indicatorsData.fast1mEMA / indicatorsData.middle1mEMA) * 100 - 100,
//       //     ) >= 0.1,
//       //
//       //   // indicatorsData.rsiRebuy.value &&
//       //   // indicatorsData.middle1mEMA < indicatorsData.slow1mEMA &&
//       //   // indicatorsData.rsi1m.rsiValue !== null &&
//       //   // indicatorsData.rsi1m.rsiValue >= 41 &&
//       //   // indicatorsData.rsi1m.rsiValue <= 40 &&
//       //   // indicatorsData.rsi5m.rsiValue !== null &&
//       //   // indicatorsData.rsi5m.rsiValue >= 41 &&
//       //   // indicatorsData.rsi5m.rsiValue <= 45,
//       //
//       //   sell: {
//       //     takeProfit:
//       //       botState.status === 'sell' &&
//       //       botState.buyReason === 'downTrend' &&
//       //       expectedProfitPercent >= 0.7,
//       //
//       //     // // indicatorsData.rsi1m.rsiValue >= 59 &&
//       //     // ((Number(
//       //     //   (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
//       //     //     100,
//       //     // ) >= 0.1 &&
//       //     //   expectedProfitPercent > 0.5) ||
//       //     //   expectedProfitPercent >= 0.7),
//       //     stopLoss:
//       //       botState.status === 'sell' &&
//       //       botState.buyReason === 'downTrend' &&
//       //       Number(
//       //         (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
//       //           100,
//       //       ) >= 0.1,
//       //     // indicatorsData.rsi1m.rsiValue !== null &&
//       //     // indicatorsData.rsi1m.rsiValue < 39 &&
//       //     // indicatorsData.rsi5m.rsiValue !== null &&
//       //     // indicatorsData.rsi5m.rsiValue < 39,
//       //   },
//       // },
//       // upFlat: {
//       //   buy:
//       //     botState.status === 'buy' &&
//       //     indicatorsData.fast5mEMA > indicatorsData.middle5mEMA &&
//       //     // indicatorsData.fast1mEMA > indicatorsData.middle1mEMA &&
//       //     // indicatorsData.emaSignal === 'buy' &&
//       //     indicatorsData.rsi1m.rsiValue <= 50 &&
//       //     indicatorsData.rsi1m.rsiValue !== null,
//       //   sell: {
//       //     takeProfit:
//       //       botState.status === 'sell' &&
//       //       botState.buyReason === 'upFlat' &&
//       //       indicatorsData.rsi1m.rsiValue >= 69 &&
//       //       expectedProfitPercent > 0,
//       //     stopLoss:
//       //       botState.status === 'sell' &&
//       //       botState.buyReason === 'upFlat' &&
//       //       Number(
//       //         (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
//       //           100,
//       //       ) >= 0.05,
//       //     // (Number(
//       //     //   (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
//       //     //     100,
//       //     // ) >= 0.1 ||
//       //   },
//       // },
//       // downFlat: {
//       //   buy:
//       //     botState.status === 'buy' &&
//       //     // indicatorsData.fast5mEMA < indicatorsData.middle5mEMA &&
//       //     // indicatorsData.emaSignal === 'buy' &&
//       //     indicatorsData.rsi1m.rsiValue < 35 &&
//       //     indicatorsData.rsi1m.rsiValue !== null &&
//       //     indicatorsData.rsi5m.rsiValue >= 40,
//       //   sell: {
//       //     takeProfit:
//       //       botState.status === 'sell' &&
//       //       botState.buyReason === 'downFlat' &&
//       //       indicatorsData.rsi1m.rsiValue >= 59 &&
//       //       expectedProfitPercent > 0,
//       //     stopLoss:
//       //       botState.status === 'sell' &&
//       //       botState.buyReason === 'downFlat' &&
//       //       indicatorsData.rsi5m.rsiValue !== null &&
//       //       indicatorsData.rsi5m.rsiValue < 39,
//       //   },
//       // },
//       // stochRsiStrategy: {
//       //   buy: botState.status === 'buy' && indicatorsData.emaSignal === 'buy',
//       //   // indicatorsData.roc.roc1m > 0.05 &&
//       //   // indicatorsData.stochRsi.stoch1m.signal === 'buy',
//       //
//       //   // indicatorsData.emaSignal === 'buy',
//       //   // ((indicatorsData.dmi5m.signal === 'BUY' &&
//       //   //   Number(
//       //   //     (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 -
//       //   //       100,
//       //   //   ) >= 0.05) ||
//       //   //   (indicatorsData.dmi5m.signal === 'SELL' &&
//       //   //     Number(
//       //   //       (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
//       //   //         100,
//       //   //     ) >= 0.05)),
//       //   // indicatorsData.dmi5m.willPriceGrow &&
//       //   // indicatorsData.dmi1m.willPriceGrow,
//       //   // && indicatorsData.emaSignal === 'buy',
//       //   // indicatorsData.stochRsi.stoch1m.signal === 'buy' &&
//       //   // indicatorsData.roc.roc1m > 0.05,
//       //   // ((indicatorsData.dmi5m.signal === 'BUY' &&
//       //   //   indicatorsData.rsi5m.rsiValue > 51) ||
//       //   //   (indicatorsData.dmi5m.signal === 'SELL' &&
//       //   //     indicatorsData.rsi5m.rsiValue !== null &&
//       //   //     indicatorsData.rsi5m.rsiValue < 49)),
//       //   // &&
//       //   // ((indicatorsData.rsi1m.rsiValue > 40 &&
//       //   //   indicatorsData.rsi1m.rsiValue !== null &&
//       //   //   indicatorsData.rsi1m.rsiValue < 45) ||
//       //   //   indicatorsData.rsi1m.rsiValue > 60),
//       //   // indicatorsData.dmi5m.adxSignal === 'buy',
//       //   // indicatorsData.dmi5m.willPriceGrow,
//       //   // ((indicatorsData.rsi1m.rsiValue > 40 &&
//       //   //   indicatorsData.rsi1m.rsiValue !== null &&
//       //   //   indicatorsData.rsi1m.rsiValue < 43) ||
//       //   //   (indicatorsData.rsi1m.rsiValue > 60 &&
//       //   //     indicatorsData.rsi1m.rsiValue !== null &&
//       //   //     indicatorsData.rsi1m.rsiValue < 63)),
//       //
//       //   // Number(
//       //   //   (indicatorsData.fast1mEMA / indicatorsData.middle1mEMA) * 100 - 100,
//       //   // ) >= 0.1 &&
//       //   // indicatorsData.trix.trix5m.signal === 'buy',
//       //   // indicatorsData.rsi1m.rsiValue !== null &&
//       //   // indicatorsData.rsi1m.rsiValue > 50 &&
//       //   // indicatorsData.rsi5m.rsiValue !== null &&
//       //   // indicatorsData.rsi5m.rsiValue < 68 &&
//       //   // indicatorsData.efi1h.efiSignal === 'buy' &&
//       //   // ((indicatorsData.efi5m.efi > 0 &&
//       //   // indicatorsData.stochRsi.stoch5m.signal === 'buy' &&
//       //   // indicatorsData.stochRsi.stoch1m.signal === 'buy',
//       //   // indicatorsData.efi.efi15m.efi > 0 &&
//       //   //   indicatorsData.stochRsiSignal.stoch1m === 'buy' &&
//       //   //   indicatorsData.dmi5m.adx > 20) ||
//       //   //   (indicatorsData.efi1m.efi > 0 &&
//       //   // indicatorsData.efi.efi5m.efi > 0,
//       //   //     indicatorsData.dmi1m.adx > 20 &&
//       //   //     indicatorsData.stochRsiSignal.stoch1m === 'buy')),
//       //   // indicatorsData.obvSignal === 'buy' &&
//       //   // indicatorsData.rsi5m.rsiValue >= 41 &&
//       //   // indicatorsData.rsi15m.rsiValue >= 41 &&
//       //   // indicatorsData.stochRsiSignal.stoch5m === 'buy' &&
//       //   // indicatorsData.stochRsiSignal.stoch1m === 'buy',
//       //   // indicatorsData.efi.efi > 0,
//       //   sell: {
//       //     takeProfit: null,
//       //     // botState.status === 'sell' && expectedProfitPercent >= 0.5,
//       //     // botState.buyReason === 'stochRsi' &&
//       //     // indicatorsData.stochRsiSignal.stoch5m === 'sell' ||
//       //     // expectedProfitPercent <= -1,
//       //
//       //     stopLoss:
//       //       botState.status === 'sell' && indicatorsData.emaSignal === 'sell',
//       //     // indicatorsData.stochRsi.stoch1m.signal === 'sell',
//       //     // indicatorsData.emaSignal === 'sell',
//       //     // ((indicatorsData.dmi5m.signal === 'SELL' &&
//       //     //   Number(
//       //     //     (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 -
//       //     //       100,
//       //     //   ) >= 0.05) ||
//       //     //   (indicatorsData.dmi5m.signal === 'BUY' &&
//       //     //     Number(
//       //     //       (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) *
//       //     //         100 -
//       //     //         100,
//       //     //     ) >= 0.05) ||
//       //     //   indicatorsData.roc.roc1m < -0.1),
//       //     // indicatorsData.stochRsi.stoch1m.signal === 'sell',
//       //     // indicatorsData.roc.roc1m < -0.1,
//       //     // ((indicatorsData.dmi5m.signal === 'SELL' &&
//       //     //   indicatorsData.rsi5m.rsiValue > 51) ||
//       //     //   (indicatorsData.dmi5m.signal === 'BUY' &&
//       //     //     indicatorsData.rsi5m.rsiValue !== null &&
//       //     //     indicatorsData.rsi5m.rsiValue < 49)),
//       //     // ||
//       //     // (indicatorsData.rsi1m.rsiValue < 40 &&
//       //     //   indicatorsData.rsi1m.rsiValue !== null) ||
//       //     // (indicatorsData.rsi1m.rsiValue !== null &&
//       //     //   indicatorsData.rsi1m.rsiValue < 60 &&
//       //     //   indicatorsData.rsi1m.rsiValue > 58)
//       //     // !indicatorsData.dmi1m.willPriceGrow,
//       //     // indicatorsData.emaSignal === 'sell',
//       //     // indicatorsData.stochRsi.stoch5m.signal === 'sell',
//       //     // indicatorsData.dmi5m.signal === 'SELL',
//       //     // indicatorsData.dmi5m.adxSignal === 'sell',
//       //
//       //     // !indicatorsData.dmi5m.willPriceGrow,
//       //
//       //     // botState.buyReason === 'stochRsi' &&
//       //     // indicatorsData.rsi1m.rsiValue < 40,
//       //
//       //     // indicatorsData.trix.trix5m.signal === 'sell',
//       //     // ((indicatorsData.stochRsi.stoch5m.signal === 'sell' &&
//       //     //   indicatorsData.stochRsi.stoch15m.signal === 'sell') ||
//       //     //   (Number(
//       //     //     (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
//       //     //       100,
//       //     //   ) >= 0.1 &&
//       //     //     expectedProfitPercent < 0)),
//       //     // indicatorsData.efi1h.efiSignal === 'sell',
//       //
//       //     // indicatorsData.obvSignal === 'sell',
//       //     // indicatorsData.stochRsiSignal.stoch15m === 'sell',
//       //     //   expectedProfitPercent >= 1),
//       //
//       //     // ((indicatorsData.stochRsiSignal.stoch5m === 'sell' &&
//       //     //   !indicatorsData.priceGrowArea) ||
//       //     //   (indicatorsData.priceGrowArea &&
//       //     //     Number(
//       //     //       (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) *
//       //     //         100 -
//       //     //         100,
//       //     //     ) >= 0.5)),
//       //
//       //     // (indicatorsData.rsi5m.rsiValue !== null &&
//       //     //   indicatorsData.rsi5m.rsiValue < 39)),)
//       //   },
//       // },
//       // trendsCatcher: {
//       //   buy:
//       //     botState.status === 'buy' && indicatorsData.dmi15m.signal === 'BUY',
//       //   // indicatorsData.dmi1h.willPriceGrow &&
//       //   // Number(
//       //   //   (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
//       //   // ) >= 0.1,
//       //   sell: {
//       //     takeProfit:
//       //       expectedProfitPercent >= 1 &&
//       //       botState.buyReason === 'trendsCatcher',
//       //     stopLoss:
//       //       botState.status === 'sell' &&
//       //       indicatorsData.dmi15m.signal === 'SELL' &&
//       //       botState.buyReason === 'trendsCatcher',
//       //     // (Number(
//       //     //   (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
//       //     //     100,
//       //     // ) >= 0.5 ||
//       //     //   !indicatorsData.dmi1h.willPriceGrow),
//       //   },
//       // },
//     };
//
//     /** ******************************************BUY ACTIONS********************************************************/
//
//     /** *********************UP TREND***********************/
//     // if (botState.strategies.upTrend.enabled) {
//     //   if (conditions.upTrend.buy) {
//     //     await marketBuyAction(
//     //       false,
//     //       symbol,
//     //       botState,
//     //       cryptoCoin,
//     //       pricesStream,
//     //       stepSize,
//     //       'TRENDS CATCHER',
//     //       workingDeposit,
//     //       'RESISTANCE LEVEL',
//     //     );
//     //     botState.buyReason = 'upTrend';
//     //     return;
//     //   }
//     // }
//     //
//     // /** *********************DOWN TREND***********************/
//     //
//     // if (botState.strategies.downTrend.enabled) {
//     //   if (conditions.downTrend.buy) {
//     //     await marketBuyAction(
//     //       false,
//     //       symbol,
//     //       botState,
//     //       cryptoCoin,
//     //       pricesStream,
//     //       stepSize,
//     //       'WAVES CATCHER',
//     //       workingDeposit,
//     //       'DOWN TREND CORRECTION LEVEL',
//     //     );
//     //     botState.buyReason = 'downTrend';
//     //     indicatorsData.rsiRebuy.value = false;
//     //     return;
//     //   }
//     // }
//     //
//     // /** *********************UP FLAT***********************/
//     //
//     // if (botState.strategies.upFlat.enabled) {
//     //   if (conditions.upFlat.buy) {
//     //     await marketBuyAction(
//     //       false,
//     //       symbol,
//     //       botState,
//     //       cryptoCoin,
//     //       pricesStream,
//     //       stepSize,
//     //       'WAVES CATCHER',
//     //       workingDeposit,
//     //       'UP FLAT ',
//     //     );
//     //     botState.buyReason = 'upFlat';
//     //     return;
//     //   }
//     // }
//     //
//     // /** *********************DOWN FLAT***********************/
//     //
//     // if (botState.strategies.downFlat.enabled) {
//     //   if (conditions.downFlat.buy) {
//     //     await marketBuyAction(
//     //       false,
//     //       symbol,
//     //       botState,
//     //       cryptoCoin,
//     //       pricesStream,
//     //       stepSize,
//     //       'WAVES CATCHER',
//     //       workingDeposit,
//     //       'DOWN FLAT',
//     //     );
//     //     botState.buyReason = 'downFlat';
//     //     return;
//     //   }
//     // }
//     //
//     // /** *********************StochRSI Strategy***********************/
//     //
//     // if (botState.strategies.stochRsi.enabled) {
//     //   if (conditions.stochRsiStrategy.buy) {
//     //     await marketBuyAction(
//     //       false,
//     //       symbol,
//     //       botState,
//     //       cryptoCoin,
//     //       pricesStream,
//     //       stepSize,
//     //       'STOCH RSI',
//     //       workingDeposit,
//     //       'STOCH RSI SIGNAL',
//     //     );
//     //     botState.buyReason = 'stochRsi';
//     //     indicatorsData.obvBuySignalCount = 0;
//     //     return;
//     //   }
//     // }
//     //
//     // /** ******************** TRENDS CATHCER ***********************/
//
//     // if (botState.strategies.trendsCatcher.enabled) {
//     //   if (conditions.trendsCatcher.buy) {
//     //     await marketBuyAction(
//     //       false,
//     //       symbol,
//     //       botState,
//     //       cryptoCoin,
//     //       pricesStream,
//     //       stepSize,
//     //       'TRENDS CATCHER',
//     //       workingDeposit,
//     //       'ADX SIGNAL',
//     //     );
//     //     botState.buyReason = 'trendsCatcher';
//     //     return;
//     //   }
//     // }
//
//     if (botState.strategies.scalper.enabled) {
//       if (conditions.scalper.buy) {
//         if (botState.actionConfirmation) {
//           askConfirmation('BUY');
//           if (botState.confirmation) {
//             await marketBuyAction(
//               false,
//               symbol,
//               botState,
//               cryptoCoin,
//               pricesStream,
//               stepSize,
//               'TRENDS CATCHER',
//               workingDeposit,
//               'STRATEGY 1',
//               indicatorsData,
//             );
//             botState.buyReason = 'scalper';
//             console.log('Confirmation: ' + botState.confirmation);
//             return;
//           }
//         } else {
//           await marketBuyAction(
//             false,
//             symbol,
//             botState,
//             cryptoCoin,
//             pricesStream,
//             stepSize,
//             'TRENDS CATCHER',
//             workingDeposit,
//             'STRATEGY 1',
//             indicatorsData,
//           );
//           botState.buyReason = 'scalper';
//           return;
//         }
//       }
//     }
//
//     /** *****************************************SELL ACTIONS********************************************************/
//
//     /** *********************UP TREND***********************/
//
//     // if (conditions.upTrend.sell.stopLoss) {
//     //   await marketSellAction(
//     //     'upTrend',
//     //     false,
//     //     symbol,
//     //     botState,
//     //     cryptoCoin,
//     //     expectedProfitPercent,
//     //     pricesStream,
//     //     stepSize,
//     //     initialUSDTBalance,
//     //     'STOP LOSS OR TAKE PROFIT',
//     //     indicatorsData,
//     //   );
//     //   indicatorsData.rsiRebuy.value = true;
//     //   return;
//     // }
//     //
//     // /** *********************DOWN TREND***********************/
//     //
//     // if (conditions.downTrend.sell.takeProfit) {
//     //   await marketSellAction(
//     //     'downTrend',
//     //     false,
//     //     symbol,
//     //     botState,
//     //     cryptoCoin,
//     //     expectedProfitPercent,
//     //     pricesStream,
//     //     stepSize,
//     //     initialUSDTBalance,
//     //     'DOWNTREND CORRECTION TAKE PROFIT',
//     //     indicatorsData,
//     //   );
//     //   indicatorsData.rsiRebuy.value = false;
//     //   return;
//     // }
//     //
//     // if (conditions.downTrend.sell.stopLoss) {
//     //   await marketSellAction(
//     //     'downTrend',
//     //     false,
//     //     symbol,
//     //     botState,
//     //     cryptoCoin,
//     //     expectedProfitPercent,
//     //     pricesStream,
//     //     stepSize,
//     //     initialUSDTBalance,
//     //     'DOWNTREND CORRECTION STOP LOSS',
//     //     indicatorsData,
//     //   );
//     //   indicatorsData.rsiRebuy.value = true;
//     //   return;
//     // }
//     //
//     // /** *********************UP FLAT***********************/
//     //
//     // if (conditions.upFlat.sell.takeProfit) {
//     //   if (
//     //     false
//     //     // Number(
//     //     //   (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
//     //     // ) >= 0.1 &&
//     //     // Number(
//     //     //   (indicatorsData.fast15mEMA / indicatorsData.middle15mEMA) * 100 - 100,
//     //     // ) >= 0.1
//     //   ) {
//     //     botState.buyReason = 'upTrend';
//     //     await sendToRecipients(` INFO
//     //                  Bot was switched to the TRENDS CATCHER strategy!
//     //     `);
//     //     indicatorsData.rsiRebuy.value = true;
//     //     return;
//     //   } else {
//     //     await marketSellAction(
//     //       'upFlat',
//     //       false,
//     //       symbol,
//     //       botState,
//     //       cryptoCoin,
//     //       expectedProfitPercent,
//     //       pricesStream,
//     //       stepSize,
//     //       initialUSDTBalance,
//     //       'UP FLAT TAKE PROFIT',
//     //       indicatorsData,
//     //     );
//     //     indicatorsData.rsiRebuy.value = true;
//     //     return;
//     //   }
//     // }
//     // //
//     // if (conditions.upFlat.sell.stopLoss) {
//     //   await marketSellAction(
//     //     'upFlat',
//     //     false,
//     //     symbol,
//     //     botState,
//     //     cryptoCoin,
//     //     expectedProfitPercent,
//     //     pricesStream,
//     //     stepSize,
//     //     initialUSDTBalance,
//     //     'UP FLAT STOP LOSS',
//     //     indicatorsData,
//     //   );
//     //   indicatorsData.rsiRebuy.value = true;
//     //   return;
//     // }
//     //
//     // /** *********************DOWN FLAT***********************/
//     //
//     // if (conditions.downFlat.sell.takeProfit) {
//     //   await marketSellAction(
//     //     'downFlat',
//     //     false,
//     //     symbol,
//     //     botState,
//     //     cryptoCoin,
//     //     expectedProfitPercent,
//     //     pricesStream,
//     //     stepSize,
//     //     initialUSDTBalance,
//     //     'DOWN FLAT TAKE PROFIT',
//     //     indicatorsData,
//     //   );
//     //   indicatorsData.rsiRebuy.value = true;
//     //   return;
//     // }
//     //
//     // if (conditions.downFlat.sell.stopLoss) {
//     //   await marketSellAction(
//     //     'downFlat',
//     //     false,
//     //     symbol,
//     //     botState,
//     //     cryptoCoin,
//     //     expectedProfitPercent,
//     //     pricesStream,
//     //     stepSize,
//     //     initialUSDTBalance,
//     //     'DOWN FLAT LEVEL STOP LOSS',
//     //     indicatorsData,
//     //   );
//     //   indicatorsData.rsiRebuy.value = true;
//     //   return;
//     // }
//     //
//     // /** *********************STOCH RSI ***********************/
//     //
//     // if (
//     //   conditions.stochRsiStrategy.sell.takeProfit &&
//     //   !botState.strategies.stochRsi.stopLoss
//     // ) {
//     //   await marketSellAction(
//     //     'stochRsi',
//     //     false,
//     //     symbol,
//     //     botState,
//     //     cryptoCoin,
//     //     expectedProfitPercent,
//     //     pricesStream,
//     //     stepSize,
//     //     initialUSDTBalance,
//     //     'STOCH RSI TAKE PROFIT',
//     //     indicatorsData,
//     //     true,
//     //   );
//     //   return;
//     // }
//     //
//     // if (conditions.stochRsiStrategy.sell.stopLoss) {
//     //   await marketSellAction(
//     //     'stochRsi',
//     //     false,
//     //     symbol,
//     //     botState,
//     //     cryptoCoin,
//     //     expectedProfitPercent,
//     //     pricesStream,
//     //     stepSize,
//     //     initialUSDTBalance,
//     //     'ADX STOP LOSS',
//     //     indicatorsData,
//     //     false,
//     //   );
//     //   indicatorsData.obvSellSignalCount = 0;
//     //
//     //   // indicatorsData.priceGrowArea = false;
//     //   return;
//     // }
//     //
//     // /** *********************TRENDS CATCHER***********************/
//     //
//     // if (
//     //   conditions.trendsCatcher.sell.takeProfit &&
//     //   !botState.strategies.trendsCatcher.stopLoss
//     // ) {
//     //   await marketSellAction(
//     //     'trendsCatcher',
//     //     false,
//     //     symbol,
//     //     botState,
//     //     cryptoCoin,
//     //     expectedProfitPercent,
//     //     pricesStream,
//     //     stepSize,
//     //     initialUSDTBalance,
//     //     'TRENDS CATCHER TAKE PROFIT',
//     //     indicatorsData,
//     //     true,
//     //   );
//     //   return;
//     // }
//
//     // if (conditions.trendsCatcher.sell.stopLoss) {
//     //   await marketSellAction(
//     //     'trendsCatcher',
//     //     true,
//     //     symbol,
//     //     botState,
//     //     cryptoCoin,
//     //     expectedProfitPercent,
//     //     pricesStream,
//     //     stepSize,
//     //     initialUSDTBalance,
//     //     'STOP LOSS',
//     //     indicatorsData,
//     //   );
//     //   return;
//     // }
//     if (
//       conditions.scalper.sell.takeProfit &&
//       !botState.strategies.scalper.stopLoss
//     ) {
//       await marketSellAction(
//         'trendsCatcher',
//         false,
//         symbol,
//         botState,
//         cryptoCoin,
//         expectedProfitPercent,
//         pricesStream,
//         stepSize,
//         initialUSDTBalance,
//         'SCALPER PROFIT',
//         indicatorsData,
//         true,
//       );
//       return;
//     }
//     if (conditions.scalper.sell.stopLoss) {
//       if (botState.actionConfirmation) {
//         askConfirmation('SELL');
//         if (botState.confirmation) {
//           await marketSellAction(
//             'trendsCatcher',
//             false,
//             symbol,
//             botState,
//             cryptoCoin,
//             expectedProfitPercent,
//             pricesStream,
//             stepSize,
//             initialUSDTBalance,
//             'STRATEGY 1',
//             indicatorsData,
//           );
//           console.log('Confirmation: ' + botState.confirmation);
//
//           return;
//         }
//       } else {
//         await marketSellAction(
//           'trendsCatcher',
//           false,
//           symbol,
//           botState,
//           cryptoCoin,
//           expectedProfitPercent,
//           pricesStream,
//           stepSize,
//           initialUSDTBalance,
//           'STRATEGY 1',
//           indicatorsData,
//         );
//         return;
//       }
//     }
//
//     botState.updateState('prevPrice', botState.currentPrice);
//     botState.updateState('currentProfit', expectedProfitPercent);
//   };
//
//   // getRocSignal(symbol, '1m', indicatorsData.roc);
//   // getTrixSignal(symbol, '5m', indicatorsData.trix.trix5m);
//   // getStochRSISignal(symbol, '5m', indicatorsData.stochRsi.stoch1m, 2.5, 2.5);
//   // getStochRSISignal(symbol, '1m', indicatorsData.stochRsi.stoch1m, 2.5, 2.5);
//   // getForceIndexSignal(symbol, '5m', 13, indicatorsData.efi.efi5m);
//   // getForceIndexSignal(symbol, '15m', 13, indicatorsData.efi.efi15m);
//   // getStochRSISignal(symbol, '5m', indicatorsData.stochRsi.stoch1m, 2.5, 2.5);
//   // getDMISignal(symbol, '5m', indicatorsData.dmi5m, 2, 2, 0, 0);
//   // getEMASignal(symbol, '5m', indicatorsData);
//   // getDMISignal(symbol, '5m', indicatorsData.dmi5m, 1, 0, 0.5, -0.5, 0.5, 0.5);
//   // getDMISignal(symbol, '1m', indicatorsData.dmi1m);
//
//   // getRSISignal(symbol, '1m', indicatorsData.rsi1m);
//   // getRSISignal(symbol, '5m', indicatorsData.rsi5m);
//   // getEMASignal(symbol, '5m', indicatorsData);
//   // getEMASignal(symbol, '15m', indicatorsData);
//   // getEMASignal(symbol, '1m', indicatorsData);
//   // getObvSignal(symbol, '1m', indicatorsData.obv1m);
//   // runObvInterval(indicatorsData.obv1m);
//   // getForceIndexSignal(symbol, '1h', 13, indicatorsData.efi1h);
//   // getForceIndexSignal(symbol, '5m', 13, indicatorsData.efi5m);
//   // getForceIndexSignal(symbol, '1m', 13, indicatorsData.efi1m);
//
//   // getObvStream({
//   //   symbol: symbol,
//   //   interval: '1m',
//   // })
//   //   .pipe(bufferCount(5, 5))
//   //   .subscribe(values => {
//   //     if (!indicatorsData.prevObv) {
//   //       indicatorsData.prevObv = getAvarage(values);
//   //       return;
//   //     }
//   //     const currentObvAv = getAvarage(values);
//   //     if (currentObvAv > indicatorsData.prevObv)
//   //       indicatorsData.obvSignal = 'buy';
//   //     if (currentObvAv < indicatorsData.prevObv)
//   //       indicatorsData.obvSignal = 'sell';
//   //     // console.log(
//   //     //   indicatorsData.emaSignal,
//   //     //   (currentEmaAv / indicatorsData.emaAv) * 100 - 100,
//   //     // );
//   //     console.log('Curr obv:' + currentObvAv);
//   //     console.log('Prev obv:' + indicatorsData.prevObv);
//   //     console.log(
//   //       'Diff: ',
//   //       (Number(currentObvAv / indicatorsData.prevObv) * 100 - 100).toString(),
//   //       '\n',
//   //     );
//   //     indicatorsData.prevObv = currentObvAv;
//   //   });
//
//   if (botState.testMode) {
//     await sendToRecipients(`INIT (TEST MODE LOCAL)
//   Bot started working at: ${format(new Date(), DATE_FORMAT)}
//   Revision N: ${revisionNumber}
//   Strategies: STRATEGY 1
//   Status: ${botState.status.toUpperCase()}
//   Symbol: ${symbol.toUpperCase()}
//   `);
//   } else {
//     await sendToRecipients(`INIT (LOCAL)
//   Bot started working at: ${format(new Date(), DATE_FORMAT)}
//   Revision N: ${revisionNumber}
//   Strategies: ${JSON.stringify(botState.strategies)}
//   Status: ${botState.status.toUpperCase()}
//   Symbol: ${symbol.toUpperCase()}
//   Initial USDT balance: ${initialUSDTBalance} USDT
//   Initial ${cryptoCoin} balance: ${initialCryptoCoinBalance} ${cryptoCoin}
//   `);
//   }
//
//   // runStochRsiInterval(indicatorsData.stochRsi.stoch5m);
//
//   // getTradeStream({
//   //   symbol: symbol,
//   //   resource: RESOURCES.TRADE,
//   // })
//   //   .pipe(pluck('price'), bufferCount(5, 5))
//   //   .subscribe(values => {
//   //     if (!indicatorsData.emaAv) {
//   //       indicatorsData.emaAv = getAvarage(values);
//   //       return;
//   //     }
//   //     const currentEmaAv = getAvarage(values);
//   //     if (currentEmaAv > indicatorsData.emaAv) indicatorsData.growCount++;
//   //     if (indicatorsData.emaAv > currentEmaAv) indicatorsData.fallCount++;
//   //     // if ((currentEmaAv / indicatorsData.emaAv) * 100 - 100 >= 0.02) {
//   //     //   indicatorsData.rocSignalBuyCount++;
//   //     //   indicatorsData.rocSignalSellCount = 0;
//   //     // }
//   //     //
//   //     // if ((indicatorsData.emaAv / currentEmaAv) * 100 - 100 >= 0.01) {
//   //     //   indicatorsData.rocSignalSellCount++;
//   //     //   indicatorsData.rocSignalBuyCount = 0;
//   //     // }
//   //     // if (indicatorsData.rocSignalBuyCount >= 2)
//   //     //   indicatorsData.emaSignal = 'buy';
//   //     // if (indicatorsData.rocSignalSellCount >= 1)
//   //     //   indicatorsData.emaSignal = 'sell';
//   //
//   //     // console.log(
//   //     //   indicatorsData.emaSignal,
//   //     //   (currentEmaAv / indicatorsData.emaAv) * 100 - 100,
//   //     // );
//   //     const fallCountPercent =
//   //       (indicatorsData.fallCount /
//   //         (indicatorsData.fallCount + indicatorsData.growCount)) *
//   //       100;
//   //     const growCountPercent =
//   //       100 -
//   //       (indicatorsData.fallCount /
//   //         (indicatorsData.fallCount + indicatorsData.growCount)) *
//   //         100;
//   //     if (growCountPercent >= 55) indicatorsData.emaSignal = 'buy';
//   //     if (growCountPercent < 50) indicatorsData.emaSignal = 'sell';
//   //     console.log('Curr av:' + currentEmaAv);
//   //     console.log('Prev av:' + indicatorsData.emaAv);
//   //     console.log(fallCountPercent + '%)');
//   //     console.log(
//   //       'Fall: ' + indicatorsData.fallCount + ' (' + fallCountPercent + '%)',
//   //     );
//   //     console.log(
//   //       'Grow: ' + indicatorsData.growCount + ' (' + growCountPercent + '%)',
//   //     );
//   //     console.log(
//   //       'Diff: ',
//   //       ((currentEmaAv / indicatorsData.emaAv) * 100 - 100).toString(),
//   //       '\n',
//   //     );
//   //
//   //     indicatorsData.emaAv = currentEmaAv;
//   //   });
//
//   getTradeStream({
//     symbol: symbol,
//     resource: RESOURCES.TRADE,
//   })
//     .pipe(pluck('price'), bufferCount(1, 1))
//     .subscribe(scalper);
//
//   /** *******************************INDICATORS SECTION**************************************/
//
//   // getStochRSISignal(
//   //   symbol,
//   //   '1m',
//   //   indicatorsData.stochRsi.stoch1m,
//   //   2.5,
//   //   2.5,
//   //   2,
//   //   2,
//   // );
//   // getStochRSISignal(
//   //   symbol,
//   //   '5m',
//   //   indicatorsData.stochRsi.stoch5m,
//   //   2.5,
//   //   2.5,
//   //   2,
//   //   2,
//   // );
//   // getStochRSISignal(symbol, '15m', indicatorsData.stochRsi.stoch15m, 2.5, 2.5);
//
//   // getDMISignal(symbol, '1h', indicatorsData.dmi1h, 1, 0, 0);
//   // getDMISignal(symbol, '5m', indicatorsData.dmi5m, 1, 0, 0);
//   // getDMISignal(symbol, '1m', indicatorsData.dmi1m, 1, 0, 0);
//   // getDMISignal(symbol, '15m', indicatorsData.dmi15m, 1, 0, 0);
//   // getRSISignal(symbol, '15m', indicatorsData.rsi15m);
//   // getRSISignal(symbol, '1h', indicatorsData.rsi1h);
//   // getRSISignal(symbol, '5m', indicatorsData.rsi5m);
//   // getRSISignal(symbol, '1m', indicatorsData.rsi1m);
//   // getRSISignal(symbol, '1m', indicatorsData.rsi1m);
//   // getObvSignal(symbol, '1m', indicatorsData.obv1m);
//   // getObvSignal(symbol, '5m', indicatorsData.obv5m, 1, 1);
//   getObvSignal(symbol, '5m', indicatorsData.obv5m, 2, 2);
//   // getObvSignal(symbol, '1m', indicatorsData.obv1m, 4, 4);
//   // getRocSignal(symbol, '5m', indicatorsData.roc.roc5m, 0, -0.1, 4, 4);
//
//   /*******************************************************************************************/
//
//   // getTradeStream({
//   //   symbol: symbol,
//   //   resource: RESOURCES.TRADE,
//   // })
//   //   .pipe(bufferCount(5, 5))
//   //   .subscribe(trades => {
//   //     // console.log(trades);
//   //     const soldDeals = trades.filter(
//   //       ({ isBuyerMarketMaker }) => isBuyerMarketMaker,
//   //     );
//   //     const soldSize = getSum(
//   //       soldDeals.map(({ quantity }) => Number(quantity)),
//   //     );
//   //     // console.log(soldSize);
//   //     const boughtDeals = trades.filter(
//   //       ({ isBuyerMarketMaker }) => !isBuyerMarketMaker,
//   //     );
//   //     const boughtSize = getSum(
//   //       boughtDeals.map(({ quantity }) => Number(quantity)),
//   //     );
//   //     const allSize = boughtSize + soldSize;
//   //     const boughtSizePercent = (boughtSize / allSize) * 100;
//   //     const soldSizePercent = 100 - boughtSizePercent;
//   //
//   //     if (boughtSizePercent === 100) {
//   //       indicatorsData.scalper.tradesVolume.buySignalCount++;
//   //       indicatorsData.scalper.tradesVolume.sellSignalCount = 0;
//   //       if (indicatorsData.scalper.tradesVolume.buySignalCount >= 1)
//   //         indicatorsData.scalper.tradesVolume.signal = 'buy';
//   //     }
//   //     if (soldSizePercent === 100) {
//   //       indicatorsData.scalper.tradesVolume.sellSignalCount++;
//   //       indicatorsData.scalper.tradesVolume.buySignalCount = 0;
//   //       if (indicatorsData.scalper.tradesVolume.sellSignalCount >= 1)
//   //         indicatorsData.scalper.tradesVolume.signal = 'sell';
//   //     }
//   //     console.log('Buy: ' + boughtSizePercent + '%');
//   //     console.log('Sell: ' + soldSizePercent + '%');
//   //   });
//
//   // getEmaStream({
//   //   symbol: symbol,
//   //   interval: '1m',
//   //   period: 7,
//   // })
//   //   .pipe(bufferCount(5, 5))
//   //   .subscribe(values => {
//   //     if (!indicatorsData.emaAv) {
//   //       indicatorsData.emaAv = getAvarage(values);
//   //       return;
//   //     }
//   //     const currentEmaAv = getAvarage(values);
//   //     if ((currentEmaAv / indicatorsData.emaAv) * 100 - 100 > 0)
//   //       indicatorsData.emaSignal = 'buy';
//   //     if ((currentEmaAv / indicatorsData.emaAv) * 100 - 100 < 0)
//   //       indicatorsData.emaSignal = 'sell';
//   //     console.log(
//   //       indicatorsData.emaSignal,
//   //       (currentEmaAv / indicatorsData.emaAv) * 100 - 100,
//   //     );
//   //     indicatorsData.emaAv = currentEmaAv;
//   //   });
//
//   const getSum = (numbers = []) =>
//     numbers.reduce((sum, number) => Number(sum) + Number(number), 0);
//
//   /** *************************DATA LOGGER********************************/
//
//   // setInterval(() => {
//   //   console.log('OBV 5m: ' + indicatorsData.obv5m.signal);
//   //   // console.log('OBV 1m: ' + indicatorsData.obv1m.signal);
//   //   // console.log('ROC 5m: ' + indicatorsData.roc.roc5m.signal);
//   //   console.log('Stoch 1m: ' + indicatorsData.stochRsi.stoch1m.value);
//   //   console.log('Stoch 1m: ' + indicatorsData.stochRsi.stoch1m.signal);
//   //   console.log('Stoch 5m: ' + indicatorsData.stochRsi.stoch5m.value);
//   //   console.log('Stoch 5m: ' + indicatorsData.stochRsi.stoch5m.signal);
//   //   console.log(
//   //     'ADX 5m: ' +
//   //       indicatorsData.dmi5m.adxDiff +
//   //       ' ' +
//   //       indicatorsData.dmi5m.adxDirection +
//   //       ' ' +
//   //       (indicatorsData.dmi5m.adxUpCount
//   //         ? indicatorsData.dmi5m.adxUpCount
//   //         : indicatorsData.dmi5m.adxDownCount),
//   //   );
//   //   console.log('Profit: ' + (botState.currentProfit - 0.2) + ' %');
//   //   // console.log('OBV 1m: ' + indicatorsData.obv1m.obvDiff);
//   //   console.log('\n');
//   // }, 500);
//
//   /************************************************************************/
//
//   binance.websockets.depthCache(
//     ['LINKUSDT'],
//     _throttle((symbol, depth) => {
//       const bids = binance.sortBids(depth.bids);
//       const asks = binance.sortAsks(depth.asks);
//       const shortBids = binance.array(bids).slice(0, 5);
//       const shortAsks = binance.array(asks).slice(0, 100);
//       const bestAsk = binance.first(asks);
//       const bestBid = binance.first(bids);
//       const highPriceLevel = binance.array(asks).slice(0, 30)[29][0];
//       const maxBidSize = _maxBy(shortBids, arrItem => arrItem[1]);
//       indicatorsData.scalper.maxBidSize = maxBidSize[1];
//       const maxAskSize = _maxBy(shortAsks, arrItem => arrItem[1]);
//       indicatorsData.scalper.maxAskSize = maxAskSize[1];
//       const lastBid = shortBids[4][0];
//       const lastAsk = shortAsks[99][0];
//       const bidsSum = getSum(shortBids.map(arr => arr[1]));
//       const asksSum = getSum(shortAsks.map(arr => arr[1]));
//
//       console.log('Max BID: ' + maxBidSize);
//         console.log('Max ASK: ' + maxAskSize);
//
//       const bidsSum = getSum(shortBids.map(arr => arr[1]));
//       const asksSum = getSum(shortAsks.map(arr => arr[1]));
//         // console.log((bidsSum / asksSum) * 100 - 100);
//
//         // console.log('bids', shortBids);
//         // console.log('asks', shortAsks);
//       console.info('best bid: ' + binance.first(bids));
//       console.info('best ask: ' + binance.first(asks));
//       console.info('last bid: ' + shortBids[4][0]);
//       console.info('last ask: ' + shortAsks[99][0]);
//
//       indicatorsData.scalper.bidsAsksDiff = (bidsSum / asksSum) * 100 - 100;
//       console.log(
//         'Ask size / Bid size: (LONG) ' +
//           Number((asksSum / bidsSum) * 100 - 100).toString() +
//           '%',
//       );
//       console.log(
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
//       // console.log('High price: ' + highPriceLevel);
//
//       // console.log(
//       //   'Last Ask/ Last Bid: ' +
//       //     Number((lastAsk / lastBid) * 100 - 100).toString(),
//       // );
//
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
//
//       console.log('\n');
//
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
//     }, 500),
//   );
// })();
//
// process.on('unhandledRejection', async (reason: Error) => {
//   console.error(reason);
//   await sendToRecipients(`ERROR
//     ${JSON.stringify(reason)};
//   `);
//
//   process.exit(1);
// });
