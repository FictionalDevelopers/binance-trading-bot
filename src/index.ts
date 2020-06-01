import { fromEvent, zip } from 'rxjs';
import { EventEmitter } from 'events';
import { map, pluck } from 'rxjs/operators';

import SYMBOLS from './constants/symbols';
import { connect } from './db/connection';
import { getCandleStreamForPeriod } from './api/candles';
import { service as rsiService } from './components/rsi-signals';

import { RsiInstrument } from './instruments/RsiInstrument';
import { Strategy } from './strategies/Strategy';

import { BUY as BUY_SIGNAL, SELL as SELL_SIGNAL } from './instruments/signals';

const instrument1 = new RsiInstrument({
  period: 1,
});
const instrument2 = new RsiInstrument({
  period: 1,
});

instrument1.onBuySignall(() => {
  console.log('INSTRUMENT 1 BUY!');
});

instrument2.onBuySignall(() => {
  console.log('INSTRUMENT 2 BUY!');
});

instrument1.onSellSignall(() => {
  console.log('INSTRUMENT 1 SELL!');
});

instrument1.onSellSignall(() => {
  console.log('INSTRUMENT 2 SELL!');
});

const strategy = new Strategy({
  instruments: [instrument1, instrument2],
});

strategy.onBuySignall(() => {
  console.log('STRATEGY BUY!');
});

strategy.onSellSignall(() => {
  console.log('STRATEGY SELL!');
});

// (async function() {
//   await connect();

//   const rsiInstrument = new RsiInstrument();

//   const oneMinuteCandle = getCandleStreamForPeriod(SYMBOLS.BTCUSDT, '1m').pipe(
//     pluck('closePrice'),
//     map(Number),
//   );

//   zip(fromEvent(rsiInstrument, BUY_SIGNAL), oneMinuteCandle).subscribe(
//     async ([signal, price]) => {
//       await rsiService.trackRsiSignal({
//         rsi: signal.rsi,
//         signal: BUY_SIGNAL,
//         price,
//       });
//     },
//   );

//   zip(fromEvent(rsiInstrument, SELL_SIGNAL), oneMinuteCandle).subscribe(
//     async ([signal, price]) => {
//       await rsiService.trackRsiSignal({
//         rsi: signal.rsi,
//         signal: SELL_SIGNAL,
//         price,
//       });
//     },
//   );
// })();
