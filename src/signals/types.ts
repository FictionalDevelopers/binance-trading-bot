import { BUY, SELL, STOP_BUY, STOP_SELL, IDLE } from './signals';

export type Signal = {
  signal:
    | typeof BUY
    | typeof STOP_BUY
    | typeof SELL
    | typeof STOP_SELL
    | typeof IDLE;
};
