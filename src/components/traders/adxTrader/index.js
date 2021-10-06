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

const botState = {
  strategy: 'ADX STRATEGY',
  testMode: true,
  // status: lastOrder.side === 'SELL' ? 'buy' : 'sell',
  status: 'buy',
  currentProfit: null,
  totalProfit: null,
  tradeAmountPercent: 0.6,
  availableUSDT: initialUSDTBalance,
  availableCryptoCoin: initialCryptoCoinBalance,
  cummulativeQuoteQty: null,
  buyPrice: null,
  currentPrice: null,
  order: null,
  // initialOrder: lastOrder,
  avrDealProfit: null,
  dealsCount: 1,
  startTime: new Date().getTime(),
  workDuration: null,
  updateState: function(fieldName, value) {
    this[`${fieldName}`] = value;
  },
};

const trader = async pricesStream => {
  const { tradeAmountPercent } = botState;
  const { rsi1mValue, rsi1hValue } = indicatorsData;
  if (botState.status === 'isPending') return;
  const summaryEMABuySignal =
    indicatorsData.fast1mEMA > indicatorsData.middle1mEMA &&
    indicatorsData.middle1mEMA > indicatorsData.slow1mEMA &&
    indicatorsData.fast15mEMA > indicatorsData.middle15mEMA &&
    indicatorsData.fast1hEMA > indicatorsData.middle1hEMA;
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
    botState.status === 'buy' &&
    rsi1mValue <= 68 &&
    indicatorsData.dmi1h.willPriceGrow &&
    summaryEMABuySignal
  ) {
    await marketBuyAction(
      false,
      symbol,
      botState,
      cryptoCoin,
      pricesStream,
      stepSize,
      'ADX Strategy',
      workingDeposit,
      'ADX Signal',
    );
    return;
  }
  if (
    botState.status === 'sell' &&
    (!indicatorsData.dmi1h.willPriceGrow ||
      expectedProfitPercent <= -1 ||
      (rsi1mValue >= 70 && !indicatorsData.dmi15m.willPriceGrow))
  ) {
    await marketSellAction(
      'ADX Strategy',
      false,
      symbol,
      botState,
      cryptoCoin,
      expectedProfitPercent,
      pricesStream,
      stepSize,
      workingDeposit,
      'ADX Signal',
    );
  }
};

export default {
  trader,
  botState,
};
