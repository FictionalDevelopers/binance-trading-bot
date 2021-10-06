import StochRsiSignalModel, { StochSignal } from './model';

export async function trackRsiSignal(rsiSignal: {
  rsi: number;
  price: number;
  signal: string;
}): Promise<StochSignal> {
  return StochRsiSignalModel.create({
    rsi: rsiSignal.rsi,
    price: rsiSignal.price,
    signal: rsiSignal.signal,
    date: new Date(),
  });
}
