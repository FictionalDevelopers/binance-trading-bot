import { getKlineForPeriod } from '../api/klines';
import { pluck } from 'rxjs/operators';

export const getVerticalVolume = interval =>
  getKlineForPeriod(interval).pipe(pluck('baseAssetVolume'));
