import { zip } from 'rxjs';
import { map, pluck } from 'rxjs/operators';

import { connect } from './db/connection';
import { model as OrderModel } from './components/orders';
import { model as StrategySignalModel } from './components/strategy-signals';
import SYMBOLS from './constants/symbols';
import { getCandleStreamForPeriod } from './api/candles';
import { makeRsiSignalStream } from './signals/rsi-signal';
import { makeStrategy } from './strategies/make-strategy';
import { BUY, SELL } from './signals/signals';

(async function() {
  await connect();

  const interval = '1h';

  const candlePrices$ = getCandleStreamForPeriod(
    SYMBOLS.BTCUSDT,
    interval,
  ).pipe(pluck('closePrice'), map(Number));

  const rsiSignals$ = makeRsiSignalStream({
    interval,
  });

  const strategy$ = makeStrategy([rsiSignals$]);

  zip(strategy$, candlePrices$).subscribe(
    async ([strategySignalDetails, price]) => {
      let hasBought = false;
      const date = new Date();

      if (!hasBought && strategySignalDetails.action === BUY) {
        const strategySignal = await StrategySignalModel.create({
          action: 'BUY',
          signals: strategySignalDetails.signals,
          date,
        });
        await OrderModel.create({
          action: 'BUY',
          strategySignal: strategySignal.id,
          price,
          date,
        });
        hasBought = true;
      }

      if (hasBought && strategySignalDetails.action === SELL) {
        const strategySignal = await StrategySignalModel.create({
          action: 'SELL',
          signals: strategySignalDetails.signals,
          date,
        });
        await OrderModel.create({
          action: 'SELL',
          strategySignal: strategySignal.id,
          price,
          date,
        });
        hasBought = false;
      }
    },
  );
})();
