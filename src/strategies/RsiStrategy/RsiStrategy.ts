import { Observable, zip, PartialObserver } from 'rxjs';
import { bufferCount, tap, map, pluck } from 'rxjs/operators';

import { getRsiAlertStream } from '../../indicators/rsi';
import { getKlineForPeriod } from '../../api/klines';

import { Threshold } from './Threshold';
import { Trend } from './Trend';

import {
  OnThresholdPassHandler,
  RsiAlert,
  RsiAlertConfig,
  TickCallback,
} from './types';

export class RsiStrategy {
  private rsiAlerts$: Observable<RsiAlert>;
  private candleClosePrices$: Observable<any>;
  private onThresholdPassHandler: OnThresholdPassHandler;

  constructor(rsiAlertConfig?: RsiAlertConfig) {
    this.rsiAlerts$ = getRsiAlertStream(rsiAlertConfig);
    this.candleClosePrices$ = getKlineForPeriod('1m').pipe(
      pluck('closePrice'),
      map(Number),
    );
  }

  public run(tickCallback?: TickCallback): void {
    const tappedAlerts$ = this.rsiAlerts$.pipe(
      tap(tickCallback),
      bufferCount(2, 1),
    );

    zip(this.candleClosePrices$, tappedAlerts$).subscribe(zip => {
      this.handleRsiAlert(zip);
    });
  }

  public onThresholdPass(handler: OnThresholdPassHandler): void {
    this.onThresholdPassHandler = handler;
  }

  private handleRsiAlert(alerts: RsiAlert[]): void {
    const [previous, latest] = alerts;
    const trend =
      latest.rsi > previous.rsi ? Trend.Ascending : Trend.Descending;

    if (previous.overbought !== latest.overbought) {
      this.onThresholdPassHandler({
        threshold: Threshold.Overbought,
        latestRsi: latest.rsi,
        previousRsi: previous.rsi,
        trend,
      });
    }

    if (previous.oversold !== latest.oversold) {
      this.onThresholdPassHandler({
        threshold: Threshold.Oversold,
        latestRsi: latest.rsi,
        previousRsi: previous.rsi,
        trend,
      });
    }
  }
}
