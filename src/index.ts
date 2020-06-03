import { zip } from 'rxjs';
import { map, pluck } from 'rxjs/operators';
import { format } from 'date-fns';

import { connect } from './db/connection';
import SYMBOLS from './constants/symbols';
import { DATE_FORMAT } from './constants/date';
import { getCandleStreamForPeriod } from './api/candles';
import { makeRsiSignalStream } from './signals/rsi-signal';
import { makeStrategy } from './strategies/make-strategy';
import { BUY, SELL } from './signals/signals';

import { sendToRecipients, processSubscriptions } from './services/telegram';

(async function() {
  await connect();
  await processSubscriptions();

  const interval = '1m';

  const candlePrices$ = getCandleStreamForPeriod(
    SYMBOLS.BTCUSDT,
    interval,
  ).pipe(pluck('closePrice'), map(Number));

  const rsiConfig = {
    interval,
    overboughtThreshold: 70,
    oversoldThreshold: 30,
  };

  console.log('RSI_CONFIG', rsiConfig);

  await sendToRecipients(`RSI_CONFIG ${JSON.stringify(rsiConfig)}`);

  const rsiSignals$ = makeRsiSignalStream(rsiConfig);

  const strategy$ = makeStrategy([rsiSignals$]);

  let hasBought = false;

  zip(strategy$, candlePrices$).subscribe(
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
