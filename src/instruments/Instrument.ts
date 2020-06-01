import noop from 'lodash/noop';

import {
  BuySignaller,
  StopBuySignaller,
  SellSignaller,
  StopSellSignaller,
} from '../types';

export interface Instrument<T>
  extends BuySignaller<T>,
    StopBuySignaller<T>,
    SellSignaller<T>,
    StopSellSignaller<T> {}

export type SignalHandler<T> = (signalDetails: T) => void;

export class Instrument<T> implements Instrument<T> {
  protected buySignalHandler: SignalHandler<T> = noop;
  protected sellSignalHandler: SignalHandler<T> = noop;
  protected buyStopSignallHandler: SignalHandler<T> = noop;
  protected sellStopSignallHandler: SignalHandler<T> = noop;

  public onBuySignall(handler: SignalHandler<T>): void {
    this.buySignalHandler = handler;
  }

  public onSellSignall(handler: SignalHandler<T>): void {
    this.sellSignalHandler = handler;
  }

  public onBuyStopSignall(handler: SignalHandler<T>): void {
    this.buyStopSignallHandler = handler;
  }

  public onSellStopSignall(handler: SignalHandler<T>): void {
    this.sellSignalHandler = handler;
  }
}
