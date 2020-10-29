import * as service from './service';
import { getStochRsiStream } from '../../indicators/stochRSI';

export const getStochRSISignal = (symbol, timeFrame, indicatorsData) => {
  getStochRsiStream({
    symbol: symbol,
    interval: timeFrame,
  }).subscribe(stochRsi => {
    if (Number(stochRsi.k) - Number(stochRsi.d) >= 2)
      indicatorsData.stochRsiSignal = 'buy';

    if (Number(stochRsi.d) - Number(stochRsi.k) >= 2)
      indicatorsData.stochRsiSignal = 'sell';
    // console.log(`StochRSI:${JSON.stringify(stochRsi)}`);
    // console.log(`Signal: ${indicatorsData.stochRsiSignal}`);
    // console.log(`Diff: ${Number(stochRsi.k) - Number(stochRsi.d)} \n`);
  });
};

export { service };
