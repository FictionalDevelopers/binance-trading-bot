import { bufferCount, tap } from 'rxjs/operators';

import { getRsiAlertStream } from '../../indicators/rsi';

import { Instrument } from '../Instrument';

import { Trend } from './Trend';

import { RsiAlert, RsiInstrumentConfig } from './types';

export class RsiInstrument extends Instrument<{ rsi: number }> {
  constructor(rsiInstrumentConfig?: RsiInstrumentConfig) {
    super();
    getRsiAlertStream(rsiInstrumentConfig)
      .pipe(
        bufferCount(2, 1),
        tap(d => {
          console.log('ALERT', d);
        }),
      )
      .subscribe(alerts => this.handleRsiAlert(alerts));
  }

  private handleRsiAlert(alerts: RsiAlert[]): void {
    const [previous, latest] = alerts;
    const trend =
      latest.rsi > previous.rsi ? Trend.Ascending : Trend.Descending;

    if (
      previous.overbought !== latest.overbought &&
      trend === Trend.Ascending
    ) {
      console.log('SELL');

      this.sellSignalHandler({ rsi: latest.rsi });
    }

    if (
      previous.overbought !== latest.overbought &&
      trend === Trend.Descending
    ) {
      console.log('STOP SELL');
      this.sellStopSignallHandler({ rsi: latest.rsi });
    }

    if (previous.oversold !== latest.oversold && trend === Trend.Descending) {
      console.log('BUY');
      this.buySignalHandler({ rsi: latest.rsi });
    }

    if (previous.oversold !== latest.oversold && trend === Trend.Ascending) {
      console.log('STOP BUY');
      this.buyStopSignallHandler({ rsi: latest.rsi });
    }
  }
}
