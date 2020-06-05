import { ADX } from 'technicalindicators';
import { from } from 'rxjs';
import { last } from 'lodash';
import _map from 'lodash/map';
import { map, pluck, switchMap } from 'rxjs/operators';
import { candlesticksMapper } from '../utils/candlesticksMapper';
import { getCandleStreamForInterval } from '../api/candles';
import { SYMBOLS } from '../constants';
import { binance } from '../api/binance';

export const getDmiAlertStream = ({
  period = 14,
  symbol = SYMBOLS.ETHUSDT,
  interval = '1d',
} = {}) =>
  getCandleStreamForInterval(symbol, interval).pipe(
    switchMap(_ => from(binance.candlesticks(symbol.toUpperCase(), interval))),
    map(candlesticksMapper),
    map(
      candles =>
        new ADX({
          close: _map(candles, 'close'),
          high: _map(candles, 'high'),
          low: _map(candles, 'low'),
          period: period,
        }),
    ),
    pluck('result'),
    map(last),
  );
