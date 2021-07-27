import { connect } from './db/connection';
import { sendToRecipients } from './services/telegram';

import { service as botStateService } from './components/botState';

const botState = {
  traidingMarket: 'spot',
  initialDealType: null,
  dealType: 'undetermined',
  maxAvailableLongProfit: 0,
  minAvailableLongProfit: 0,
  maxAvailableShortProfit: 0,
  minAvailableShortProfit: 0,
  totalMinAvailableLongProfit: 0,
  totalMinAvailableShortProfit: 0,
  totalMaxAvailableLongProfit: 0,
  totalMaxAvailableShortProfit: 0,
  dealPricesArr: [],
  avgDealPrice: null,
  prevAvgDealPrice: null,
  avgPrice: null,
  prevAvgPrice: null,
  profitDiff: 0,
  isPricesStreamAlive: false,
  avrDealProfit: null,
  buyPrice: 0,
  buyReason: 'upTrend',
  cummulativeQuoteQty: null,
  currentPrice: 0,
  currentProfit: null,
  dealsCount: 1,
  emaStartPoint: null,
  enabledLimits: false,
  order: null,
  prevPrice: 0,
  sellError: false,
  status: 'sell',
  strategies: {
    scalper: { enabled: true, stopLoss: false },
    upTrend: { enabled: false, stopLoss: false },
    downTrend: { enabled: false, stopLoss: false },
    upFlat: { enabled: false, stopLoss: false },
    downFlat: { enabled: false, stopLoss: false },
    stochRsi: { enabled: false, stopLoss: false },
    trendsCatcher: { enabled: false, stopLoss: false },
  },
  testMode: true,
  totalProfit: 0,
  totalPercentProfit: null,
  totalLongProfit: 0,
  totalShortProfit: 0,
  tradeAmountPercent: 0.95,
  dmi5m: {
    adx: null,
    adxUpCount: 0,
    adxDownCount: 0,
  },
  dmi1m: {
    adx: null,
    adxUpCount: 0,
    adxDownCount: 0,
  },
};

(async function() {
  await connect();
  try {
    await botStateService.trackBotState(botState);
    await sendToRecipients(`DATASET WAS UPDATED`);
  } catch (e) {
    await sendToRecipients(`DATASET UPDATE ERROR
    ${JSON.stringify(e)};
  `);

    process.exit(1);
  }
})();
