import { getRsiAlertStream } from './indicators/rsi';
import { connect } from './db/connection';

(async function() {
  await connect();

  getRsiAlertStream().subscribe(d => {
    console.log('RSI_ALERT', d);
  });
})();
