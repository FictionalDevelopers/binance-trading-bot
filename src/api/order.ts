import { binance } from './binance';
import { sendToRecipients } from '../services/telegram';
import { format } from 'date-fns';
import { DATE_FORMAT } from '../constants/date';
import getBalances from './balance';
import _forEach from 'lodash/forEach';

export const marketBuy = (symbol: string, quantity: number): Promise<unknown> =>
  new Promise((resolve, reject) => {
    binance.marketBuy(symbol, quantity, (error, response) => {
      if (error) {
        return reject(error);
      }
      return resolve(response);
    });
  });

export const marketSell = (
  symbol: string,
  quantity: number,
): Promise<unknown> =>
  new Promise((resolve, reject) => {
    binance.marketSell(symbol, quantity, (error, response) => {
      if (error) {
        return reject(error);
      }
      return resolve(response);
    });
  });

export const limitSell = (
  symbol: string,
  quantity: number,
  price: number,
): Promise<unknown> =>
  new Promise((resolve, reject) => {
    binance.sell(symbol, quantity, price, (error, response) => {
      if (error) {
        return reject(error);
      }
      return resolve(response);
    });
  });

export const getOrdersList = (symbol: string): Promise<unknown> =>
  new Promise((resolve, reject) => {
    binance.allOrders(symbol, (error, orders) => {
      if (error) {
        return reject(error);
      }
      return resolve(orders);
    });
  });

export const cancelAllOpenOrders = (symbol: string): Promise<unknown> =>
  new Promise((resolve, reject) => {
    binance.cancelAll(symbol, (error, orders) => {
      if (error) {
        return reject(error);
      }
      return resolve(orders);
    });
  });

export const checkAllOpenOrders = (symbol: string): Promise<unknown> =>
  new Promise((resolve, reject) => {
    binance.openOrders(symbol, (error, orders) => {
      if (error) {
        return reject(error);
      }
      return resolve(orders);
    });
  });

export const marketSellAction = async (
  profitLevels,
  symbol,
  botState,
  cryptoCoin,
  expectedProfitPercent,
  pricesStream,
  indicatorsData,
  stepSize,
  initialUSDTBalance,
  sellReason,
) => {
  if (botState.testMode) {
    try {
      botState.updateState('status', 'isPending');
      botState.updateState('buyPrice', null);
      botState.updateState(
        'totalProfit',
        (botState.totalProfit += expectedProfitPercent - 0.15),
      );
      await sendToRecipients(`Sell (LOCAL)
                            ${botState.strategy}
                            Sell reason: ${sellReason}
                            symbol: ${symbol.toUpperCase()}
                            price: ${pricesStream[pricesStream.length - 1]}
                            date: ${format(new Date(), DATE_FORMAT)}
                            current profit: ${expectedProfitPercent - 0.15}%
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
  } else {
    try {
      botState.updateState('status', 'isPending');
      botState.updateState('buyPrice', null);

      if (profitLevels) {
        const { available: beforeSellCryptoCoinBalance } = await getBalances(
          cryptoCoin,
        );
        const amount = binance.roundStep(
          Number(beforeSellCryptoCoinBalance),
          stepSize,
        );
        const order = await marketSell(symbol.toUpperCase(), +amount);
        botState.updateState('order', order);
      } else {
        const amount = binance.roundStep(
          Number(botState.availableCryptoCoin),
          stepSize,
        );
        const order = await marketSell(symbol.toUpperCase(), +amount);
        botState.updateState('order', order);
      }

      const { available: refreshedUSDTBalance } = await getBalances('USDT');
      const currentProfit =
        Number(refreshedUSDTBalance) - Number(botState.availableUSDT);
      botState.updateState('currentProfit', currentProfit);
      botState.updateState('availableUSDT', +refreshedUSDTBalance);
      botState.updateState(
        'totalProfit',
        Number(refreshedUSDTBalance) - Number(initialUSDTBalance),
      );
      botState.updateState(
        'totalPercentProfit',
        (botState.totalPercentProfit +=
          (currentProfit / botState.cummulativeQuoteQty) * 100),
      );
      const { available: afterSellCryptoCoinBalance } = await getBalances(
        cryptoCoin,
      );
      botState.updateState('availableCryptoCoin', +afterSellCryptoCoinBalance);
      await sendToRecipients(`SELL
                 ${botState.strategy}
                 Deal №: ${botState.dealsCount}
                 Sell reason: ${sellReason}
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.order.fills[0].price} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Current profit: ${
                   botState.currentProfit
                 } USDT (${(currentProfit / botState.cummulativeQuoteQt) *
        100} %)
                 Total profit: ${botState.totalProfit} USDT (${
        botState.totalPercentProfit
      } %)
                 Average deal profit: ${botState.totalProfit /
                   botState.dealsCount} USDT/deal (${botState.totalPercentProfit /
        botState.dealsCount} %)
                 Stablecoin balance: ${botState.availableUSDT} USDT
                 Cryptocoin balance: ${+botState.availableCryptoCoin} ${cryptoCoin}
                 OrderInfo: ${JSON.stringify(botState.order)}
                 Work duration: ${format(
                   botState.startTime - new Date().getTime(),
                   DATE_FORMAT,
                 )}
             `);
      botState.dealsCount++;
      botState.updateState('status', 'buy');
    } catch (e) {
      await sendToRecipients(`SELL ERROR
            ${JSON.stringify(e)}
      `);
      const { available: refreshedCryptoCoinBalance } = await getBalances(
        cryptoCoin,
      );
      botState.updateState('availableCryptoCoin', +refreshedCryptoCoinBalance);
      botState.updateState('status', 'sell');
    }
  }
};
