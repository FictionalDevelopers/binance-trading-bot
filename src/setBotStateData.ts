import { connect } from './db/connection';
import { sendToRecipients } from './services/telegram';

import { service as botStateService } from './components/botState';

const botState = {
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
  status: 'buy',
  strategies: {
    upTrend: { enabled: false, stopLoss: false },
    downTrend: { enabled: false, stopLoss: false },
    upFlat: { enabled: false, stopLoss: false },
    downFlat: { enabled: false, stopLoss: false },
    stochRsi: { enabled: true, stopLoss: false },
    trendsCatcher: { enabled: false, stopLoss: false },
  },
  testMode: true,
  totalPercentProfit: null,
  totalProfit: 0,
  tradeAmountPercent: 0.95,
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
