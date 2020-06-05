import { connect } from './db/connection';
import SYMBOLS from './constants/symbols';
import { makeVerticalVolumeSignal } from './signals/vertical-volume-signal';
import { makeStrategy } from './strategies/make-strategy';
import { BUY, SELL } from './signals/signals';
import { processSubscriptions, sendToRecipients } from './services/telegram';

(async function() {
  await connect();
  await processSubscriptions();

  const candleConfig = { symbol: SYMBOLS.BTCUSDT, interval: '1m' };
  const options = {
    minimalPercentageIncrease: 20,
    minimalLatestCandleVolume: 30,
  };
  const verticalVolumeSignal$ = makeVerticalVolumeSignal(candleConfig, options);

  await sendToRecipients(`VERTICAL VOLUME SIGNAL INIT
    candle config:
    ${JSON.stringify(candleConfig, null, 2)}
    ----
    vertical volume signal options:
    ${JSON.stringify(options, null, 2)}
  `);

  const strategy$ = makeStrategy([verticalVolumeSignal$]);

  let hasBought = false;

  strategy$.subscribe(async strategySignalDetails => {
    if (!hasBought && strategySignalDetails.action === BUY) {
      await sendToRecipients(`BUY
        Strategy signal details:
        ${JSON.stringify(strategySignalDetails, null, 2)}
      `);
      hasBought = true;
    }

    if (hasBought && strategySignalDetails.action === SELL) {
      await sendToRecipients(`SELL
        Strategy signal details:
        ${JSON.stringify(strategySignalDetails, null, 2)}
      `);
      hasBought = false;
    }
  });
})();
