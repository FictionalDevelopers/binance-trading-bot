import { binance } from './binance';
import { sendToRecipients } from '../services/telegram';
import { format } from 'date-fns';
import { DATE_FORMAT } from '../constants/date';
import { getBalances, getFuturesBalances } from './balance';
import { service as botStateService } from '../components/botState';
import _omit from 'lodash/omit';
// import { indicatorsData } from '../index2';

export const marketBuy = (symbol: string, quantity: number): Promise<unknown> =>
  new Promise((resolve, reject) => {
    binance.marketBuy(symbol, quantity, (error, response) => {
      if (error) {
        return reject(error);
      }
      return resolve(response);
    });
  });

export const marketFuturesBuy = (
  symbol: string,
  quantity: number,
): Promise<unknown> =>
  new Promise((resolve, reject) => {
    binance.futuresMarketBuy(symbol, quantity, (error, response) => {
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

export const marketFuturesSell = (
  symbol: string,
  quantity: number,
): Promise<unknown> =>
  new Promise((resolve, reject) => {
    binance.futuresMarketSell(symbol, quantity, (error, response) => {
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
    Number(botState.availableCryptoCoin) * 0.33,
    stepSize,
  );

  try {
    const data = Promise.all([
      limitSell(
        symbol.toUpperCase(),
        +limitSellOrderAmount,
        +Number(botState.buyPrice * 1.005).toPrecision(4),
      ),
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
    ]);
    botState.updateState('enabledLimits', true);
  } catch (e) {
    await sendToRecipients(`LIMIT SELL ORDER ERROR
            ${JSON.stringify(e)}
      `);
    botState.updateState('enabledLimits', false);
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
  indicatorsData,
  stopLoss = false,
) => {
  if (botState.testMode) {
    if (!botState.strategies[`${strategy}`].stopLoss) {
      try {
        botState.updateState('status', 'isPending');
        botState.updateState('buyPrice', null);
        if (botState.dealType === 'long')
          botState.updateState(
            'totalLongProfit',
            (botState.totalLongProfit += expectedProfitPercent - 0.2),
          );
        else if (botState.dealType === 'short')
          botState.updateState(
            'totalShortProfit',
            (botState.totalShortProfit += expectedProfitPercent + 0.2),
          );

        if (botState.dealType === 'long') {
          botState.updateState(
            'totalMinAvailableLongProfit',
            (botState.totalMinAvailableLongProfit +=
              botState.minAvailableLongProfit - 0.2),
          );
          botState.updateState(
            'totalMaxAvailableLongProfit',
            (botState.totalMaxAvailableLongProfit +=
              botState.maxAvailableLongProfit - 0.2),
          );
        } else if (botState.dealType === 'short') {
          botState.updateState(
            'totalMaxAvailableShortProfit',
            (botState.totalMaxAvailableShortProfit +=
              botState.maxAvailableShortProfit + 0.2),
          );
          botState.updateState(
            'totalMinAvailableShortProfit',
            (botState.totalMinAvailableShortProfit +=
              botState.minAvailableShortProfit + 0.2),
          );
        }

        if (botState.logToTelegram) {
          await sendToRecipients(`SELL ${
            botState.local ? '(LOCAL)' : '(REMOTE)'
          }
                                    Strategy: ${strategy}
                                    Deal Type: ${botState.dealType.toUpperCase()}
                                    Sell reason: ${sellReason}
                                    Deal №: ${botState.dealsCount}
                                    Symbol: ${symbol.toUpperCase()}
                                    Price: ${
                                      pricesStream[pricesStream.length - 1]
                                    }
                                    Date: ${format(new Date(), DATE_FORMAT)}
                                    Indicators data: 
                                    OBV 5m: BSC: ${
                                      indicatorsData.obv5m.buySignalCount
                                    } SSC: ${
            indicatorsData.obv5m.sellSignalCount
          }
                                    OBV 1m: BSC: ${
                                      indicatorsData.obv1m.buySignalCount
                                    } SSC: ${
            indicatorsData.obv1m.sellSignalCount
          }
                                    Current profit: ${
                                      botState.dealType === 'long'
                                        ? expectedProfitPercent - 0.2
                                        : expectedProfitPercent + 0.2
                                    } %
                                    Max av profit: ${
                                      botState.dealType === 'long'
                                        ? botState.maxAvailableLongProfit - 0.2
                                        : botState.maxAvailableShortProfit + 0.2
                                    } %
                                    Min av profit: ${
                                      botState.dealType === 'long'
                                        ? botState.minAvailableLongProfit - 0.2
                                        : botState.minAvailableShortProfit + 0.2
                                    } %
                                    Total Long profit: ${
                                      botState.totalLongProfit
                                    } %
                                    Total Short profit: ${
                                      botState.totalShortProfit
                                    } %
                                    Avg Deal Profit: ${botState.totalProfit /
                                      botState.dealsCount} %
                                    Total max av Long profit: ${
                                      botState.totalMaxAvailableLongProfit
                                    } %
                                    Total max av Short profit: ${
                                      botState.totalMaxAvailableShortProfit
                                    } %
                                    Total min av Long profit: ${
                                      botState.totalMinAvailableLongProfit
                                    } %
                                    Total min av Short profit: ${
                                      botState.totalMinAvailableShortProfit
                                    } %
                      `);
        }
        console.log(`SELL 
                                  Strategy: ${strategy}
                                  Sell reason: ${sellReason}
                                  Symbol: ${symbol.toUpperCase()}
                                  Price: ${
                                    pricesStream[pricesStream.length - 1]
                                  }
                                  Date: ${format(new Date(), DATE_FORMAT)}
                                  Current profit: ${expectedProfitPercent -
                                    0.2} %
                                  Total profit: ${botState.totalProfit} %
                                  Avg Deal Profit: ${botState.totalProfit /
                                    botState.dealsCount} %
                                  Max av profit: ${botState.maxAvailableProfit -
                                    0.2} %
                                  Total max av profit: ${
                                    botState.totalMaxAvailableProfit
                                  } %
                                  Min av profit: ${botState.minAvailableProfit -
                                    0.2}%
                                  Total min av profit: ${
                                    botState.totalMinAvailableProfit
                                  } %
                    `);
        botState.dealsCount++;
        botState.dmi5m.adx = indicatorsData.dmi5m.adx;
        botState.dmi5m.adxUpCount = indicatorsData.dmi5m.adxUpCount;
        botState.dmi5m.adxDownCount = indicatorsData.dmi5m.adxDownCount;
        botState.dmi1m.adx = indicatorsData.dmi1m.adx;
        botState.dmi1m.adxUpCount = indicatorsData.dmi1m.adxUpCount;
        botState.dmi1m.adxDownCount = indicatorsData.dmi1m.adxDownCount;
        // indicatorsData.obv1h.buySignalCount = 0;
        // indicatorsData.obv15m.buySignalCount = 0;
        // indicatorsData.obv5m.buySignalCount = 0;
        // indicatorsData.obv1m.buySignalCount = 0;
        // indicatorsData.obv5m.signal = null;
        // indicatorsData.obv1m.signal = null;
        // indicatorsData.obv15m.signal = null;
        // indicatorsData.obv1h.signal = null;
        // indicatorsData.obv1h.sellSignalCount = 0;
        // indicatorsData.obv15m.sellSignalCount = 0;
        // indicatorsData.obv5m.sellSignalCount = 0;
        // indicatorsData.obv1m.sellSignalCount = 0;
        indicatorsData.dmi1m.adxUpCount = 0;
        indicatorsData.dmi1m.adxDownCount = 0;
        indicatorsData.dmi5m.adxUpCount = 0;
        indicatorsData.dmi5m.adxDownCount = 0;
        botState.maxAvailableLongProfit = 0;
        botState.maxAvailableShortProfit = 0;
        botState.minAvailableLongProfit = 0;
        botState.minAvailableShortProfit = 0;
        indicatorsData.avgDealPriceDownSignalCount = 0;
        indicatorsData.avgDealPriceUpSignalCount = 0;
        indicatorsData.avgDealPriceSignal = null;
        indicatorsData.avgDealPriceDiff = 0;
        botState.avgDealPrice = 0;
        botState.dealPricesArr = [];
        botState.confirmation = false;
        botState.initialDealType = null;
        if (!stopLoss) botState.updateState('status', 'buy');
        else {
          botState.strategies[`${strategy}`].stopLoss = true;
          botState.updateState('status', 'sell');
        }
        if (!botState.local) {
          await botStateService.trackBotState(
            _omit(botState, [
              'availableUSDT',
              'availableCryptoCoin',
              'updateState',
            ]),
          );
        }
      } catch (e) {
        await sendToRecipients(`SELL ERROR
                  ${JSON.stringify(e)}
            `);
        botState.updateState('status', 'sell');
      }
    } else {
      botState.initialDealType = null;
      botState.updateState('status', 'isPending');
      botState.strategies[`${strategy}`].stopLoss = false;
      botState.updateState('status', 'buy');
      console.log('status', botState.status);
      console.log('stopLoss', botState.strategies[`${strategy}`].stopLoss);
    }
  } else {
    if (!botState.strategies[`${strategy}`].stopLoss) {
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
          botState.updateState('enabledLimits', false);
        } else {
          let amount;
          if (botState.dealType === 'long') {
            amount = binance.roundStep(+botState.order.executedQty, stepSize);
          } else if (botState.dealType === 'short') {
            amount = binance.roundStep(+botState.order.executedQty, stepSize);
          }

          let order;
          if (botState.dealType === 'long') {
            order = await marketSell(symbol.toUpperCase(), +amount);
          } else if (botState.dealType === 'short') {
            order = await marketBuy(symbol.toUpperCase(), +amount);
          }
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
          'totalMaxAvailableProfit',
          (botState.totalMaxAvailableProfit +=
            botState.maxAvailableProfit - 0.2),
        );
        botState.updateState(
          'totalMinAvailableProfit',
          (botState.totalMinAvailableProfit +=
            botState.minAvailableProfit - 0.2),
        );
        botState.updateState(
          'totalPercentProfit',
          (botState.totalPercentProfit +=
            (currentProfit / botState.cummulativeQuoteQty) * 100),
        );
        const { available: afterSellCryptoCoinBalance } = await getBalances(
          cryptoCoin,
        );
        botState.updateState(
          'availableCryptoCoin',
          +afterSellCryptoCoinBalance,
        );
        botState.dmi5m.adx = indicatorsData.dmi5m.adx;
        botState.dmi5m.adxUpCount = indicatorsData.dmi5m.adxUpCount;
        botState.dmi5m.adxDownCount = indicatorsData.dmi5m.adxDownCount;
        botState.dmi1m.adx = indicatorsData.dmi1m.adx;
        botState.dmi1m.adxUpCount = indicatorsData.dmi1m.adxUpCount;
        botState.dmi1m.adxDownCount = indicatorsData.dmi1m.adxDownCount;
        // indicatorsData.obv4h.buySignalCount = 0;
        // indicatorsData.obv1h.buySignalCount = 0;
        // indicatorsData.obv15m.buySignalCount = 0;
        // indicatorsData.obv5m.buySignalCount = 0;
        // indicatorsData.obv1m.buySignalCount = 0;
        // indicatorsData.obv15m.sellSignalCount = 0;
        // indicatorsData.obv1h.sellSignalCount = 0;
        // indicatorsData.obv5m.sellSignalCount = 0;
        // indicatorsData.obv1m.sellSignalCount = 0;
        // indicatorsData.obv5m.signal = null;
        // indicatorsData.obv1m.signal = null;
        // indicatorsData.obv15m.signal = null;
        // indicatorsData.obv1h.signal = null;
        indicatorsData.dmi1m.adxUpCount = 0;
        indicatorsData.dmi1m.adxDownCount = 0;
        indicatorsData.dmi5m.adxUpCount = 0;
        indicatorsData.dmi5m.adxDownCount = 0;
        botState.maxAvailableLongProfit = 0;
        botState.maxAvailableShortProfit = 0;
        botState.minAvailableLongProfit = 0;
        botState.minAvailableShortProfit = 0;
        indicatorsData.avgDealPriceDownSignalCount = 0;
        indicatorsData.avgDealPriceUpSignalCount = 0;
        indicatorsData.avgDealPriceSignal = null;
        indicatorsData.avgDealPriceDiff = 0;
        botState.avgDealPrice = 0;
        botState.dealPricesArr = [];
        botState.confirmation = false;
        botState.initialDealType = null;
        if (!stopLoss) botState.updateState('status', 'buy');
        else {
          botState.strategies[`${strategy}`].stopLoss = true;
          botState.updateState('status', 'sell');
        }
        await botStateService.trackBotState(
          _omit(botState, [
            'availableUSDT',
            'availableCryptoCoin',
            'updateState',
          ]),
        );
        botState.updateState('sellError', false);
        await sendToRecipients(`SELL
                 Strategy: ${strategy}
                 Reason: ${sellReason}
                 Deal Type: ${botState.dealType.toUpperCase()}
                 Deal №: ${botState.dealsCount}
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.order.fills[0].price} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Current profit: ${
                   botState.currentProfit
                 } USDT (${(currentProfit / botState.cummulativeQuoteQty) *
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
        botState.updateState(
          'availableCryptoCoin',
          +refreshedCryptoCoinBalance,
        );
        botState.updateState('sellError', true);
        botState.updateState('status', 'sell');
      }
    } else {
      botState.updateState('status', 'isPending');
      botState.strategies[`${strategy}`].stopLoss = false;
      botState.updateState('enabledLimits', false);
      const { available: refreshedUSDTBalance } = await getBalances('USDT');
      botState.updateState('availableUSDT', +refreshedUSDTBalance);
      const { available: refreshedCryptoCoinBalance } = await getBalances(
        cryptoCoin,
      );
      botState.updateState('availableCryptoCoin', refreshedCryptoCoinBalance);
      botState.dealsCount++;
      botState.initialDealType = null;
      botState.updateState('status', 'buy');
      await botStateService.trackBotState(
        _omit(botState, [
          'availableUSDT',
          'availableCryptoCoin',
          'updateState',
        ]),
      );
    }
  }
};
export const marketFuturesSellAction = async (
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
  indicatorsData,
  stopLoss = false,
) => {
  if (botState.testMode) {
    if (!botState.strategies[`${strategy}`].stopLoss) {
      try {
        botState.updateState('status', 'isPending');
        botState.updateState('buyPrice', null);
        if (botState.dealType === 'long')
          botState.updateState(
            'totalLongProfit',
            (botState.totalLongProfit += expectedProfitPercent - 0.2),
          );
        else if (botState.dealType === 'short')
          botState.updateState(
            'totalShortProfit',
            (botState.totalShortProfit += expectedProfitPercent + 0.2),
          );

        if (botState.dealType === 'long') {
          botState.updateState(
            'totalMinAvailableLongProfit',
            (botState.totalMinAvailableLongProfit +=
              botState.minAvailableLongProfit - 0.2),
          );
          botState.updateState(
            'totalMaxAvailableLongProfit',
            (botState.totalMaxAvailableLongProfit +=
              botState.maxAvailableLongProfit - 0.2),
          );
        } else if (botState.dealType === 'short') {
          botState.updateState(
            'totalMaxAvailableShortProfit',
            (botState.totalMaxAvailableShortProfit +=
              botState.maxAvailableShortProfit + 0.2),
          );
          botState.updateState(
            'totalMinAvailableShortProfit',
            (botState.totalMinAvailableShortProfit +=
              botState.minAvailableShortProfit + 0.2),
          );
        }

        if (botState.logToTelegram) {
          await sendToRecipients(`SELL ${
            botState.local ? '(LOCAL)' : '(REMOTE)'
          }
                                    Strategy: ${strategy}
                                    Deal Type: ${botState.dealType.toUpperCase()}
                                    Sell reason: ${sellReason}
                                    Deal №: ${botState.dealsCount}
                                    Symbol: ${symbol.toUpperCase()}
                                    Price: ${
                                      pricesStream[pricesStream.length - 1]
                                    }
                                    Date: ${format(new Date(), DATE_FORMAT)}
                                    Indicators data: 
                                    OBV 5m: BSC: ${
                                      indicatorsData.obv5m.buySignalCount
                                    } SSC: ${
            indicatorsData.obv5m.sellSignalCount
          }
                                    OBV 1m: BSC: ${
                                      indicatorsData.obv1m.buySignalCount
                                    } SSC: ${
            indicatorsData.obv1m.sellSignalCount
          }
                                    Current profit: ${
                                      botState.dealType === 'long'
                                        ? expectedProfitPercent - 0.2
                                        : expectedProfitPercent + 0.2
                                    } %
                                    Max av profit: ${
                                      botState.dealType === 'long'
                                        ? botState.maxAvailableLongProfit - 0.2
                                        : botState.maxAvailableShortProfit + 0.2
                                    } %
                                    Min av profit: ${
                                      botState.dealType === 'long'
                                        ? botState.minAvailableLongProfit - 0.2
                                        : botState.minAvailableShortProfit + 0.2
                                    } %
                                    Total Long profit: ${
                                      botState.totalLongProfit
                                    } %
                                    Total Short profit: ${
                                      botState.totalShortProfit
                                    } %
                                    Avg Deal Profit: ${botState.totalProfit /
                                      botState.dealsCount} %
                                    Total max av Long profit: ${
                                      botState.totalMaxAvailableLongProfit
                                    } %
                                    Total max av Short profit: ${
                                      botState.totalMaxAvailableShortProfit
                                    } %
                                    Total min av Long profit: ${
                                      botState.totalMinAvailableLongProfit
                                    } %
                                    Total min av Short profit: ${
                                      botState.totalMinAvailableShortProfit
                                    } %
                      `);
        }
        console.log(`SELL 
                                  Strategy: ${strategy}
                                  Sell reason: ${sellReason}
                                  Symbol: ${symbol.toUpperCase()}
                                  Price: ${
                                    pricesStream[pricesStream.length - 1]
                                  }
                                  Date: ${format(new Date(), DATE_FORMAT)}
                                  Current profit: ${expectedProfitPercent -
                                    0.2} %
                                  Total profit: ${botState.totalProfit} %
                                  Avg Deal Profit: ${botState.totalProfit /
                                    botState.dealsCount} %
                                  Max av profit: ${botState.maxAvailableProfit -
                                    0.2} %
                                  Total max av profit: ${
                                    botState.totalMaxAvailableProfit
                                  } %
                                  Min av profit: ${botState.minAvailableProfit -
                                    0.2}%
                                  Total min av profit: ${
                                    botState.totalMinAvailableProfit
                                  } %
                    `);
        botState.dealsCount++;
        botState.dmi5m.adx = indicatorsData.dmi5m.adx;
        botState.dmi5m.adxUpCount = indicatorsData.dmi5m.adxUpCount;
        botState.dmi5m.adxDownCount = indicatorsData.dmi5m.adxDownCount;
        botState.dmi1m.adx = indicatorsData.dmi1m.adx;
        botState.dmi1m.adxUpCount = indicatorsData.dmi1m.adxUpCount;
        botState.dmi1m.adxDownCount = indicatorsData.dmi1m.adxDownCount;
        // indicatorsData.obv1h.buySignalCount = 0;
        // indicatorsData.obv15m.buySignalCount = 0;
        // indicatorsData.obv5m.buySignalCount = 0;
        // indicatorsData.obv1m.buySignalCount = 0;
        // indicatorsData.obv5m.signal = null;
        // indicatorsData.obv1m.signal = null;
        // indicatorsData.obv15m.signal = null;
        // indicatorsData.obv1h.signal = null;
        // indicatorsData.obv1h.sellSignalCount = 0;
        // indicatorsData.obv15m.sellSignalCount = 0;
        // indicatorsData.obv5m.sellSignalCount = 0;
        // indicatorsData.obv1m.sellSignalCount = 0;
        indicatorsData.dmi1m.adxUpCount = 0;
        indicatorsData.dmi1m.adxDownCount = 0;
        indicatorsData.dmi5m.adxUpCount = 0;
        indicatorsData.dmi5m.adxDownCount = 0;
        botState.maxAvailableLongProfit = 0;
        botState.maxAvailableShortProfit = 0;
        botState.minAvailableLongProfit = 0;
        botState.minAvailableShortProfit = 0;
        indicatorsData.avgDealPriceDownSignalCount = 0;
        indicatorsData.avgDealPriceUpSignalCount = 0;
        indicatorsData.avgDealPriceSignal = null;
        indicatorsData.avgDealPriceDiff = 0;
        botState.avgDealPrice = 0;
        botState.dealPricesArr = [];
        botState.confirmation = false;
        botState.initialDealType = null;
        if (!stopLoss) botState.updateState('status', 'buy');
        else {
          botState.strategies[`${strategy}`].stopLoss = true;
          botState.updateState('status', 'sell');
        }
        if (!botState.local) {
          await botStateService.trackBotState(
            _omit(botState, [
              'availableUSDT',
              'availableCryptoCoin',
              'updateState',
            ]),
          );
        }
      } catch (e) {
        await sendToRecipients(`SELL ERROR
                  ${JSON.stringify(e)}
            `);
        botState.updateState('status', 'sell');
      }
    } else {
      botState.initialDealType = null;
      botState.updateState('status', 'isPending');
      botState.strategies[`${strategy}`].stopLoss = false;
      botState.updateState('status', 'buy');
      console.log('status', botState.status);
      console.log('stopLoss', botState.strategies[`${strategy}`].stopLoss);
    }
  } else {
    if (!botState.strategies[`${strategy}`].stopLoss) {
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
          botState.updateState('enabledLimits', false);
        } else {
          let amount;
          if (botState.dealType === 'long') {
            amount = binance.roundStep(+botState.order.executedQty, stepSize);
          } else if (botState.dealType === 'short') {
            amount = binance.roundStep(+botState.order.executedQty, stepSize);
          }

          let order;
          if (botState.dealType === 'long') {
            order = await marketFuturesSell(symbol.toUpperCase(), +amount);
          } else if (botState.dealType === 'short') {
            order = await marketFuturesBuy(symbol.toUpperCase(), +amount);
          }
          botState.updateState('order', order);
        }

        const { available: refreshedUSDTBalance } = await getFuturesBalances(
          'USDT',
        );
        const currentProfit =
          Number(refreshedUSDTBalance) - Number(botState.availableUSDT);
        botState.updateState('currentProfit', currentProfit);
        botState.updateState('availableUSDT', +refreshedUSDTBalance);
        botState.updateState(
          'totalProfit',
          Number(refreshedUSDTBalance) - Number(initialUSDTBalance),
        );
        botState.updateState(
          'totalMaxAvailableProfit',
          (botState.totalMaxAvailableProfit +=
            botState.maxAvailableProfit - 0.2),
        );
        botState.updateState(
          'totalMinAvailableProfit',
          (botState.totalMinAvailableProfit +=
            botState.minAvailableProfit - 0.2),
        );
        botState.updateState(
          'totalPercentProfit',
          (botState.totalPercentProfit +=
            (currentProfit / botState.cummulativeQuoteQty) * 100),
        );
        const { available: afterSellCryptoCoinBalance } = await getBalances(
          cryptoCoin,
        );
        botState.updateState(
          'availableCryptoCoin',
          +afterSellCryptoCoinBalance,
        );
        botState.dmi5m.adx = indicatorsData.dmi5m.adx;
        botState.dmi5m.adxUpCount = indicatorsData.dmi5m.adxUpCount;
        botState.dmi5m.adxDownCount = indicatorsData.dmi5m.adxDownCount;
        botState.dmi1m.adx = indicatorsData.dmi1m.adx;
        botState.dmi1m.adxUpCount = indicatorsData.dmi1m.adxUpCount;
        botState.dmi1m.adxDownCount = indicatorsData.dmi1m.adxDownCount;
        // indicatorsData.obv4h.buySignalCount = 0;
        // indicatorsData.obv1h.buySignalCount = 0;
        // indicatorsData.obv15m.buySignalCount = 0;
        // indicatorsData.obv5m.buySignalCount = 0;
        // indicatorsData.obv1m.buySignalCount = 0;
        // indicatorsData.obv15m.sellSignalCount = 0;
        // indicatorsData.obv1h.sellSignalCount = 0;
        // indicatorsData.obv5m.sellSignalCount = 0;
        // indicatorsData.obv1m.sellSignalCount = 0;
        // indicatorsData.obv5m.signal = null;
        // indicatorsData.obv1m.signal = null;
        // indicatorsData.obv15m.signal = null;
        // indicatorsData.obv1h.signal = null;
        indicatorsData.dmi1m.adxUpCount = 0;
        indicatorsData.dmi1m.adxDownCount = 0;
        indicatorsData.dmi5m.adxUpCount = 0;
        indicatorsData.dmi5m.adxDownCount = 0;
        botState.maxAvailableLongProfit = 0;
        botState.maxAvailableShortProfit = 0;
        botState.minAvailableLongProfit = 0;
        botState.minAvailableShortProfit = 0;
        indicatorsData.avgDealPriceDownSignalCount = 0;
        indicatorsData.avgDealPriceUpSignalCount = 0;
        indicatorsData.avgDealPriceSignal = null;
        indicatorsData.avgDealPriceDiff = 0;
        botState.avgDealPrice = 0;
        botState.dealPricesArr = [];
        botState.confirmation = false;
        botState.initialDealType = null;
        if (!stopLoss) botState.updateState('status', 'buy');
        else {
          botState.strategies[`${strategy}`].stopLoss = true;
          botState.updateState('status', 'sell');
        }
        await botStateService.trackBotState(
          _omit(botState, [
            'availableUSDT',
            'availableCryptoCoin',
            'updateState',
          ]),
        );
        botState.updateState('sellError', false);
        await sendToRecipients(`SELL
                 Strategy: ${strategy}
                 Reason: ${sellReason}
                 Deal Type: ${botState.dealType.toUpperCase()}
                 Deal №: ${botState.dealsCount}
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.order.fills[0].price} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Current profit: ${
                   botState.currentProfit
                 } USDT (${(currentProfit / botState.cummulativeQuoteQty) *
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
        botState.updateState(
          'availableCryptoCoin',
          +refreshedCryptoCoinBalance,
        );
        botState.updateState('sellError', true);
        botState.updateState('status', 'sell');
      }
    } else {
      botState.updateState('status', 'isPending');
      botState.strategies[`${strategy}`].stopLoss = false;
      botState.updateState('enabledLimits', false);
      const { available: refreshedUSDTBalance } = await getBalances('USDT');
      botState.updateState('availableUSDT', +refreshedUSDTBalance);
      const { available: refreshedCryptoCoinBalance } = await getBalances(
        cryptoCoin,
      );
      botState.updateState('availableCryptoCoin', refreshedCryptoCoinBalance);
      botState.dealsCount++;
      botState.initialDealType = null;
      botState.updateState('status', 'buy');
      await botStateService.trackBotState(
        _omit(botState, [
          'availableUSDT',
          'availableCryptoCoin',
          'updateState',
        ]),
      );
    }
  }
};

export const marketBuyAction = async (
  dealType,
  profitLevels,
  symbol,
  botState,
  cryptoCoin,
  pricesStream,
  stepSize,
  strategy,
  assetAmount,
  buyReason,
  indicatorsData,
) => {
  if (botState.testMode) {
    try {
      botState.updateState('status', 'isPending');
      botState.updateState(
        'buyPrice',
        Number(pricesStream[pricesStream.length - 1]),
      );
      botState.updateState('lastBid', indicatorsData.scalper.lastBid);
      botState.dmi5m.adx = indicatorsData.dmi5m.adx;
      botState.dmi5m.adxUpCount = indicatorsData.dmi5m.adxUpCount;
      botState.dmi5m.adxDownCount = indicatorsData.dmi5m.adxDownCount;
      botState.dmi1m.adx = indicatorsData.dmi1m.adx;
      botState.dmi1m.adxUpCount = indicatorsData.dmi1m.adxUpCount;
      botState.dmi1m.adxDownCount = indicatorsData.dmi1m.adxDownCount;
      indicatorsData.dmi1m.adxUpCount = 0;
      indicatorsData.dmi1m.adxDownCount = 0;
      indicatorsData.dmi5m.adxUpCount = 0;
      indicatorsData.dmi5m.adxDownCount = 0;
      if (botState.logToTelegram) {
        await sendToRecipients(`BUY ${botState.local ? '(LOCAL)' : '(REMOTE)'}
                               Strategy:${strategy}
                               Reason: ${buyReason}
                               Deal Type: ${dealType.toUpperCase()}
                               Deal №: ${botState.dealsCount}
                               Symbol: ${symbol.toUpperCase()}
                               Price: ${botState.buyPrice}
                               Date: ${format(new Date(), DATE_FORMAT)}
                               Indicators data: 
                               OBV 5m: BSC: ${
                                 indicatorsData.obv5m.buySignalCount
                               } SSC: ${indicatorsData.obv5m.sellSignalCount}
                               OBV 1m: BSC: ${
                                 indicatorsData.obv1m.buySignalCount
                               } SSC: ${indicatorsData.obv1m.sellSignalCount}
                `);
      }
      console.log(`BUY
                             Strategy:${strategy}
                             Reason: ${buyReason}
                             Deal Type: ${dealType.toUpperCase()}
                             Deal №: ${botState.dealsCount}
                             Symbol: ${symbol.toUpperCase()}
                             Price: ${botState.buyPrice}
                             Date: ${format(new Date(), DATE_FORMAT)}
              `);
      botState.confirmation = false;
      botState.updateState('dealType', dealType);
      botState.updateState('status', 'sell');
      botState.updateState('prevPrice', botState.currentPrice);
      if (!botState.local) {
        await botStateService.trackBotState(
          _omit(botState, [
            'availableUSDT',
            'availableCryptoCoin',
            'updateState',
          ]),
        );
      }
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

      let amount;
      if (dealType === 'long') {
        amount = binance.roundStep(
          assetAmount / botState.currentPrice,
          stepSize,
        );
      } else if (dealType === 'short') {
        amount = binance.roundStep(Number(assetAmount), stepSize);
      }

      let order;
      if (dealType === 'long') {
        order = await marketBuy(symbol.toUpperCase(), +amount);
      } else if (dealType === 'short') {
        order = await marketSell(symbol.toUpperCase(), +amount);
      }

      botState.updateState('buyPrice', Number(order.fills[0].price));
      botState.updateState('order', order);
      botState.updateState(
        'cummulativeQuoteQty',
        Number(order.cummulativeQuoteQty),
      );
      const { available: refreshedCryptoCoinBalance } = await getBalances(
        cryptoCoin,
      );
      const { available: refreshedStableCoinBalance } = await getBalances(
        'USDT',
      );
      botState.updateState('availableCryptoCoin', refreshedCryptoCoinBalance);
      botState.updateState('availableUSDT', refreshedStableCoinBalance);
      await sendToRecipients(`BUY
                 Strategy: ${strategy}
                 Reason: ${buyReason}
                 ${botState.strategy}
                 Deal Type: ${dealType.toUpperCase()}
                 Deal №: ${botState.dealsCount}
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.buyPrice} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Stablecoin balance: ${botState.availableUSDT} USDT
                 Stablecoin deal amount: ${Number(
                   order.cummulativeQuoteQty,
                 )} USDT
                 Cryptocoin balance: ${+botState.availableCryptoCoin} ${cryptoCoin}
                 Cryptocoin deal amount: ${Number(
                   order.executedQty,
                 )} ${cryptoCoin}
                 OrderInfo: ${JSON.stringify(botState.order)}
             `);
      if (profitLevels) {
        await setLimitSellOrders(symbol, botState, stepSize);
      }
      botState.updateState('dealType', dealType);
      botState.updateState('status', 'sell');
      botState.updateState('prevPrice', botState.currentPrice);
      await botStateService.trackBotState(
        _omit(botState, [
          'availableUSDT',
          'availableCryptoCoin',
          'updateState',
        ]),
      );
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

export const marketFuturesBuyAction = async (
  dealType,
  profitLevels,
  symbol,
  botState,
  cryptoCoin,
  pricesStream,
  stepSize,
  strategy,
  assetAmount,
  buyReason,
  indicatorsData,
) => {
  if (botState.testMode) {
    try {
      botState.updateState('status', 'isPending');
      botState.updateState(
        'buyPrice',
        Number(pricesStream[pricesStream.length - 1]),
      );
      botState.updateState('lastBid', indicatorsData.scalper.lastBid);
      botState.dmi5m.adx = indicatorsData.dmi5m.adx;
      botState.dmi5m.adxUpCount = indicatorsData.dmi5m.adxUpCount;
      botState.dmi5m.adxDownCount = indicatorsData.dmi5m.adxDownCount;
      botState.dmi1m.adx = indicatorsData.dmi1m.adx;
      botState.dmi1m.adxUpCount = indicatorsData.dmi1m.adxUpCount;
      botState.dmi1m.adxDownCount = indicatorsData.dmi1m.adxDownCount;
      indicatorsData.dmi1m.adxUpCount = 0;
      indicatorsData.dmi1m.adxDownCount = 0;
      indicatorsData.dmi5m.adxUpCount = 0;
      indicatorsData.dmi5m.adxDownCount = 0;
      if (botState.logToTelegram) {
        await sendToRecipients(`BUY ${botState.local ? '(LOCAL)' : '(REMOTE)'}
                               Strategy:${strategy}
                               Reason: ${buyReason}
                               Deal Type: ${dealType.toUpperCase()}
                               Deal №: ${botState.dealsCount}
                               Symbol: ${symbol.toUpperCase()}
                               Price: ${botState.buyPrice}
                               Date: ${format(new Date(), DATE_FORMAT)}
                               Indicators data: 
                               OBV 5m: BSC: ${
                                 indicatorsData.obv5m.buySignalCount
                               } SSC: ${indicatorsData.obv5m.sellSignalCount}
                               OBV 1m: BSC: ${
                                 indicatorsData.obv1m.buySignalCount
                               } SSC: ${indicatorsData.obv1m.sellSignalCount}
                `);
      }
      console.log(`BUY
                             Strategy:${strategy}
                             Reason: ${buyReason}
                             Deal Type: ${dealType.toUpperCase()}
                             Deal №: ${botState.dealsCount}
                             Symbol: ${symbol.toUpperCase()}
                             Price: ${botState.buyPrice}
                             Date: ${format(new Date(), DATE_FORMAT)}
              `);
      botState.confirmation = false;
      botState.updateState('dealType', dealType);
      botState.updateState('status', 'sell');
      botState.updateState('prevPrice', botState.currentPrice);
      if (!botState.local) {
        await botStateService.trackBotState(
          _omit(botState, [
            'availableUSDT',
            'availableCryptoCoin',
            'updateState',
          ]),
        );
      }
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

      let amount;
      if (dealType === 'long') {
        amount = binance.roundStep(
          assetAmount / botState.currentPrice,
          stepSize,
        );
      } else if (dealType === 'short') {
        amount = binance.roundStep(
          assetAmount / botState.currentPrice,
          stepSize,
        );
      }

      let order;
      if (dealType === 'long') {
        order = await marketFuturesBuy(symbol.toUpperCase(), +amount);
      } else if (dealType === 'short') {
        order = await marketFuturesSell(symbol.toUpperCase(), +amount);
      }

      botState.updateState('buyPrice', Number(order.fills[0].price));
      botState.updateState('order', order);
      botState.updateState(
        'cummulativeQuoteQty',
        Number(order.cummulativeQuoteQty),
      );
      const {
        available: refreshedCryptoCoinBalance,
      } = await getFuturesBalances(cryptoCoin);
      const {
        available: refreshedStableCoinBalance,
      } = await getFuturesBalances('USDT');
      botState.updateState('availableCryptoCoin', refreshedCryptoCoinBalance);
      botState.updateState('availableUSDT', refreshedStableCoinBalance);
      await sendToRecipients(`BUY
                 Strategy: ${strategy}
                 Reason: ${buyReason}
                 ${botState.strategy}
                 Deal Type: ${dealType.toUpperCase()}
                 Deal №: ${botState.dealsCount}
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.buyPrice} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Stablecoin balance: ${botState.availableUSDT} USDT
                 Stablecoin deal amount: ${Number(
                   order.cummulativeQuoteQty,
                 )} USDT
                 Cryptocoin balance: ${+botState.availableCryptoCoin} ${cryptoCoin}
                 Cryptocoin deal amount: ${Number(
                   order.executedQty,
                 )} ${cryptoCoin}
                 OrderInfo: ${JSON.stringify(botState.order)}
             `);
      if (profitLevels) {
        await setLimitSellOrders(symbol, botState, stepSize);
      }
      botState.updateState('dealType', dealType);
      botState.updateState('status', 'sell');
      botState.updateState('prevPrice', botState.currentPrice);
      await botStateService.trackBotState(
        _omit(botState, [
          'availableUSDT',
          'availableCryptoCoin',
          'updateState',
        ]),
      );
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
