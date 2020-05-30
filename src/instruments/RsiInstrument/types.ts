export type RsiAlert = {
  overbought: boolean;
  oversold: boolean;
  rsi: number;
};

export type RsiInstrumentConfig = {
  period?: number;
  overboughtThreshold?: number;
  oversoldThreshold?: number;
  exchange?: string;
  symbol?: string;
  interval?: string;
};
