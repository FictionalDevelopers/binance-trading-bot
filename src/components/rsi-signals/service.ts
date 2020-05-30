import RsiSignalModel, { RsiSignal } from './model';

export async function trackRsiSignal(rsiSignal: {
  rsi: number;
  price: number;
  signal: string;
}): Promise<RsiSignal> {
  return RsiSignalModel.create({
    rsi: rsiSignal.rsi,
    price: rsiSignal.price,
    signal: rsiSignal.signal,
    date: new Date(),
  });
}
