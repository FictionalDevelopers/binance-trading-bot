import { pluck, bufferCount } from 'rxjs/operators';
import { format } from 'date-fns';
import { connect } from './db/connection';
import { RESOURCES } from './constants';
import { DATE_FORMAT } from './constants/date';
import { getTradeStream } from './api/trades.js';
import { sendToRecipients } from './services/telegram';
import { binance } from './api/binance';
import getBalances from './api/balance';
import {
  marketBuy,
  marketSellAction,
  limitSell,
  cancelAllOpenOrders,
  checkAllOpenOrders,
} from './api/order';
import { getEMASignal, runEMAInterval } from './components/ema-signals';
import { getDMISignal } from './components/dmi-signals';
import { getRSISignal } from './components/rsi-signals';
import botState from './components/botState';
import indicatorsData from './components/indicators-data';

(async function() {
  await connect();
  // await processSubscriptions();
  const symbol = 'linkusdt';
  const cryptoCoin = symbol.toUpperCase().slice(0, -4);
  const { available: initialUSDTBalance } = await getBalances('USDT');
  const { available: initialCryptoCoinBalance } = await getBalances(cryptoCoin);
  // const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');
  const openOrders = await checkAllOpenOrders(symbol.toUpperCase());
  // const symbol = process.argv[2];

  // const botState = {
  //   strategy: 'MIXED STRATEGY',
  //   currentStrategy: '',
  //   testMode: false,
  //   useProfitLevels: false,
  //   useEMAStopLoss: false,
  //   status: openOrders ? (openOrders.length === 0 ? 'buy' : 'sell') : 'buy',
  //   // status: 'buy',
  //   profitLevels: [
  //     {
  //       id: 1,
  //       profitPercent: 1,
  //       amountPercent: 0.5,
  //       isFilled: false,
  //     },
  //     {
  //       id: 2,
  //       profitPercent: 2,
  //       amountPercent: 0.5,
  //       isFilled: false,
  //     },
  //     {
  //       id: 3,
  //       profitPercent: 4,
  //       amountPercent: 0.5,
  //       isFilled: false,
  //     },
  //   ],
  //   rebuy: true,
  //   currentProfit: null,
  //   totalProfit: null,
  //   totalPercentProfit: null,
  //   tradeAmountPercent: 0.9,
  //   availableUSDT: initialUSDTBalance,
  //   availableCryptoCoin: initialCryptoCoinBalance,
  //   cummulativeQuoteQty: null,
  //   buyPrice: null,
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

  // const indicatorsData = {
  //   emaSignal: null,
  //   dmi5m: {
  //     prevDmi: null,
  //     dmiMdiSignal: 0,
  //     adxSignal: 0,
  //     mdiSignal: 0,
  //     adxBuySignalVolume: 0,
  //     adxSellSignalVolume: 0,
  //     willPriceGrow: false,
  //     trend: null,
  //   },
  //   dmi1h: {
  //     prevDmi: null,
  //     dmiMdiSignal: 0,
  //     adxSignal: 0,
  //     mdiSignal: 0,
  //     adxBuySignalVolume: 0,
  //     adxSellSignalVolume: 0,
  //     willPriceGrow: false,
  //     trend: null,
  //   },
  //   dmi1m: {
  //     prevDmi: null,
  //     dmiMdiSignal: 0,
  //     adxSignal: 0,
  //     mdiSignal: 0,
  //     adxBuySignalVolume: 0,
  //     adxSellSignalVolume: 0,
  //     willPriceGrow: false,
  //     trend: null,
  //   },
  //   rsi1m: {
  //     rsiValue: null,
  //     prevRsi: null,
  //     sellNow: false,
  //     buyNow: false,
  //   },
  //   slow1mEMA: 0,
  //   middle1mEMA: 0,
  //   fast1mEMA: 0,
  //   slow5mEMA: 0,
  //   middle5mEMA: 0,
  //   fast5mEMA: 0,
  //   slow1hEMA: 0,
  //   middle1hEMA: 0,
  //   fast1hEMA: 0,
  //   slow15mEMA: 0,
  //   middle15mEMA: 0,
  //   fast15mEMA: 0,
  //   summaryEMABuySignal: false,
  // };

  runEMAInterval(indicatorsData, botState);

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

    if (
      Number(
        (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 - 100,
      ) >= 0.1
    ) {
      botState.rebuy = true;
    }

    if (
      Number(
        (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
      ) >= 0.1
    ) {
      botState.rebuy = false;
    }

    if (
      botState.status === 'buy' &&
      Number(
        (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
      ) >= 0.1 &&
      botState.rebuy
    ) {
      if (botState.testMode) {
        try {
          botState.updateState('status', 'isPending');
          botState.updateState(
            'buyPrice',
            Number(pricesStream[pricesStream.length - 1]),
          );
          await sendToRecipients(`BUY
                             ${botState.strategy}
                             Deal №: ${botState.dealsCount}
                             symbol: ${symbol.toUpperCase()}
                             price: ${botState.buyPrice}
                             date: ${format(new Date(), DATE_FORMAT)}
              `);

          botState.updateState('status', 'sell');
          botState.updateState('prevPrice', botState.currentPrice);
          return;
        } catch (e) {
          await sendToRecipients(`BUY ERROR
            ${JSON.stringify(e)}
      `);
          botState.updateState('status', 'buy');
        }
      } else {
        try {
          botState.updateState('status', 'isPending');
          botState.updateState(
            'buyPrice',
            Number(pricesStream[pricesStream.length - 1]),
          );

          const amount = binance.roundStep(
            35 / botState.currentPrice,
            botState.stepSize,
          );
          const order = await marketBuy(symbol.toUpperCase(), +amount);
          botState.updateState('buyPrice', Number(order.fills[0].price));
          botState.updateState('order', order);
          botState.updateState(
            'cummulativeQuoteQty',
            Number(order.cummulativeQuoteQty),
          );
          const { available: refreshedCryptoCoinBalance } = await getBalances(
            cryptoCoin,
          );
          botState.updateState(
            'availableCryptoCoin',
            refreshedCryptoCoinBalance,
          );
          await sendToRecipients(`BUY
                 ${botState.strategy}
                 Deal №: ${botState.dealsCount}
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.buyPrice} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Prebuy stablecoin balance: ${botState.availableUSDT} USDT
                 Cryptocoin balance: ${+botState.availableCryptoCoin} ${cryptoCoin}
                 OrderInfo: ${JSON.stringify(botState.order)}
             `);

          const limitSellOrderAmount = binance.roundStep(
            Number(botState.availableCryptoCoin) * 0.3333,
            botState.stepSize,
          );

          const limitSellOrdersPromisesArray = botState.profitLevels.map(
            ({ profitPercent }) =>
              limitSell(
                symbol.toUpperCase(),
                +limitSellOrderAmount,
                +Number(
                  botState.buyPrice * (1 + profitPercent / 100),
                ).toPrecision(4),
              ),
          );

          await Promise.all(limitSellOrdersPromisesArray);

          botState.updateState('status', 'sell');
          botState.updateState('prevPrice', botState.currentPrice);
          await sendToRecipients(`BOT STATE
                 ${JSON.stringify(botState)}
             `);

          return;
        } catch (e) {
          await sendToRecipients(`BUY ERROR
            ${JSON.stringify(e)}
      `);
          const { available: refreshedUSDTBalance } = await getBalances('USDT');
          botState.updateState('availableUSDT', +refreshedUSDTBalance);
          botState.updateState('status', 'buy');
        }
      }
    }
    if (
      botState.status === 'sell' &&
      Number(
        (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 - 100,
      ) >= 0.1
    ) {
      try {
        botState.updateState('status', 'isPending');
        const openOrders = await checkAllOpenOrders(symbol.toUpperCase());
        if (openOrders.length === 0) {
          const { available: refreshedUSDTBalance } = await getBalances('USDT');
          botState.updateState('availableUSDT', +refreshedUSDTBalance);
          botState.dealsCount++;
          botState.updateState('status', 'buy');
          return;
        } else {
          await cancelAllOpenOrders(symbol.toUpperCase());
          await marketSellAction(
            true,
            symbol,
            botState,
            cryptoCoin,
            expectedProfitPercent,
            pricesStream,
            indicatorsData,
            botState.stepSize,
            initialUSDTBalance,
            'EMA STOP LOSS',
          );
          return;
        }
      } catch (e) {
        await sendToRecipients(`SELL ERROR
            ${JSON.stringify(e)}
      `);
      }
    }

    botState.updateState('prevPrice', botState.currentPrice);
  };

  getDMISignal(symbol, '5m', indicatorsData.dmi5m);
  getRSISignal(symbol, '1m', indicatorsData.rsi1m);
  getEMASignal(symbol, '5m', indicatorsData);
  getEMASignal(symbol, '1m', indicatorsData);

  if (botState.testMode) {
    await sendToRecipients(`INIT TEST MODE
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  with using the ${botState.strategy}
  Symbol: ${symbol.toUpperCase()}
  `);
  } else {
    await sendToRecipients(`INIT
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  with using the ${botState.strategy}
  Status: ${botState.status.toUpperCase()}
  Symbol: ${symbol.toUpperCase()}
  Initial USDT balance: ${initialUSDTBalance} USDT
  Initial ${cryptoCoin} balance: ${initialCryptoCoinBalance} ${cryptoCoin}
  Open orders: ${JSON.stringify(openOrders)}
  `);
  }

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
    ${JSON.stringify(reason)};
  `);

  process.exit(1);
});
