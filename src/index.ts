import { pluck, bufferCount } from 'rxjs/operators';
import { format } from 'date-fns';
import { connect } from './db/connection';
import { RESOURCES } from './constants';
import { DATE_FORMAT } from './constants/date';
import { getTradeStream } from './api/trades.js';
import { processSubscriptions, sendToRecipients } from './services/telegram';
import { getDmiStream } from './indicators/dmi';
import { binance } from './api/binance';
import getBalances from './api/balance';
import { getExchangeInfo } from './api/exchangeInfo';

(async function() {
  await connect();
  // await processSubscriptions();
  const symbol = 'adausdt';
  const cryptoCoin = symbol.toUpperCase().slice(0, -4);
  const { available: initialUSDTBalance } = await getBalances('USDT');
  const { available: initialCryptoCoinBalance } = await getBalances(cryptoCoin);
  const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');

  // const symbol = process.argv[2];
  const botState = {
    status: 'buy',
    currentProfit: null,
    totalProfit: null,
    tradeAmountPercent: 0.95,
    availableUSDT: initialUSDTBalance,
    availableCryptoCoin: initialCryptoCoinBalance,
    buyPrice: null,
    currentPrice: null,
    order: null,
    avrDealProfit: null,
    dealsCount: 1,
    startTime: new Date().getTime(),
    workDuration: null,
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
    adx1mSignal: 0,
    mdi1mSignal: 0,
    mdi1hSignal: 0,
    slow1mEMA: 0,
    middle1mEMA: 0,
    fast1mEMA: 0,
    slow1hEMA: 0,
    middle1hEMA: 0,
    fast1hEMA: 0,
    isDownTrend: false,
    rebuy: true,
    trend: null,
    adxBuySignalVolume: 0,
    adxSellSignalVolume: 0,
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

    if (botState.status === 'buy' && indicatorsData.adxBuySignalVolume > 0) {
      try {
        botState.updateState('status', 'isPending');
        botState.updateState(
          'buyPrice',
          Number(pricesStream[pricesStream.length - 1]),
        );
        console.log(`BUY
                             STRATEGY 1.2(RSI + DMI) MODIFIED
                             symbol: ${symbol.toUpperCase()}
                             price: ${botState.buyPrice}
                             date: ${format(new Date(), DATE_FORMAT)}
              `);
        botState.updateState('status', 'sell');
        return;
      } catch (e) {
        await sendToRecipients(`BUY ERROR
            ${JSON.stringify(e)}
      `);
        botState.updateState('status', 'buy');
      }
    }

    if (botState.status === 'sell' && indicatorsData.adxSellSignalVolume > 0) {
      try {
        botState.updateState('status', 'isPending');
        botState.updateState('buyPrice', null);
        botState.updateState(
          'totalProfit',
          (botState.totalProfit += expectedProfitPercent),
        );
        console.log(`Sell
                            STRATEGY 1.2 (RSI + DMI)
                            symbol: ${symbol.toUpperCase()}
                            price: ${pricesStream[pricesStream.length - 1]}
                            date: ${format(new Date(), DATE_FORMAT)}
                            current profit: ${expectedProfitPercent}%
                            total profit: ${botState.totalProfit}%
              `);
        botState.dealsCount++;
        botState.updateState('status', 'buy');
      } catch (e) {
        await sendToRecipients(`SELL ERROR
            ${JSON.stringify(e)}
      `);
        botState.updateState('status', 'sell');
      }
    }
  };

  getDmiStream({
    symbol: symbol,
    interval: '1h',
    period: 14,
  }).subscribe(dmi => {
    if (!indicatorsData.prev1mDmi) {
      indicatorsData.prev1mDmi = dmi;
      return;
    }
    // if (
    //   indicatorsData.prev1mDmi.mdi > indicatorsData.prev1mDmi.pdi &&
    //   dmi.pdi > dmi.mdi
    // ) {
    //   indicatorsData.trend = 'UP';
    //   indicatorsData.directionalMovementSignalWeight = 0;
    // }
    // if (
    //   indicatorsData.prev1mDmi.mdi < indicatorsData.prev1mDmi.pdi &&
    //   dmi.pdi < dmi.mdi
    // ) {
    //   indicatorsData.trend = 'DOWN';
    //   indicatorsData.directionalMovementSignalWeight = 0;
    // }
    // // console.log('Trend: ' + indicatorsData.trend);
    // console.log(dmi);
    // console.log(indicatorsData.prev1mDmi);
    if (dmi.adx > dmi.pdi) indicatorsData.adx1mSignal = -1;
    if (dmi.pdi > dmi.adx) indicatorsData.adx1mSignal = 1;
    if (dmi.mdi > dmi.pdi) {
      if (indicatorsData.trend === 'UP') {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
      indicatorsData.mdi1mSignal = -1;
      indicatorsData.trend = 'DOWN';
    }
    if (dmi.pdi > dmi.mdi) {
      if (indicatorsData.trend === 'DOWN') {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
      indicatorsData.mdi1mSignal = 1;
      indicatorsData.trend = 'UP';
    }
    // console.log(indicatorsData.trend);
    // if (indicatorsData.prev1mDmi.adx === dmi.adx) return;

    if (indicatorsData.trend === 'DOWN') {
      if (indicatorsData.prev1mDmi.adx > dmi.adx) {
        indicatorsData.adxBuySignalVolume++;
        indicatorsData.adxSellSignalVolume = 0;
      }
      if (indicatorsData.prev1mDmi.adx < dmi.adx) {
        indicatorsData.adxSellSignalVolume++;
        indicatorsData.adxBuySignalVolume = 0;
      }
      if (indicatorsData.prev1mDmi.adx === dmi.adx) {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
    }
    if (indicatorsData.trend === 'UP') {
      if (indicatorsData.prev1mDmi.adx > dmi.adx) {
        indicatorsData.adxSellSignalVolume++;
        indicatorsData.adxBuySignalVolume = 0;
      }
      if (indicatorsData.prev1mDmi.adx < dmi.adx) {
        indicatorsData.adxBuySignalVolume++;
        indicatorsData.adxSellSignalVolume = 0;
      }
      if (indicatorsData.prev1mDmi.adx === dmi.adx) {
        indicatorsData.adxBuySignalVolume = 0;
        indicatorsData.adxSellSignalVolume = 0;
      }
    }
    // console.log(
    //   'Trend: ' +
    //     indicatorsData.trend +
    //     ' BuySignal: ' +
    //     indicatorsData.adxBuySignalVolume +
    //     ' SellSignal: ' +
    //     indicatorsData.adxSellSignalVolume,
    // );
    indicatorsData.prev1mDmi = dmi;
  });

  // await sendToRecipients(`INIT
  // Bot started working at: ${format(new Date(), DATE_FORMAT)}
  // with using the STRATEGY 1.2(RSI + DMI) (LAST MODIFIED)
  // Symbol: ${symbol.toUpperCase()}
  // Initial USDT balance: ${initialUSDTBalance} USDT
  // Initial ${cryptoCoin} balance: ${initialCryptoCoinBalance} ${cryptoCoin}
  // `);

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
