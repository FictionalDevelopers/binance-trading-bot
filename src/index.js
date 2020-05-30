import { fromEvent, zip } from 'rxjs';
import { map, pluck } from 'rxjs/operators';

import { connect } from './db/connection';
import { getCandleStreamForPeriod } from './api/candles';
import { service as rsiService } from './components/rsi-signals';

import { RsiInstrument } from './instruments/RsiInstrument';

import { BUY as BUY_SIGNAL, SELL as SELL_SIGNAL } from './instruments/signals';

(async function() {
  await connect();

  const rsiInstrument = new RsiInstrument();

  const oneMinuteCandle = getCandleStreamForPeriod('1m').pipe(
    pluck('closePrice'),
    map(Number),
  );

  zip(fromEvent(rsiInstrument, BUY_SIGNAL), oneMinuteCandle).subscribe(
    async ([signal, price]) => {
      await rsiService.trackRsiSignal({
        rsi: signal.rsi,
        signal: BUY_SIGNAL,
        price,
      });
    },
  );

  zip(fromEvent(rsiInstrument, SELL_SIGNAL), oneMinuteCandle).subscribe(
    async ([signal, price]) => {
      await rsiService.trackRsiSignal({
        rsi: signal.rsi,
        signal: SELL_SIGNAL,
        price,
      });
    },
  );

  rsiInstrument.run();
})();
