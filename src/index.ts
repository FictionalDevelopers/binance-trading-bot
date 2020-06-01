import { connect } from './db/connection';

import { makeRsiSignalStream } from './signals/rsi-signal';
import { makeStrategy } from './strategies/make-strategy';

(async function() {
  await connect();

  const rsiSignals$ = makeRsiSignalStream();

  const strategy$ = makeStrategy([rsiSignals$]);

  strategy$.subscribe(strategySignal => {
    console.log('STRATEGY', strategySignal);
    console.log('------------');
  });
})();
