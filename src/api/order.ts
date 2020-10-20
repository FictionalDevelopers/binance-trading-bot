import { binance } from './binance';
import { sendToRecipients } from '../services/telegram';
import { format } from 'date-fns';
import { DATE_FORMAT } from '../constants/date';
import getBalances from './balance';
// import _forEach from 'lodash/forEach';

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

export const setLimitSellOrders = async (symbol, botState, stepSize) => {
  const limitSellOrderAmount = binance.roundStep(
    Number(botState.availableCryptoCoin) * 0.3333,
    stepSize,
  );

  try {
    const data = Promise.all([
      limitSell(
        symbol.toUpperCase(),
        +limitSellOrderAmount,
        +Number(botState.buyPrice * 1.01).toPrecision(4),
      ),
      limitSell(
        symbol.toUpperCase(),
        +limitSellOrderAmount,
        +Number(botState.buyPrice * 1.02).toPrecision(4),
      ),
      limitSell(
        symbol.toUpperCase(),
        +limitSellOrderAmount,
        +Number(botState.buyPrice * 1.04).toPrecision(4),
      ),
    ]);
    botState.enabledLimits = true;
  } catch (e) {
    await sendToRecipients(`LIMIT SELL ORDER ERROR
            ${JSON.stringify(e)}
      `);
    botState.enabledLimits = false;
  }
};

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
  strategy,
  profitLevels,
  symbol,
  botState,
  cryptoCoin,
  expectedProfitPercent,
  pricesStream,
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
      await sendToRecipients(`SELL 
                            Strategy: ${strategy}
                            Sell reason: ${sellReason}
                            symbol: ${symbol.toUpperCase()}
                            price: ${pricesStream[pricesStream.length - 1]}
                            date: ${format(new Date(), DATE_FORMAT)}
                            current profit: ${expectedProfitPercent - 0.15}%
                            total profit: ${botState.totalProfit}%
              `);
      console.log(`SELL 
                            Strategy: ${strategy}
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
                 Strategy: ${strategy}
                 Reason: ${sellReason}
                 Deal №: ${botState.dealsCount}
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

export const marketBuyAction = async (
  profitLevels,
  symbol,
  botState,
  cryptoCoin,
  pricesStream,
  stepSize,
  strategy,
  usdtAmount,
  buyReason,
) => {
  if (botState.testMode) {
    try {
      botState.updateState('status', 'isPending');
      botState.updateState(
        'buyPrice',
        Number(pricesStream[pricesStream.length - 1]),
      );
      await sendToRecipients(`BUY
                             Strategy:${strategy}
                             Reason: ${buyReason}
                             Deal №: ${botState.dealsCount}
                             symbol: ${symbol.toUpperCase()}
                             price: ${botState.buyPrice}
                             date: ${format(new Date(), DATE_FORMAT)}
              `);
      console.log(`BUY
                             Strategy:${strategy}
                             Reason: ${buyReason}
                             Deal №: ${botState.dealsCount}
                             symbol: ${symbol.toUpperCase()}
                             price: ${botState.buyPrice}
                             date: ${format(new Date(), DATE_FORMAT)}
              `);

      botState.updateState('status', 'sell');
      botState.updateState('prevPrice', botState.currentPrice);
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
        usdtAmount / botState.currentPrice,
        stepSize,
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
      botState.updateState('availableCryptoCoin', refreshedCryptoCoinBalance);
      await sendToRecipients(`BUY
                 Strategy: ${strategy}
                 Reason: ${buyReason}
                 ${botState.strategy}
                 Deal №: ${botState.dealsCount}
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.buyPrice} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Prebuy stablecoin balance: ${botState.availableUSDT} USDT
                 Cryptocoin balance: ${+botState.availableCryptoCoin} ${cryptoCoin}
                 OrderInfo: ${JSON.stringify(botState.order)}
             `);
      if (profitLevels) {
        await setLimitSellOrders(symbol, botState, stepSize);
      }
      botState.updateState('status', 'sell');
      botState.updateState('prevPrice', botState.currentPrice);
    } catch (e) {
      await sendToRecipients(`BUY ERROR
            ${JSON.stringify(e)}
      `);
      const { available: refreshedUSDTBalance } = await getBalances('USDT');
      botState.updateState('availableUSDT', +refreshedUSDTBalance);
      botState.updateState('status', 'buy');
    }
  }
};
