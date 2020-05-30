import { getRsiAlertStream } from './indicators/rsi';
import { getDmiAlertStream } from './indicators/dmi';
import { connect } from './db/connection';

(async function() {
  await connect();
  getDmiAlertStream().subscribe(d => {
    console.log('DMI_ALERT', d);
  });

  // getRsiAlertStream().subscribe(d => {
  //   console.log('RSI_ALERT', d);
  // });
})();
