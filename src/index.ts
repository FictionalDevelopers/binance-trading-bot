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

import { makeSendToRecipients } from './services/telegram';

(async function() {
  await connect();

  const sendToRecipients = makeSendToRecipients([372621284, 440722643]);

  const interval = '1m';

  const candlePrices$ = getCandleStreamForPeriod(
    SYMBOLS.BTCUSDT,
    interval,
  ).pipe(pluck('closePrice'), map(Number));

  const rsiSignals$ = makeRsiSignalStream({
    interval,
    period: 14,
    overboughtThreshold: 80,
    oversoldThreshold: 20,
  });

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
