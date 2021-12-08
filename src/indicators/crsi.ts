import { CCI } from 'technicalindicators';
import { from, Observable } from 'rxjs';
import { last } from 'lodash';
import _map from 'lodash/map';
import { map, pluck, switchMap, bufferCount } from 'rxjs/operators';
import { getCandleStreamForInterval, getCandlesList } from '../api/candles';
import { cRSI as CRSI } from '@debut/indicators/index';

type CRSIStreamConfig = {
  symbol: string;
  interval: string;
};

const crsi = new CRSI(3, 2, 100);

export const getCRSIStream = (config: CRSIStreamConfig) =>
  getCandleStreamForInterval(config.symbol, config.interval)
    .pipe(bufferCount(1, 1))
    .subscribe(candle => {
      console.log(candle);
      console.log(crsi.nextValue(Number(candle[0].closePrice)));
      console.log(crsi.momentValue(Number(candle[0].closePrice)));
    });
//     .pipe(
//   switchMap(_ => from(getCandlesList(config))),
//   // eslint-disable-next-line new-cap
//   map(candles => ({
//     result: new cRSI(3, 2, 100).nextValue(
//       _map(candles, 'close').map(value => Number(value)),
//     ),
//   })),
//   pluck('result'),
//   map(last),
// );
