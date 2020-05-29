import {
  Threshold,
  ThresholdPassingDetails,
  Trend,
} from '../../strategies/RsiStrategy';

import RsiSignalModel, { RsiSignal } from './model';
import { THRESHOLDS, TRENDS } from './constants';

const TREND_MAPPER = {
  [Trend.Descending]: TRENDS.DESCENDING,
  [Trend.Ascending]: TRENDS.ASCENDING,
};
const THRESHOLDS_MAPPER = {
  [Threshold.Overbought]: THRESHOLDS.OVERBOUGHT,
  [Threshold.Oversold]: THRESHOLDS.OVERSOLD,
};

export async function trackRsiSignal(
  rsiSignal: ThresholdPassingDetails,
): Promise<RsiSignal> {
  const trend = TREND_MAPPER[rsiSignal.trend];
  const threshold = THRESHOLDS_MAPPER[rsiSignal.threshold];

  return RsiSignalModel.create({
    latestRsi: rsiSignal.latestRsi,
    previousRsi: rsiSignal.previousRsi,
    threshold,
    trend,
    date: new Date(),
  });
}
