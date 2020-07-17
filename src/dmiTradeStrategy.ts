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
  const symbol = 'linkusdt';
  const cryptoCoin = symbol.toUpperCase().slice(0, -4);
  const { available: initialUSDTBalance } = await getBalances('USDT');
  const { available: initialCryptoCoinBalance } = await getBalances(cryptoCoin);
  const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');

  // const symbol = process.argv[2];
  const botState = {
    currentProfit: null,
    totalProfit: null,
    tradeAmountPercent: 0.9,
    availableUSDT: initialUSDTBalance,
    availableCryptoCoin: initialCryptoCoinBalance,
    canISell: false,
    buyPrice: null,
    currentPrice: null,
    order: null,
    updateState: function(fieldName, value) {
      this[`${fieldName}`] = value;
    },
  };

  const indicatorsData = {
    prev1mDmi: null,
    prev1hDmi: null,
    dmiMdi1hSignal: 0,
    rsi1mValue: null,
    rsi1hValue: null,
    sellSignal: false,
    isAdx1mHigherThanPdi1m: false,
  };

  const trader = async pricesStream => {
    const { tradeAmountPercent } = botState;
    const {
      rsi1mValue,
      sellSignal,
      rsi1hValue,
      dmiMdi1hSignal,
    } = indicatorsData;

    botState.updateState(
      'currentPrice',
      Number(pricesStream[pricesStream.length - 1]),
    );
    const expectedProfit = botState.buyPrice
      ? botState.currentPrice / botState.buyPrice > 1
        ? Number((botState.currentPrice / botState.buyPrice) * 100 - 100)
        : Number(-1 * (100 - (botState.currentPrice / botState.buyPrice) * 100))
      : 0;

    if (
      !botState.canISell &&
      rsi1mValue <= 50 &&
      rsi1mValue !== null &&
      rsi1hValue < 68 &&
      rsi1hValue !== null &&
      dmiMdi1hSignal === 1
    ) {
      try {
        botState.updateState('canISell', true);
        const amount = binance.roundStep(
          (botState.availableUSDT * tradeAmountPercent) / botState.currentPrice,
          stepSize,
        );
        const order = await marketBuy(symbol.toUpperCase(), +amount);
        botState.updateState('buyPrice', Number(order.fills[0].price));
        botState.updateState('order', order);
        const { available } = await getBalances(cryptoCoin);
        botState.updateState('availableCryptoCoin', available);
        await sendToRecipients(`BUY
                 STRATEGY 1.2 (RSI + DMI) MODIFIED
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.buyPrice} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 USDT Balance: ${botState.availableUSDT} USDT
                 ${cryptoCoin} Balance: ${+botState.availableCryptoCoin} USDT
                 OrderInfo: ${JSON.stringify(botState.order)}
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
      botState.canISell &&
      ((rsi1mValue >= 60 && expectedProfit >= 0.3 && sellSignal) ||
        dmiMdi1hSignal === -1 ||
        expectedProfit <= -2)
    ) {
      try {
        botState.updateState('canISell', false);
        botState.updateState('buyPrice', null);
        const amount = binance.roundStep(
          Number(botState.availableCryptoCoin),
          stepSize,
        );
        const order = await marketSell(symbol.toUpperCase(), +amount);
        botState.updateState('order', order);
        const { available: refreshedUSDTBalance } = await getBalances('USDT');
        const currentProfit =
          Number(refreshedUSDTBalance) - Number(botState.availableUSDT);
        botState.updateState('currentProfit', currentProfit);
        botState.updateState('availableUSDT', +refreshedUSDTBalance);
        botState.updateState(
          'totalProfit',
          Number(refreshedUSDTBalance) - Number(initialUSDTBalance),
        );
        const { available: refreshedCryptoCoinBalance } = await getBalances(
          cryptoCoin,
        );
        botState.updateState(
          'availableCryptoCoin',
          +refreshedCryptoCoinBalance,
        );

        await sendToRecipients(`SELL
                 STRATEGY 1.2(RSI + DMI)
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.order.fills[0].price} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Current profit: ${botState.currentProfit} USDT
                 Total profit: ${botState.totalProfit} USDT
                 USDT Balance: ${botState.availableUSDT} USDT
                 ${cryptoCoin} Balance: ${+botState.availableCryptoCoin} USDT
                 OrderInfo: ${JSON.stringify(botState.order)}
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
    indicatorsData.rsi1mValue = rsi;
  });

  getRsiStream({
    symbol: symbol,
    period: 14,
    interval: '1h',
  }).subscribe(rsi => {
    indicatorsData.rsi1hValue = rsi;
  });

  getDmiStream({
    symbol: symbol,
    interval: '1m',
    period: 14,
  }).subscribe(dmi => {
    if (!indicatorsData.prev1mDmi) {
      indicatorsData.prev1mDmi = dmi;
      return;
    }

    if (
      dmi.adx > dmi.pdi &&
      indicatorsData.prev1mDmi.pdi >= indicatorsData.prev1mDmi.adx
    ) {
      console.log('Pdi is lower than Adx!');
      indicatorsData.isAdx1mHigherThanPdi1m = true;
      console.log('Sell signal: ' + indicatorsData.sellSignal);
    }
    if (
      dmi.adx < dmi.pdi &&
      indicatorsData.prev1mDmi.pdi <= indicatorsData.prev1mDmi.adx
    ) {
      console.log('Pdi is higher than Adx!');
      indicatorsData.isAdx1mHigherThanPdi1m = false;
      indicatorsData.sellSignal = false;
      console.log('Sell signal: ' + indicatorsData.sellSignal);
    }
    if (dmi.adx - dmi.pdi >= 2 && indicatorsData.isAdx1mHigherThanPdi1m) {
      indicatorsData.sellSignal = true;
      console.log('Sell signal: ' + indicatorsData.sellSignal);
    }
    indicatorsData.prev1mDmi = dmi;
  });

  getDmiStream({
    symbol: symbol,
    interval: '1h',
    period: 14,
  }).subscribe(dmi => {
    if (!indicatorsData.prev1hDmi) {
      indicatorsData.prev1hDmi = dmi;
      return;
    }
    if (dmi.pdi - dmi.mdi >= 2) {
      indicatorsData.dmiMdi1hSignal = 1;
    }
    if (dmi.pdi - dmi.mdi <= -2) {
      indicatorsData.dmiMdi1hSignal = -1;
    }
    indicatorsData.prev1hDmi = dmi;
  });

  await sendToRecipients(`INIT
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  with using the STRATEGY 1.2(RSI + DMI) (LAST MODIFIED)
  Symbol: ${symbol.toUpperCase()}
  Initial USDT balance: ${initialUSDTBalance} USDT
  Initial exchcurr balance: ${initialCryptoCoinBalance} ${cryptoCoin}
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
