import { fromEvent, zip } from 'rxjs';
import { map, pluck } from 'rxjs/operators';

import { connect } from './db/connection';
// import { getKlineForPeriod } from './api/klines';
import { service as rsiService } from './components/rsi-signals';

import { RsiInstrument } from './instruments/RsiInstrument';

import { BUY as BUY_SIGNAL, SELL as SELL_SIGNAL } from './instruments/signals';
import { async } from 'rxjs/internal/scheduler/async';
import { getRsiAlertStream } from './indicators/rsi';
import { getDmiAlertStream } from './indicators/dmi';

(async function() {
  await connect();
  // getRsiAlertStream().subscribe(d => {
  //   console.log('RSI_ALERT', d);
  // });
  getDmiAlertStream().subscribe(dmi => {
    if (dmi.pdi > dmi.mdi) console.log('Buy');
    if (dmi.pdi < dmi.mdi) console.log('Sell');
  });

  // const rsiInstrument = new RsiInstrument();
  //
  // const oneMinuteCandle = getKlineForPeriod('1m').pipe(
  //   pluck('closePrice'),
  //   map(Number),
  // );
  //
  // zip(fromEvent(rsiInstrument, BUY_SIGNAL), oneMinuteCandle).subscribe(
  //   async ([signal, price]) => {
  //     await rsiService.trackRsiSignal({
  //       rsi: signal.rsi,
  //       signal: BUY_SIGNAL,
  //       price,
  //     });
  //   },
  // );
  //
  // zip(fromEvent(rsiInstrument, SELL_SIGNAL), oneMinuteCandle).subscribe(
  //   async ([signal, price]) => {
  //     await rsiService.trackRsiSignal({
  //       rsi: signal.rsi,
  //       signal: SELL_SIGNAL,
  //       price,
  //     });
  //   },
  // );
  //
  // rsiInstrument.run();
})();
