import { Signal } from '../types';

export type RsiPair = {
  previous: number;
  latest: number;
};

export type RsiSignal = Signal & {
  meta: { rsi: RsiPair };
};
