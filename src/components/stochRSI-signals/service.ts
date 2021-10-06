import StochRsiSignalModel, { StochRsiSignal } from './model';

export async function trackRsiSignal(rsiSignal: {
  rsi: number;
  price: number;
  signal: string;
}): Promise<StochRsiSignal> {
  return StochRsiSignalModel.create({
    rsi: rsiSignal.rsi,
    price: rsiSignal.price,
    signal: rsiSignal.signal,
    date: new Date(),
  });
}
