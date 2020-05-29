import { from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { alerts } from 'trading-indicator';

import { RSI_ALERT } from '../constants/keyMappers';
import { getKlineForPeriod } from '../api/klines';
import mapKeys from '../utils/mapKeys';

export const getRsiAlertStream = ({
  period = 14,
  overboughtThreshold = 75,
  oversoldThreshold = 25,
  exchange = 'binance',
  symbol = 'BTC/USDT',
  interval = '1m',
} = {}) =>
  getKlineForPeriod(interval).pipe(
    switchMap(() =>
      from(
        alerts.rsiCheck(
          period,
          overboughtThreshold,
          oversoldThreshold,
          exchange,
          symbol,
          interval,
        ),
      ),
    ),
    map(mapKeys(RSI_ALERT)),
  );
