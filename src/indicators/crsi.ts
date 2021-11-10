import { CCI } from 'technicalindicators';
import { from, Observable } from 'rxjs';
import { last } from 'lodash';
import _map from 'lodash/map';
import { map, pluck, switchMap } from 'rxjs/operators';
import { getCandleStreamForInterval, getCandlesList } from '../api/candles';
import { cRSI } from '@debut/indicators/src/crsi';

const crsi = new cRSI(3, 2, 100);

type CRSIStreamConfig = {
  symbol: string;
  interval: string;
};

// @ts-ignore
export const getCRSIStream = (config: CRSIStreamConfig): Observable<number> =>
  getCandleStreamForInterval(config.symbol, config.interval).pipe(
    switchMap(_ => from(getCandlesList(config))),
    // eslint-disable-next-line new-cap
    map(candles => crsi.momentValue(candles)),
    pluck('result'),
    map(last),
  );
