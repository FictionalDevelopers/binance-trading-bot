import { EventEmitter } from 'events';
import { bufferCount } from 'rxjs/operators';

import { getRsiAlertStream } from '../../indicators/rsi';

import { Trend } from './Trend';

import { RsiAlert, RsiInstrumentConfig } from './types';

import { BUY, SELL } from '../signals';

export class RsiInstrument extends EventEmitter {
  constructor(rsiInstrumentConfig?: RsiInstrumentConfig) {
    super();

    getRsiAlertStream(rsiInstrumentConfig)
      .pipe(bufferCount(2, 1))
      .subscribe(alerts => {
        console.log('ALERTS', alerts);

        this.handleRsiAlert(alerts);
      });
  }

  private handleRsiAlert(alerts: RsiAlert[]): void {
    const [previous, latest] = alerts;
    const trend =
      latest.rsi > previous.rsi ? Trend.Ascending : Trend.Descending;

    if (
      previous.overbought !== latest.overbought &&
      trend === Trend.Ascending
    ) {
      this.emit(SELL, { rsi: latest.rsi });
    }

    if (previous.oversold !== latest.oversold && trend === Trend.Descending) {
      this.emit(BUY, { rsi: latest.rsi });
    }
  }
}
