import { Observable } from 'rxjs';
import { bufferCount, tap } from 'rxjs/operators';

import { getRsiAlertStream } from '../../indicators/rsi';

import { Threshold } from './Threshold';
import { Trend } from './Trend';

import { OnThresholdPassHandler, RsiAlert, RsiAlertConfig, TickCallback } from './types';

export class RsiStrategy {
  private rsiStream: Observable<RsiAlert>;
  private onThresholdPassHandler: OnThresholdPassHandler;

  constructor(rsiAlertConfig?: RsiAlertConfig) {
    this.rsiStream = getRsiAlertStream(rsiAlertConfig);
  }

  public run(tickCallback?: TickCallback): void {
    this.rsiStream
      .pipe(tap(tickCallback), bufferCount(2, 1))
      .subscribe(alerts => this.handleRsiAlert(alerts));
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
