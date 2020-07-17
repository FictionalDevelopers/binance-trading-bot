import { pluck, bufferCount } from 'rxjs/operators';
import { format } from 'date-fns';
import { connect } from './db/connection';
import { RESOURCES } from './constants';
import { DATE_FORMAT } from './constants/date';
import { getTradeStream } from './api/trades.js';
import { processSubscriptions, sendToRecipients } from './services/telegram';
import { getRsiStream } from './indicators/rsi';
import { getDmiStream } from './indicators/dmi';
import { binance } from './api/binance';
import getBalances from './api/balance';
import { getExchangeInfo } from './api/exchangeInfo';
import { marketSell, marketBuy } from './api/order';

(async function() {
  await connect();
  await processSubscriptions();
  // const symbol = process.argv[2];
  const tradeAmountPercent = 0.9;
  const symbol = 'linkusdt';
  const exchCurr = symbol.toUpperCase().slice(0, -4);
  const { available: initialUSDTBalance } = await getBalances('USDT');
  let availableUSDT = initialUSDTBalance;
  const { available: initialERDBalance } = await getBalances(exchCurr);
  let availableERD = initialERDBalance;
  const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');
  let canISell = false;
  let buyPrice = null;
  let prev1mDmi = null;
  let prev1hDmi = null;
  let dmiMdi1hSignal = 0;
  let rsi1mValue = null;
  let rsi1hValue = null;
  let currentPrice = null;
  let sellSignal = false;
  let isAdx1mHigherThanPdi1m = false;

  const trader = async pricesStream => {
    currentPrice = Number(pricesStream[pricesStream.length - 1]);
    const profit = buyPrice
      ? currentPrice / buyPrice > 1
        ? Number((currentPrice / buyPrice) * 100 - 100)
        : Number(-1 * (100 - (currentPrice / buyPrice) * 100))
      : 0;

    if (
      !canISell &&
      rsi1mValue <= 50 &&
      rsi1mValue !== null &&
      rsi1hValue < 68 &&
      rsi1hValue !== null &&
      dmiMdi1hSignal === 1
    ) {
      try {
        canISell = true;
        const amount = binance.roundStep(
          (availableUSDT * tradeAmountPercent) / currentPrice,
          stepSize,
        );
        const order = await marketBuy(symbol.toUpperCase(), +amount);
        buyPrice = Number(order.fills[0].price);
        const { available } = await getBalances(exchCurr);
        availableERD = available;
        await sendToRecipients(`BUY
                 STRATEGY 1.2 (RSI + DMI) MODIFIED
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${currentPrice} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 OrderInfo: ${JSON.stringify(order)}
             `);
        // console.log(`BUY
        //                      STRATEGY 1.2(RSI + DMI) MODIFIED
        //                      symbol: ${symbol.toUpperCase()}
        //                      price: ${currentPrice}
        //                      date: ${format(new Date(), DATE_FORMAT)}
        //       `);
        return;
      } catch (e) {
        await sendToRecipients(`BUY ERROR
            ${JSON.stringify(e)}
      `);
      }
    }

    if (
      canISell &&
      ((rsi1mValue >= 60 && profit >= 0.3 && sellSignal) ||
        dmiMdi1hSignal === -1 ||
        profit <= -2)
    ) {
      try {
        canISell = false;
        buyPrice = null;
        const amount = binance.roundStep(Number(availableERD), stepSize);
        const order = await marketSell(symbol.toUpperCase(), +amount);
        const { available: refreshedUSDTBalance } = await getBalances('USDT');
        const currentProfit =
          Number(refreshedUSDTBalance) - Number(availableUSDT);
        availableUSDT = +refreshedUSDTBalance;
        const { available: refreshedERDBalance } = await getBalances(exchCurr);
        availableERD = refreshedERDBalance;

        await sendToRecipients(`SELL
                 STRATEGY 1.2(RSI + DMI)
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${currentPrice} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Current profit: ${currentProfit} USDT
                 Total profit: ${Number(refreshedUSDTBalance) -
                   Number(initialUSDTBalance)} USDT
                 Balance: ${+refreshedUSDTBalance} USDT
                 OrderInfo: ${JSON.stringify(order)}
             `);

        // console.log(`Sell
        //                     STRATEGY 1.2 (RSI + DMI)
        //                     symbol: ${symbol.toUpperCase()}
        //                     price: ${currentPrice}
        //                     date: ${format(new Date(), DATE_FORMAT)}
        //                     current profit: ${Number(profit - 0.2).toPrecision(
        //                       4,
        //                     )}%
        //       `);
      } catch (e) {
        await sendToRecipients(`SELL ERROR
            ${JSON.stringify(e)}
      `);
      }
    }
  };

  getRsiStream({
    symbol: symbol,
    period: 14,
    interval: '1m',
  }).subscribe(rsi => {
    rsi1mValue = rsi;
  });

  getRsiStream({
    symbol: symbol,
    period: 14,
    interval: '1h',
  }).subscribe(rsi => {
    rsi1hValue = rsi;
  });

  getDmiStream({
    symbol: symbol,
    interval: '1m',
    period: 14,
  }).subscribe(dmi => {
    if (!prev1mDmi) {
      prev1mDmi = dmi;
      return;
    }

    if (dmi.adx > dmi.pdi && prev1mDmi.pdi >= prev1mDmi.adx) {
      console.log('Pdi is lower than Adx!');
      isAdx1mHigherThanPdi1m = true;
      console.log('Sell signal: ' + sellSignal);
    }
    if (dmi.adx < dmi.pdi && prev1mDmi.pdi <= prev1mDmi.adx) {
      console.log('Pdi is higher than Adx!');
      isAdx1mHigherThanPdi1m = false;
      sellSignal = false;
      console.log('Sell signal: ' + sellSignal);
    }
    if (dmi.adx - dmi.pdi >= 2 && isAdx1mHigherThanPdi1m) {
      sellSignal = true;
      console.log('Sell signal: ' + sellSignal);
    }
    prev1mDmi = dmi;
  });

  getDmiStream({
    symbol: symbol,
    interval: '1h',
    period: 14,
  }).subscribe(dmi => {
    if (!prev1hDmi) {
      prev1hDmi = dmi;
      return;
    }
    if (dmi.pdi - dmi.mdi >= 2) {
      dmiMdi1hSignal = 1;
    }
    if (dmi.pdi - dmi.mdi <= -2) {
      dmiMdi1hSignal = -1;
    }
    prev1hDmi = dmi;
  });

  await sendToRecipients(`INIT
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  with using the STRATEGY 1.2(RSI + DMI) (LAST MODIFIED)
  Symbol: ${symbol.toUpperCase()}
  Initial USDT balance: ${initialUSDTBalance} USDT
  Initial exchcurr balance: ${initialERDBalance} ${exchCurr}
  `);

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
    ${reason.message}
    ${reason.stack}
  `);

  process.exit(1);
});
