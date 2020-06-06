import { combineLatest } from 'rxjs';
import { map, pluck } from 'rxjs/operators';
import { format } from 'date-fns';

import { connect } from './db/connection';
import { SYMBOLS } from './constants';
import { DATE_FORMAT } from './constants/date';
import { getCandleStreamForInterval } from './api/candles';
import { makeRsiToolStream } from './tools/rsi-tool';
import { makeStrategy } from './strategies/make-strategy';
import { BUY, SELL } from './tools/signals';

import { processSubscriptions, sendToRecipients } from './services/telegram';

(async function() {
  await connect();
  await processSubscriptions();

  const interval = '1m';

  const candlePrices$ = getCandleStreamForInterval(
    SYMBOLS.BTCUSDT,
    interval,
  ).pipe(pluck('closePrice'), map(Number));

  const rsiConfig = {
    symbol: SYMBOLS.BTCUSDT,
    period: 14,
    interval: '1m',
    overboughtThresholds: [50, 70],
    oversoldThresholds: [30, 50],
  };

  console.log('RSI_CONFIG', rsiConfig);

  await sendToRecipients(`RSI_CONFIG ${JSON.stringify(rsiConfig)}`);

  const rsiSignals$ = makeRsiToolStream(rsiConfig);

  const strategy$ = makeStrategy([rsiSignals$]);

  let hasBought = false;

  combineLatest(strategy$, candlePrices$).subscribe(
    async ([strategySignalDetails, price]) => {
      const date = format(new Date(), DATE_FORMAT);

      if (!hasBought && strategySignalDetails.action === BUY) {
        await sendToRecipients(`BUY
          price: ${price}
          date: ${date}
          sinals: ${JSON.stringify(strategySignalDetails.signals)}
        `);

        hasBought = true;
      }

      if (hasBought && strategySignalDetails.action === SELL) {
        await sendToRecipients(`SELL
          price: ${price}
          date: ${date}
          sinals: ${JSON.stringify(strategySignalDetails.signals)}
        `);

        hasBought = false;
      }
    },
  );
})();

process.on('unhandledRejection', async (reason: Error) => {
  await sendToRecipients(`ERROR
    ${reason.message}
    ${reason.stack}
  `);

  process.exit(1);
});
