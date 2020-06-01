import { BUY, SELL } from '../instruments/signals';
import { Instrument } from '../instruments/Instrument';
import { BuySignaller, SellSignaller } from '../types';

type StrategyConfig<T> = {
  instruments: Instrument<T>[];
};

type SignalHandler = () => void;

export class Strategy<T> implements BuySignaller<T>, SellSignaller<T> {
  private instruments: Instrument<T>[] = [];
  private buySignals: Set<Instrument<T>> = new Set();
  private sellSignals: Set<Instrument<T>> = new Set();

  private buySignalHandler: SignalHandler;
  private sellSignalHandler: SignalHandler;

  constructor(config: StrategyConfig<T>) {
    this.instruments = config.instruments;

    this.instruments.forEach(instrument => {
      instrument.onBuySignall(() => {
        this.handleInstrumentBuySignal(instrument);
      });
      instrument.onSellSignall(() => {
        this.handleInstrumentSellSignal(instrument);
      });
      instrument.onBuyStopSignall(() => {
        this.handleInstrumentBuyStopSignal(instrument);
      });
      instrument.onSellStopSignall(() => {
        this.handleInstrumentSellStopSignal(instrument);
      });
    });
  }

  public onBuySignall(handler: SignalHandler): void {
    this.buySignalHandler = handler;
  }

  public onSellSignall(handler: SignalHandler): void {
    this.sellSignalHandler = handler;
  }

  private handleInstrumentBuySignal(instrument: Instrument<T>) {
    this.buySignals.add(instrument);
    console.log('STRATEGY BUY SIGNALLS', this.buySignals);

    if (this.buySignals.size === this.instruments.length) {
      this.buySignalHandler();
    }
  }

  private handleInstrumentBuyStopSignal(instrument: Instrument<T>) {
    this.buySignals.delete(instrument);
  }

  private handleInstrumentSellSignal(instrument: Instrument<T>) {
    this.sellSignals.add(instrument);
    console.log('STRATEGY SELL SIGNALLS', this.buySignals);
    if (this.sellSignals.size === this.instruments.length) {
      this.sellSignalHandler();
    }
  }

  private handleInstrumentSellStopSignal(instrument: Instrument<T>) {
    this.sellSignals.delete(instrument);
  }
}
