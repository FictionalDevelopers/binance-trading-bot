import { BUY, IDLE, SELL } from './signals';

export type Action = typeof BUY | typeof SELL | typeof IDLE;

export type Signal = {
  action: Action;
  meta: any;
  type: string;
};
