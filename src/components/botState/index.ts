import * as service from './service';
import { checkAllOpenOrders } from '../../api/order';
import { getExchangeInfo } from '../../api/exchangeInfo';
import getBalances from '../../api/balance';

export { service };

let initialUSDTBalance, initialCryptoCoinBalance, openOrders, stepSize;
const symbol = 'linkusdt';
const cryptoCoin = symbol.toUpperCase().slice(0, -4);

(async () => {
  const { available: usdt } = await getBalances('USDT');
  initialUSDTBalance = usdt;
  const { available: crypto } = await getBalances(cryptoCoin);
  initialCryptoCoinBalance = crypto;
  const { stepSize: step } = await getExchangeInfo(
    symbol.toUpperCase(),
    'LOT_SIZE',
  );
  stepSize = step;
  openOrders = await checkAllOpenOrders(symbol.toUpperCase());
})();

export default {
  strategy: 'MIXED STRATEGY',
  currentStrategy: '',
  testMode: true,
  useProfitLevels: false,
  useEMAStopLoss: false,
  status: openOrders ? (openOrders.length === 0 ? 'buy' : 'sell') : 'buy',
  // status: 'buy',
  profitLevels: [
    {
      id: 1,
      profitPercent: 1,
      amountPercent: 0.5,
      isFilled: false,
    },
    {
      id: 2,
      profitPercent: 2,
      amountPercent: 0.5,
      isFilled: false,
    },
    {
      id: 3,
      profitPercent: 4,
      amountPercent: 0.5,
      isFilled: false,
    },
  ],
  rebuy: true,
  currentProfit: null,
  totalProfit: null,
  totalPercentProfit: null,
  tradeAmountPercent: 0.9,
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
  stepSize: stepSize,
  updateState: function(fieldName, value) {
    this[`${fieldName}`] = value;
  },
};
