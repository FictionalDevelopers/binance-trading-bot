import { binance } from './binance';
import { sendToRecipients } from '../services/telegram';
import { format } from 'date-fns';
import { DATE_FORMAT } from '../constants/date';
import { getBalances, getFuturesBalances } from './balance';
import { service as botStateService } from '../components/botState';
import _omit from 'lodash/omit';
import { isObject } from 'rxjs/internal-compatibility';

const resetValuesAfterSell = (botState, indicatorsData) => {
  // botState.dmi5m.adx = indicatorsData.dmi5m.adx;
  // botState.dmi5m.adxUpCount = indicatorsData.dmi5m.adxUpCount;
  // botState.dmi5m.adxDownCount = indicatorsData.dmi5m.adxDownCount;
  // botState.dmi1m.adx = indicatorsData.dmi1m.adx;
  // botState.dmi1m.adxUpCount = indicatorsData.dmi1m.adxUpCount;
  // botState.dmi1m.adxDownCount = indicatorsData.dmi1m.adxDownCount;
  // indicatorsData.dmi1m.adxUpCount = 0;
  // indicatorsData.dmi1m.adxDownCount = 0;
  // indicatorsData.dmi5m.adxUpCount = 0;
  // indicatorsData.dmi5m.adxDownCount = 0;
  botState.sellVolume = null;
  botState.buyVolume = null;
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
};

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
export const limitFuturesSell = (
  symbol: string,
  quantity: number,
  price: number,
): Promise<unknown> =>
  new Promise((resolve, reject) => {
    binance.futuresSell(symbol, quantity, price, (error, response) => {
      if (error) {
        return reject(error);
      }
      return resolve(response);
    });
  });

export const limitFuturesBuy = (
  symbol: string,
  quantity: number,
  price: number,
): Promise<unknown> =>
  new Promise((resolve, reject) => {
    binance.futuresBuy(symbol, quantity, price, (error, response) => {
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
export const setFuturesLimitSellOrders = async (
  symbol,
  botState,
  stepSize,
  dealAmount,
  dealType,
) => {
  const limitSellOrderAmount = +Number(
    binance.roundStep(dealAmount, stepSize),
  ).toPrecision(2);

  if (dealType === 'long') {
    try {
      const data = await Promise.all([
        binance.futuresSell(
          symbol.toUpperCase(),
          +limitSellOrderAmount,
          +Number(botState.buyPrice * 1.005).toPrecision(4),
          { reduceOnly: true },
        ),
      ]);
      botState.updateState('enabledLimits', true);
      console.log(data);
    } catch (e) {
      await sendToRecipients(`LIMIT SELL ORDER ERROR
            ${JSON.stringify(e)}
      `);
      botState.updateState('enabledLimits', false);
    }
  } else if (dealType === 'short') {
    try {
      const data = await Promise.all([
        binance.futuresBuy(
          symbol.toUpperCase(),
          +limitSellOrderAmount,
          +Number(botState.buyPrice * 0.995).toPrecision(4),
          { reduceOnly: true },
        ),
      ]);
      botState.updateState('enabledLimits', true);
      console.log(data);
    } catch (e) {
      await sendToRecipients(`LIMIT SELL ORDER ERROR
            ${JSON.stringify(e)}
      `);
      botState.updateState('enabledLimits', false);
    }
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
            (botState.totalLongProfit += expectedProfitPercent - 0.08),
          );
        else if (botState.dealType === 'short')
          botState.updateState(
            'totalShortProfit',
            (botState.totalShortProfit += expectedProfitPercent + 0.08),
          );

        if (botState.dealType === 'long') {
          botState.updateState(
            'totalMinAvailableLongProfit',
            (botState.totalMinAvailableLongProfit +=
              botState.minAvailableLongProfit - 0.08),
          );
          botState.updateState(
            'totalMaxAvailableLongProfit',
            (botState.totalMaxAvailableLongProfit +=
              botState.maxAvailableLongProfit - 0.08),
          );
        } else if (botState.dealType === 'short') {
          botState.updateState(
            'totalMaxAvailableShortProfit',
            (botState.totalMaxAvailableShortProfit +=
              botState.maxAvailableShortProfit + 0.08),
          );
          botState.updateState(
            'totalMinAvailableShortProfit',
            (botState.totalMinAvailableShortProfit +=
              botState.minAvailableShortProfit + 0.08),
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
                                     OBV 2h: BSC: ${
                                       indicatorsData.obv2h.buySignalCount
                                     } SSC: ${
            indicatorsData.obv2h.sellSignalCount
          }
          OBV 1h: BSC: ${indicatorsData.obv1h.buySignalCount} SSC: ${
            indicatorsData.obv1h.sellSignalCount
          }                                   
          OBV 30m: BSC: ${indicatorsData.obv30m.buySignalCount} SSC: ${
            indicatorsData.obv30m.sellSignalCount
          }
          OBV 15m: BSC: ${indicatorsData.obv15m.buySignalCount} SSC: ${
            indicatorsData.obv15m.sellSignalCount
          }
          OBV 5m: BSC: ${indicatorsData.obv5m.buySignalCount} SSC: ${
            indicatorsData.obv5m.sellSignalCount
          }                         
          OBV 1m: BSC: ${indicatorsData.obv1m.buySignalCount} SSC: ${
            indicatorsData.obv1m.sellSignalCount
          }
          ATR 5m: ${'(UP: ' +
            indicatorsData.atr.atr5m.buySignalCount +
            ' ' +
            'DOWN: ' +
            indicatorsData.atr.atr5m.sellSignalCount +
            ' ' +
            'Current: ' +
            indicatorsData.atr.atr5m.prevAtr}
          ADX 1m: ${'(UP: ' +
            indicatorsData.dmi1m.adxUpCount +
            ' ' +
            'DOWN: ' +
            indicatorsData.dmi1m.adxDownCount +
            ' ' +
            'Current: ' +
            indicatorsData.dmi1m.adx}
        ADX 5m: ${'(UP: ' +
          indicatorsData.dmi5m.adxUpCount +
          ' ' +
          'DOWN: ' +
          indicatorsData.dmi5m.adxDownCount +
          ' ' +
          'Current: ' +
          indicatorsData.dmi5m.adx}
      ADX 15m: ${'(UP: ' +
        indicatorsData.dmi15m.adxUpCount +
        ' ' +
        'DOWN: ' +
        indicatorsData.dmi15m.adxDownCount +
        ' ' +
        'Current: ' +
        indicatorsData.dmi15m.adx}
        ADX 1h: ${'(UP: ' +
          indicatorsData.dmi1h.buySignalCount +
          ' ' +
          'DOWN: ' +
          indicatorsData.dmi1h.sellSignalCount +
          ' ' +
          'Current: ' +
          indicatorsData.dmi1h.adx}
      
      
                                    
                                    Current profit: ${
                                      botState.dealType === 'long'
                                        ? expectedProfitPercent - 0.08
                                        : expectedProfitPercent + 0.08
                                    } %
                                    Max av profit: ${
                                      botState.dealType === 'long'
                                        ? botState.maxAvailableLongProfit - 0.08
                                        : botState.maxAvailableShortProfit +
                                          0.08
                                    } %
                                    Min av profit: ${
                                      botState.dealType === 'long'
                                        ? botState.minAvailableLongProfit - 0.08
                                        : botState.minAvailableShortProfit +
                                          0.08
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
        resetValuesAfterSell(botState, indicatorsData);
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
            botState.maxAvailableProfit - 0.08),
        );
        botState.updateState(
          'totalMinAvailableProfit',
          (botState.totalMinAvailableProfit +=
            botState.minAvailableProfit - 0.08),
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
        resetValuesAfterSell(botState, indicatorsData);
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
  initialFuturesUSDTBalance,
  sellReason,
  indicatorsData,
  stopLoss = false,
) => {
  if (!botState.strategies[`${strategy}`].stopLoss) {
    try {
      botState.updateState('status', 'isPending');
      botState.updateState('buyPrice', null);
      let order;

      if (profitLevels) {
        await binance.futuresCancelAll(symbol.toUpperCase());
        // const { available: beforeSellCryptoCoinBalance } = await getBalances(
        //   cryptoCoin,
        // );
        // const amount = binance.roundStep(
        //   Number(beforeSellCryptoCoinBalance),
        //   stepSize,
        // );
        // const order = await marketSell(symbol.toUpperCase(), +amount);
        // botState.updateState('order', order);
        botState.updateState('enabledLimits', false);
      }
      const getFuturesAccountData = await binance.futuresAccount();
      const searchSymbol = symbol.toUpperCase();
      // console.log(getFuturesAccountData);
      const currentPosition = getFuturesAccountData.positions.find(
        ({ symbol }) => symbol === searchSymbol,
      );
      if (currentPosition && +currentPosition.positionAmt !== 0) {
        const amount = Math.abs(currentPosition.positionAmt);
        if (botState.dealType === 'long') {
          order = await binance.futuresMarketSell(
            symbol.toUpperCase(),
            +amount,
            { reduceOnly: true },
          );
        } else if (botState.dealType === 'short') {
          order = await binance.futuresMarketBuy(
            symbol.toUpperCase(),
            +amount,
            { reduceOnly: true },
          );
        }
        botState.updateState('order', order);
        await sendToRecipients(`SELL
                 Traiding market: ${botState.traidingMarket.toUpperCase()}
                 Strategy: ${strategy}
                 Reason: ${sellReason}
                 Deal Type: ${botState.dealType.toUpperCase()}
                 Deal №: ${botState.dealsCount}
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.currentPrice} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Stablecoin Futures balance: ${
                   botState.availableFuturesUSDT
                 } USDT
                 OrderInfo: ${JSON.stringify(botState.order)}                 
             `);
      } else {
        await sendToRecipients(`SELL
                 No open positions found!
                 Price: ${botState.currentPrice} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Switched to the BUY status. 
             `);
      }
      // const cancelResult = await binance.futuresCancelAll(
      //   symbol.toUpperCase(),
      // );
      // botState.updateState('order', cancelResult);

      const refreshedFuturesUSDTBalance = await getFuturesBalances('USDT');
      const currentProfit =
        Number(refreshedFuturesUSDTBalance) -
        Number(botState.availableFuturesUSDT);
      botState.updateState('currentProfit', currentProfit);
      botState.updateState(
        'availableFuturesUSDT',
        +refreshedFuturesUSDTBalance,
      );
      botState.updateState(
        'totalProfit',
        Number(refreshedFuturesUSDTBalance) - Number(initialFuturesUSDTBalance),
      );
      botState.updateState(
        'totalMaxAvailableProfit',
        (botState.totalMaxAvailableProfit += botState.maxAvailableProfit - 0.2),
      );
      botState.updateState(
        'totalMinAvailableProfit',
        (botState.totalMinAvailableProfit += botState.minAvailableProfit - 0.2),
      );
      // botState.updateState(
      //   'totalPercentProfit',
      //   (botState.totalPercentProfit +=
      //     (currentProfit / botState.cummulativeQuoteQty) * 100),
      // );
      // const afterSellFuturesCryptoCoinBalance = await getFuturesBalances(
      //   cryptoCoin,
      // );
      // botState.updateState(
      //   'availableFuturesCryptoCoin',
      //   +afterSellFuturesCryptoCoinBalance,
      // );
      resetValuesAfterSell(botState, indicatorsData);
      if (!stopLoss) botState.updateState('status', 'buy');
      else {
        botState.strategies[`${strategy}`].stopLoss = true;
        botState.updateState('status', 'sell');
        await sendToRecipients(`INFO 
                                      Wait for the STOP LOSS condition activating!
        `);
      }
      botState.updateState('order', null);
      botState.updateState('sellError', false);
      botState.dealsCount++;
      await botStateService.trackBotState(
        _omit(botState, [
          'availableUSDT',
          'availableCryptoCoin',
          'availableFuturesUSDT',
          'availableFuturesCryptoCoin',
          'updateState',
        ]),
      );
    } catch (e) {
      await sendToRecipients(`SELL ERROR
            ${JSON.stringify(e)}
      `);
      // const refreshedFuturesCryptoCoinBalance = await getFuturesBalances(
      //   cryptoCoin,
      // );
      // botState.updateState(
      //   'availableFuturesCryptoCoin',
      //   +refreshedFuturesCryptoCoinBalance,
      // );
      botState.updateState('sellError', true);
      botState.updateState('status', 'sell');
    }
  } else {
    botState.updateState('status', 'isPending');
    botState.strategies[`${strategy}`].stopLoss = false;
    botState.updateState('enabledLimits', false);
    const refreshedFuturesUSDTBalance = await getFuturesBalances('USDT');
    botState.updateState('availableFuturesUSDT', +refreshedFuturesUSDTBalance);
    // const refreshedFuturesCryptoCoinBalance = await getFuturesBalances(
    //   cryptoCoin,
    // );
    // botState.updateState(
    //   'availableFuturesCryptoCoin',
    //   refreshedFuturesCryptoCoinBalance,
    // );
    botState.initialDealType = null;
    botState.updateState('status', 'buy');
    await sendToRecipients(`INFO
                               STOP LOSS condition was activated and bot was switched to the BUY status!
                `);

    await botStateService.trackBotState(
      _omit(botState, [
        'availableUSDT',
        'availableCryptoCoin',
        'availableFuturesUSDT',
        'availableFuturesCryptoCoin',
        'updateState',
      ]),
    );
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
      botState.sellVolume = indicatorsData.scalper.sellVolume;
      botState.buyVolume = indicatorsData.scalper.buyVolume;
      botState.dmi5m.adx = indicatorsData.dmi5m.adx;
      botState.dmi5m.adxUpCount = indicatorsData.dmi5m.adxUpCount;
      botState.dmi5m.adxDownCount = indicatorsData.dmi5m.adxDownCount;
      botState.dmi1m.adx = indicatorsData.dmi1m.adx;
      botState.dmi1m.adxUpCount = indicatorsData.dmi1m.adxUpCount;
      botState.dmi1m.adxDownCount = indicatorsData.dmi1m.adxDownCount;
      // indicatorsData.dmi1m.adxUpCount = 0;
      // indicatorsData.dmi1m.adxDownCount = 0;
      // indicatorsData.dmi5m.adxUpCount = 0;
      // indicatorsData.dmi5m.adxDownCount = 0;
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
                                    OBV 2h: BSC: ${
                                      indicatorsData.obv2h.buySignalCount
                                    } SSC: ${
          indicatorsData.obv2h.sellSignalCount
        }
        OBV 1h: BSC: ${indicatorsData.obv1h.buySignalCount} SSC: ${
          indicatorsData.obv1h.sellSignalCount
        }
        OBV 30m: BSC: ${indicatorsData.obv30m.buySignalCount} SSC: ${
          indicatorsData.obv30m.sellSignalCount
        }
        OBV 15m: BSC: ${indicatorsData.obv15m.buySignalCount} SSC: ${
          indicatorsData.obv15m.sellSignalCount
        }
        OBV 5m: BSC: ${indicatorsData.obv5m.buySignalCount} SSC: ${
          indicatorsData.obv5m.sellSignalCount
        }
         OBV 1m: BSC: ${indicatorsData.obv1m.buySignalCount} SSC: ${
          indicatorsData.obv1m.sellSignalCount
        }
        
       ATR 5m: ${'(UP: ' +
         indicatorsData.atr.atr5m.buySignalCount +
         ' ' +
         'DOWN: ' +
         indicatorsData.atr.atr5m.sellSignalCount +
         ' ' +
         'Current: ' +
         indicatorsData.atr.atr5m.prevAtr}
       ADX 1m: ${'(UP: ' +
         indicatorsData.dmi1m.adxUpCount +
         ' ' +
         'DOWN: ' +
         indicatorsData.dmi1m.adxDownCount +
         ' ' +
         'Current: ' +
         indicatorsData.dmi1m.adx}
        ADX 5m: ${'(UP: ' +
          indicatorsData.dmi5m.adxUpCount +
          ' ' +
          'DOWN: ' +
          indicatorsData.dmi5m.adxDownCount +
          ' ' +
          'Current: ' +
          indicatorsData.dmi5m.adx}
      ADX 15m: ${'(UP: ' +
        indicatorsData.dmi15m.adxUpCount +
        ' ' +
        'DOWN: ' +
        indicatorsData.dmi15m.adxDownCount +
        ' ' +
        'Current: ' +
        indicatorsData.dmi15m.adx}
      ADX 1h: ${'(UP: ' +
        indicatorsData.dmi1h.buySignalCount +
        ' ' +
        'DOWN: ' +
        indicatorsData.dmi1h.sellSignalCount +
        ' ' +
        'Current: ' +
        indicatorsData.dmi1h.adx}
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
                 Order ID: ${botState.orderId}
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
  try {
    let order;
    botState.updateState('status', 'isPending');
    const amount = +Number(
      binance.roundStep(assetAmount / botState.currentPrice, stepSize),
    ).toFixed(2);
    const refreshedFuturesStableCoinBalance = await getFuturesBalances('USDT');
    botState.updateState(
      'availableFuturesUSDT',
      +refreshedFuturesStableCoinBalance,
    );

    try {
      if (dealType === 'long') {
        order = await binance.futuresMarketBuy(symbol.toUpperCase(), +amount);
      } else if (dealType === 'short') {
        order = await binance.futuresMarketSell(symbol.toUpperCase(), +amount);
      }
      const getFuturesAccountData = await binance.futuresAccount();
      const searchSymbol = symbol.toUpperCase();
      // console.log(getFuturesAccountData);
      const currentPosition = getFuturesAccountData.positions.find(
        ({ symbol }) => symbol === searchSymbol,
      );
      if (+currentPosition.positionAmt !== 0) {
        botState.updateState('order', currentPosition);
        botState.updateState('buyPrice', +botState.currentPrice);
        await sendToRecipients(`BUY
                 Traiding market: ${botState.traidingMarket.toUpperCase()}
                 Leverage: ${currentPosition.leverage}
                 Isolated: ${currentPosition.isolated}
                 Strategy: ${strategy}
                 Reason: ${buyReason}
                 ${botState.strategy}
                 Deal Type: ${dealType.toUpperCase()}
                 Deal №: ${botState.dealsCount}
                 Symbol: ${symbol.toUpperCase()}
                 Price: ${botState.buyPrice} USDT
                 Date: ${format(new Date(), DATE_FORMAT)}
                 Stablecoin balance: ${botState.availableFuturesUSDT} USDT
                 Stablecoin deal amount: ${Number(
                   botState.order.initialMargin,
                 )} USDT
                 Cryptocoin deal amount: ${Number(
                   botState.order.positionAmt,
                 )} ${cryptoCoin}
                 OrderInfo: ${JSON.stringify(botState.order)}                
             `);
        botState.updateState('dealType', dealType);
        botState.updateState('status', 'sell');
        botState.updateState('prevPrice', botState.currentPrice);
        await botStateService.trackBotState(
          _omit(botState, [
            'availableUSDT',
            'availableCryptoCoin',
            'availableFuturesUSDT',
            'availableFuturesCryptoCoin',
            'updateState',
          ]),
        );
        if (profitLevels)
          await setFuturesLimitSellOrders(
            symbol,
            botState,
            stepSize,
            Math.abs(botState.order.positionAmt),
            dealType,
          );
      } else throw new Error('OPEN FUTURES POSITION ERROR');
    } catch (e) {
      // if (+currentPosition.positionAmt > 0) {
      //   console.log(currentPosition);
      //   botState.updateState('order', currentPosition);
      //   botState.updateState('buyPrice', +botState.order.entryPrice);
      // } else throw new Error('OPEN FUTURES POSITION ERROR');
      // if (order.orderId) {
      //   botState.updateState('buyPrice', botState.currentPrice);
      //   console.log(e);
      // } else {
      await sendToRecipients(`OPEN FUTURES POSITION ERROR
            ${JSON.stringify(e)}
      `);
      const refreshedFuturesUSDTBalance = await getFuturesBalances('USDT');
      botState.updateState(
        'availableFuturesUSDT',
        +refreshedFuturesUSDTBalance,
      );
      botState.updateState('status', 'buy');
    }
  } catch (e) {
    await sendToRecipients(`BUY ERROR
            ${isObject(e) ? JSON.stringify(e) : e}
      `);
    const refreshedFuturesUSDTBalance = await getFuturesBalances('USDT');
    botState.updateState('availableFuturesUSDT', +refreshedFuturesUSDTBalance);
    botState.updateState('status', 'buy');
  }
};
