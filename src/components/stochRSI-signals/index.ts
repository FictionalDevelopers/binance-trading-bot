import * as service from './service';
import { getStochRsiStream } from '../../indicators/stochRSI';

export const getStochRSISignal = (symbol, timeFrame, indicatorsData) => {
  getStochRsiStream({
    symbol: symbol,
    interval: timeFrame,
  }).subscribe(stochRsi => {
    if (Number((Number(stochRsi.k) / Number(stochRsi.d)) * 100 - 100) >= 5)
      indicatorsData.stochRsiSignal = 'buy';

    if (Number((Number(stochRsi.d) / Number(stochRsi.k)) * 100 - 100) >= 5)
      indicatorsData.stochRsiSignal = 'sell';
    console.log(`StochRSI:${JSON.stringify(stochRsi)}`);
    console.log(`Signal: ${indicatorsData.stochRsiSignal} \n`);
  });
};

export { service };
