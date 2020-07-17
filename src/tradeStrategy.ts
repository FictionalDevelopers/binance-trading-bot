import { map, pluck, bufferCount } from 'rxjs/operators';
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
  const symbol = 'erdusdt';
  const { available: initialUSDTBalance } = await getBalances('USDT');
  const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');
  let availableUSDT = null;
  let availableERD = null;
  let canISell = false;
  let buyPrice = null;
  let prevDmi = null;
  let prev1hDmi = null;
  const prices = [];
  let dmiMdiSignal = 0;
  let dmiAdxSignal = 0;
  let dmiAdx1hSignal = 0;
  let dmiMdi1hSignal = 0;
  let rsi1mValue = null;
  let rsi1hValue = null;
  let currentPrice = null;

  const dmiTradeStrategy = async pricesStream => {
    currentPrice = Number(pricesStream[pricesStream.length - 1]);
    prices.push(currentPrice);
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
        buyPrice = currentPrice;
        const { available } = await getBalances('USDT');
        availableUSDT = available;
        const amount = binance.roundStep(
          availableUSDT / currentPrice,
          stepSize,
        );
        const order = await marketBuy(symbol.toUpperCase(), +amount);
        await sendToRecipients(`BUY
             STRATEGY 1.2 (RSI + DMI) MODIFIED
             Symbol: ${symbol.toUpperCase()}
             Price: ${currentPrice} USDT
             Date: ${format(new Date(), DATE_FORMAT)}
             OrderInfo: ${JSON.stringify(order)}
         `);
        return;
      } catch (e) {
        await sendToRecipients(`ERROR
        ${e.message}
        ${e.stack}
  `);
      }
    }
    if (
      canISell &&
      ((rsi1mValue >= 60 && profit >= 0.3 && dmiAdxSignal === -1) ||
        dmiMdi1hSignal === -1)
    ) {
      try {
        canISell = false;
        buyPrice = null;
        const { available: availableExchCurr } = await getBalances('ERD');
        availableERD = availableExchCurr;
        const amount = binance.roundStep(Number(availableExchCurr), stepSize);
        const order = await marketSell(symbol.toUpperCase(), +amount);
        const { available: refreshedUSDTBalance } = await getBalances('USDT');
        const currentProfit =
          Number(refreshedUSDTBalance) - Number(availableUSDT);
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
      } catch (e) {
        await sendToRecipients(`ERROR
        ${e.message}
        ${e.stack}
  `);
      }
    }
  };

  const rsi1mSignals = getRsiStream({
    symbol: symbol,
    period: 14,
    interval: '1m',
  }).subscribe(rsi => {
    rsi1mValue = rsi;
  });

  const rsi1hSignals = getRsiStream({
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
    if (!prevDmi) {
      prevDmi = dmi;
      return;
    }
    if (dmi.pdi - dmi.adx >= 2) {
      dmiAdxSignal = 1;
    }
    if (dmi.pdi - dmi.adx <= -2) {
      dmiAdxSignal = -1;
    }
    if (dmi.pdi - dmi.mdi > 0.5) {
      dmiMdiSignal = 1;
    }
    if (dmi.pdi - dmi.mdi < -0.5) {
      dmiMdiSignal = -1;
    }
    prevDmi = dmi;
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
    if (dmi.pdi - dmi.adx >= 2) {
      dmiAdx1hSignal = 1;
    }
    if (dmi.pdi - dmi.adx <= -2) {
      dmiAdx1hSignal = -1;
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
  with using the STRATEGY 1.2(RSI + DMI) (MODIFIED)
  Symbol: ${symbol.toUpperCase()}
  Initial balance: ${initialUSDTBalance} USDT
  `);

  getTradeStream({
    symbol: symbol,
    resource: RESOURCES.TRADE,
  })
    .pipe(pluck('price'), bufferCount(1, 1))
    .subscribe(dmiTradeStrategy);
})();

process.on('unhandledRejection', async (reason: Error) => {
  console.error(reason);
  await sendToRecipients(`ERROR
    ${reason.message}
    ${reason.stack}
  `);

  process.exit(1);
});
