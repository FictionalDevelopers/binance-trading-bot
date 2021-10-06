import indicatorsData from '../../indicators-data';
import {
  cancelAllOpenOrders,
  checkAllOpenOrders,
  marketBuyAction,
  marketSellAction,
} from '../../../api/order';
import { sendToRecipients } from '../../../services/telegram';
import { sharedData } from '../../../dmiTradeStrategy';
import getBalances from '../../../api/balance';

const symbol = sharedData.symbol;
const cryptoCoin = sharedData.cryptoCoin;
const initialUSDTBalance = sharedData.initialUSDTBalance;
const initialCryptoCoinBalance = sharedData.initialCryptoCoinBalance;
const stepSize = sharedData.stepSize;
const openOrders = sharedData.openOrders;
const workingDeposit = sharedData.workingDeposit;

export const botState = {
  enabledLimits: false,
  boughtBeforeResistanceLevel: false,
  sellError: false,
  emaStartPoint: null,
  rebuy: true,
  strategy: 'TRENDS & WAVES CATCHER',
  testMode: true,
  useProfitLevels: false,
  useEMAStopLoss: false,
  status: openOrders ? (openOrders.length === 0 ? 'buy' : 'sell') : 'buy',
  // status: 'buy',
  profitLevels: {
    '1': {
      id: 1,
      profitPercent: 1,
      amountPercent: 0.5,
      isFilled: false,
    },
    '2': {
      id: 2,
      profitPercent: 2,
      amountPercent: 0.5,
      isFilled: false,
    },
    '3': {
      id: 3,
      profitPercent: 4,
      amountPercent: 0.5,
      isFilled: false,
    },
  },
  currentProfit: null,
  totalProfit: null,
  totalPercentProfit: null,
  tradeAmountPercent: 0.95,
  availableUSDT: initialUSDTBalance,
  availableCryptoCoin: initialCryptoCoinBalance,
  cummulativeQuoteQty: null,
  buyPrice: null,
  currentPrice: null,
  order: null,
  avrDealProfit: null,
  dealsCount: 1,
  startTime: new Date().getTime(),
  workDuration: null,
  stopLoss: null,
  prevPrice: null,
  updateState: function(fieldName, value) {
    this[`${fieldName}`] = value;
  },
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

  const conditions = {
    buy: {
      totalResistanceLevel:
        botState.status === 'buy' &&
        Number(
          (indicatorsData.fast15mEMA / indicatorsData.middle15mEMA) * 100 - 100,
        ) >= 0.1 &&
        Number(
          (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
        ) >= 0.1 &&
        botState.rebuy,
      flatBuyBefore5mResistanceLevel:
        botState.status === 'buy' &&
        indicatorsData.fast5mEMA < indicatorsData.middle5mEMA &&
        indicatorsData.emaSignal === 'buy' &&
        indicatorsData.rsi1m.rsiValue < 35 &&
        indicatorsData.rsi1m.rsiValue !== null,
      flatBuyAfter5mResistanceLevel:
        botState.status === 'buy' &&
        indicatorsData.fast5mEMA > indicatorsData.middle5mEMA &&
        indicatorsData.emaSignal === 'buy' &&
        indicatorsData.rsi1m.rsiValue < 35 &&
        indicatorsData.rsi1m.rsiValue !== null,
    },

    sell: {
      resistanceLevel:
        botState.status === 'sell' &&
        !botState.boughtBeforeResistanceLevel &&
        Number(
          (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 - 100,
        ) >= 0.05,
      flatStopLoss:
        botState.status === 'sell' &&
        ((botState.boughtBeforeResistanceLevel &&
          indicatorsData.emaSignal === 'sell') ||
          (!botState.boughtBeforeResistanceLevel &&
            Number(
              (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
                100,
            ) >= 0.05)),
      flatTakeProfit:
        botState.status === 'sell' &&
        !botState.enabledLimits &&
        indicatorsData.rsi1m.rsiValue >= 68 &&
        expectedProfitPercent > 0,
    },
  };

  /** **********************BUY ACTIONS***************************/

  if (conditions.buy.totalResistanceLevel) {
    await marketBuyAction(
      true,
      symbol,
      botState,
      cryptoCoin,
      pricesStream,
      stepSize,
      'TRENDS CATCHER',
      workingDeposit,
      'RESISTANCE LEVEL',
    );
    botState.boughtBeforeResistanceLevel = false;
    botState.rebuy = false;
    return;
  }

  if (conditions.buy.flatBuyBefore5mResistanceLevel) {
    await marketBuyAction(
      false,
      symbol,
      botState,
      cryptoCoin,
      pricesStream,
      stepSize,
      'WAVES CATCHER',
      workingDeposit,
      'BEFORE RESISTANCE LEVEL',
    );
    botState.boughtBeforeResistanceLevel = true;
    return;
  }

  if (conditions.buy.flatBuyAfter5mResistanceLevel) {
    await marketBuyAction(
      false,
      symbol,
      botState,
      cryptoCoin,
      pricesStream,
      stepSize,
      'WAVES CATCHER',
      workingDeposit,
      'AFTER RESISTANCE LEVEL',
    );
    botState.boughtBeforeResistanceLevel = false;
    return;
  }

  /** *********************SELL ACTIONS***********************/

  if (conditions.sell.resistanceLevel) {
    try {
      botState.updateState('status', 'isPending');
      const openOrders = await checkAllOpenOrders(symbol.toUpperCase());
      if (
        openOrders.length === 0 &&
        !botState.sellError &&
        botState.enabledLimits
      ) {
        const { available: refreshedUSDTBalance } = await getBalances('USDT');
        botState.updateState('availableUSDT', +refreshedUSDTBalance);
        botState.dealsCount++;
        await sendToRecipients(`INFO
          No open limit sell orders found
          Bot was switched to the BUY
      `);
        botState.updateState('status', 'buy');
        return;
      } else {
        if (openOrders.length !== 0) {
          await cancelAllOpenOrders(symbol.toUpperCase());
          await marketSellAction(
            'TRENDS CATCHER',
            true,
            symbol,
            botState,
            cryptoCoin,
            expectedProfitPercent,
            pricesStream,
            stepSize,
            initialUSDTBalance,
            'STOP LOSS',
          );
          botState.sellError = false;
          botState.enabledLimits = false;
          botState.rebuy = true;
          return;
        }
        await marketSellAction(
          'WAVES CATCHER',
          false,
          symbol,
          botState,
          cryptoCoin,
          expectedProfitPercent,
          pricesStream,
          stepSize,
          initialUSDTBalance,
          'STOP LOSS',
        );
        botState.sellError = false;
        botState.enabledLimits = false;
        return;
      }
    } catch (e) {
      await sendToRecipients(`SELL ERROR
            ${JSON.stringify(e)}
      `);
      const { available: refreshedCryptoCoinBalance } = await getBalances(
        cryptoCoin,
      );
      botState.updateState('availableCryptoCoin', +refreshedCryptoCoinBalance);
      botState.sellError = true;
      botState.updateState('status', 'sell');
    }
  }

  if (conditions.sell.flatTakeProfit) {
    await marketSellAction(
      'WAVES CATCHER',
      false,
      symbol,
      botState,
      cryptoCoin,
      expectedProfitPercent,
      pricesStream,
      stepSize,
      initialUSDTBalance,
      'TAKE PROFIT',
    );
    return;
  }

  if (conditions.sell.flatStopLoss) {
    await marketSellAction(
      'WAVES CATCHER',
      false,
      symbol,
      botState,
      cryptoCoin,
      expectedProfitPercent,
      pricesStream,
      stepSize,
      initialUSDTBalance,
      'STOP LOSS',
    );
    return;
  }
  botState.updateState('prevPrice', botState.currentPrice);
};

export default {
  trader,
  botState,
};
