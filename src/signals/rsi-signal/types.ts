import { Signal } from '../types';

export type RsiAlert = {
  overbought: boolean;
  oversold: boolean;
  rsi: number;
};

export type RsiSignalConfig = {
  period?: number;
  overboughtThreshold?: number;
  oversoldThreshold?: number;
  exchange?: string;
  symbol?: string;
  interval?: string;
};

export type RsiSignal = Signal & {
  meta: { rsi: number };
};
