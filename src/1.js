// import { pluck, bufferCount } from 'rxjs/operators';
// import { format } from 'date-fns';
// import { connect } from './db/connection';
// import _omit from 'lodash/omit';
// import { RESOURCES } from './constants';
// import { DATE_FORMAT } from './constants/date';
// import { getTradeStream } from './api/trades.js';
// import { sendToRecipients } from './services/telegram';
// import { getBalances, getFuturesBalances } from './api/balance';
// import { getExchangeInfo } from './api/exchangeInfo';
// import {
//   marketSellAction,
//   marketBuyAction,
//   getOrdersList,
//   checkAllOpenOrders,
//   cancelAllOpenOrders,
//   marketFuturesBuyAction,
//   marketFuturesSellAction,
// } from './api/order';
//
// import _maxBy from 'lodash/maxBy';
// import { binance } from './api/binance';
//
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
// import { getObvSignal } from './components/obv-signals';
// import { service as botStateService } from './components/botState';
// import _head from 'lodash/head';
// import _throttle from 'lodash/throttle';
// import _debounce from 'lodash/debounce';
// import { getHeikinAshiSignal } from './indicators/heikinAshi';
// import {
//   calculateAvgDealPriceChange,
//   calculateAvgPriceChange,
// } from './tools/avgPriceTools';
// import determineDealType from './tools/determineDealType';
// import { indicatorsData } from './index2';

// (async () => {
//   await connect();
//   // await processSubscriptions();
//   const revisionNumber = 'ffa2bef39307f7d13bf20d5b92ebaafe4115b081';
//   const symbol = 'linkusdt';
//   const cryptoCoin = symbol.toUpperCase().slice(0, -4);
//   const { available: initialUSDTBalance } = await getBalances('USDT');
//   const { available: initialCryptoCoinBalance } = await getBalances(cryptoCoin);
//   const initialFuturesUSDTBalance = await getFuturesBalances('USDT');
//   const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');
//   const openOrders = await checkAllOpenOrders(symbol.toUpperCase());
//   const ordersList = await getOrdersList(symbol.toUpperCase());
//   const lastOrder = ordersList[ordersList.length - 1] || null;
//   const spotDealUSDTAmount = 10;
//   const futuresDealUSDTAmount = 5;
//
//   console.info(await binance.futuresGetDataStream());
// })();
// console.log(Number(12.5647).toFixed(2));
console.log(Number(12.5647).toFixed(2));
console.log(Number(12.5647).toFixed(2));
console.log(Number(12.5647).toFixed(2));
