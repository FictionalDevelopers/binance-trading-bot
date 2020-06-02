import { BUY, SELL, STOP_BUY, STOP_SELL, IDLE } from './signals';

export type Action =
  | typeof BUY
  | typeof STOP_BUY
  | typeof SELL
  | typeof STOP_SELL
  | typeof IDLE;

export type Signal = {
  action: Action;
  meta: any;
  type: string;
};
