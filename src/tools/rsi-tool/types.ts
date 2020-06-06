import { Signal } from '../types';

export type RsiToolConfig = {
  exchange?: string;
  symbol: string;
  period: number;
  interval: string;
  overboughtThresholds: number[];
  oversoldThresholds: number[];
};

export type RsiPair = {
  previous: number;
  latest: number;
};

export type RsiSignal = Signal & {
  meta: { rsi: RsiPair };
};
