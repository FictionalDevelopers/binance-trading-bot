import { connect } from './db/connection';

import { service as RsiSignalService } from './components/rsi-signals';
import { RsiStrategy } from './strategies/RsiStrategy';

(async function() {
  await connect();

  const rsiStrategy = new RsiStrategy();

  rsiStrategy.onThresholdPass(async rsiSignal => {
    await RsiSignalService.trackRsiSignal(rsiSignal);
  });

  rsiStrategy.run(rsiAlert => {
    console.log('ALERT', rsiAlert);
  });
})();
