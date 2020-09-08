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

export const getOrdersList = (symbol: string): Promise<unknown> =>
  new Promise((resolve, reject) => {
    binance.allOrders(symbol, (error, orders) => {
      if (error) {
        return reject(error);
      }
      return resolve(orders);
    });
  });

export const getTradesHistory = (symbol: string): Promise<unknown> =>
  new Promise((resolve, reject) => {
    binance.allOrders(symbol, (error, trades) => {
      if (error) {
        return reject(error);
      }
      return resolve(trades);
    });
  });

export const marketSellAction = async (
  profitLevel,
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
        (botState.totalProfit += expectedProfitPercent),
      );
      await sendToRecipients(`Sell
                            ${botState.strategy}
                            symbol: ${symbol.toUpperCase()}
                            price: ${pricesStream[pricesStream.length - 1]}
                            date: ${format(new Date(), DATE_FORMAT)}
                            current profit: ${expectedProfitPercent}%
                            total profit: ${botState.totalProfit}%
              `);
      botState.dealsCount++;
      if (profitLevel) profitLevel.isFilled = true;
      indicatorsData.dmi1h.willPriceGrow = false;
      indicatorsData.dmi1h.adxBuySignalVolume = 0;
      if (!profitLevel) {
        botState.updateState('status', 'buy');
        _forEach(botState.profitLevels, (val, key) => {
          botState.profitLevels[key].isFilled = false;
        });
      } else botState.updateState('status', 'sell');
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
      const amount = binance.roundStep(
        Number(botState.availableCryptoCoin) *
          (profitLevel ? profitLevel.amountPercent : 1),
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
      botState.updateState(
        'totalPercentProfit',
        (botState.totalPercentProfit +=
          (currentProfit /
            botState.cummulativeQuoteQty /
            (profitLevel ? profitLevel.amountPercent : 1)) *
          100),
      );
      const { available: refreshedCryptoCoinBalance } = await getBalances(
        cryptoCoin,
      );
      botState.updateState('availableCryptoCoin', +refreshedCryptoCoinBalance);
      await sendToRecipients(`SELL
                 ${botState.strategy}
                 Deal №: ${botState.dealsCount}
                 Sell reason: ${
                   profitLevel ? 'Profit level: ' + profitLevel.id : sellReason
                 }
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.order.fills[0].price} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Current profit: ${
                   botState.currentProfit
                 } USDT (${(currentProfit /
        botState.cummulativeQuoteQty /
        (profitLevel ? profitLevel.amountPercent : 1)) *
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
      if (profitLevel) profitLevel.isFilled = true;
      indicatorsData.dmi1h.willPriceGrow = false;
      indicatorsData.dmi1h.adxBuySignalVolume = 0;
      if (!profitLevel) {
        botState.updateState('status', 'buy');
        _forEach(botState.profitLevels, (val, key) => {
          botState.profitLevels[key].isFilled = false;
        });
      } else botState.updateState('status', 'sell');
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
