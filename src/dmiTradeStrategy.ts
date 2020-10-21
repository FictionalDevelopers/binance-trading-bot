import { pluck, bufferCount } from 'rxjs/operators';
import { format } from 'date-fns';
import { connect } from './db/connection';
import { RESOURCES } from './constants';
import { DATE_FORMAT } from './constants/date';
import { getTradeStream } from './api/trades.js';
import { sendToRecipients } from './services/telegram';
import getBalances from './api/balance';
import { getExchangeInfo } from './api/exchangeInfo';
import { checkAllOpenOrders } from './api/order';
import { getEMASignal, runEMAInterval } from './components/ema-signals';
import { getDMISignal } from './components/dmi-signals';
import { getRSISignal } from './components/rsi-signals';
import indicatorsData from './components/indicators-data';
import mixTrader from './components/traders/mixTrader';

export const sharedData = {
  symbol: null,
  cryptoCoin: null,
  initialUSDTBalance: null,
  initialCryptoCoinBalance: null,
  stepSize: null,
  openOrders: null,
  workingDeposit: null,
};

(async function() {
  await connect();
  // await processSubscriptions();
  sharedData.symbol = 'linkusdt';
  sharedData.cryptoCoin = sharedData.symbol.toUpperCase().slice(0, -4);
  const { available: initialUSDTBalance } = await getBalances('USDT');
  sharedData.initialUSDTBalance = initialUSDTBalance;
  const { available: initialCryptoCoinBalance } = await getBalances(
    sharedData.cryptoCoin,
  );
  sharedData.initialCryptoCoinBalance = initialCryptoCoinBalance;
  const { stepSize } = await getExchangeInfo(
    sharedData.symbol.toUpperCase(),
    'LOT_SIZE',
  );
  sharedData.stepSize = stepSize;
  sharedData.openOrders = await checkAllOpenOrders(
    sharedData.symbol.toUpperCase(),
  );
  sharedData.workingDeposit = 500;

  // const symbol = process.argv[2];

  const traders = [mixTrader];

  traders.forEach(async ({ trader, botState }) => {
    if (botState.testMode) {
      await sendToRecipients(`INIT (TEST MODE)
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  Trader: ${botState.strategy}    
  with using the ${botState.strategy}
  Symbol: ${sharedData.symbol.toUpperCase()}
  `);
    } else {
      await sendToRecipients(`INIT
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  Trader: ${botState.strategy}
  Status: ${botState.status.toUpperCase()}
  Symbol: ${sharedData.symbol.toUpperCase()}
  Initial USDT balance: ${initialUSDTBalance} USDT
  Initial ${sharedData.cryptoCoin} balance: ${initialCryptoCoinBalance} ${
        sharedData.cryptoCoin
      }
  Open orders: ${JSON.stringify(sharedData.openOrders)}
  `);
    }

    getTradeStream({
      symbol: sharedData.symbol,
      resource: RESOURCES.TRADE,
    })
      .pipe(pluck('price'), bufferCount(1, 1))
      .subscribe(trader);
  });

  runEMAInterval(indicatorsData, mixTrader.botState);
  getDMISignal(sharedData.symbol, '5m', indicatorsData.dmi5m);
  getRSISignal(sharedData.symbol, '1m', indicatorsData.rsi1m);
  getEMASignal(sharedData.symbol, '5m', indicatorsData);
  getEMASignal(sharedData.symbol, '15m', indicatorsData);
  getEMASignal(sharedData.symbol, '1m', indicatorsData);
})();

process.on('unhandledRejection', async (reason: Error) => {
  console.error(reason);
  await sendToRecipients(`ERROR
    ${JSON.stringify(reason)};
  `);

  process.exit(1);
});
