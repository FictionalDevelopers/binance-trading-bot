import * as service from './service';
import { getStochRsiStream } from '../../indicators/stochRSI';

export const getStochRSISignal = (
  symbol,
  timeFrame,
  indicatorsData,
  buySens,
  sellSens,
) => {
  getStochRsiStream({
    symbol: symbol,
    interval: timeFrame,
  }).subscribe(stochRsi => {
    if (Number(stochRsi.k) - Number(stochRsi.d) >= buySens) {
      if (indicatorsData.stochRsiSignal[`stoch${timeFrame}`] === 'sell')
        indicatorsData.stochRsiSignal[`stoch${timeFrame}`] = 'buy';
    }

    if (Number(stochRsi.d) - Number(stochRsi.k) >= sellSens) {
      if (indicatorsData.stochRsiSignal[`stoch${timeFrame}`] === 'buy')
        indicatorsData.stochRsiSignal[`stoch${timeFrame}`] = 'sell';
    }
    // console.log(`StochRSI:${JSON.stringify(stochRsi)}`);
    // console.log(`Signal: ${indicatorsData.stochRsiSignal}`);
    // console.log(`Diff: ${Number(stochRsi.k) - Number(stochRsi.d)} \n`);
  });
};

export { service };
