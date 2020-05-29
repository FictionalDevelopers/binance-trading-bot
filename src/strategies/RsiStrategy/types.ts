import { Threshold } from './Threshold';
import { Trend } from './Trend';

export type RsiAlert = {
  overbought: boolean;
  oversold: boolean;
  rsi: number;
};

export type RsiAlertConfig = {
  period?: number;
  overboughtThreshold?: number;
  oversoldThreshold?: number;
  exchange?: string;
  symbol?: string;
  interval?: string;
};

export type ThresholdPassingDetails = {
  threshold: Threshold;
  trend: Trend;
  latestRsi: number;
  previousRsi: number;
};

export type OnThresholdPassHandler = (
  passingDetails: ThresholdPassingDetails,
) => void;

export type TickCallback = (rsiAlert: RsiAlert) => void;
