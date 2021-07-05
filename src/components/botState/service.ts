import BotStateModel, { BotState } from './model';

export async function trackBotState(botState: {
  initialDealType: string;
  dealType: string;
  totalLongProfit: number;
  totalShortProfit: number;
  maxAvailableLongProfit: number;
  maxAvailableShortProfit: number;
  totalMaxAvailableLongProfit: number;
  totalMaxAvailableShortProfit: number;
  minAvailableLongProfit: number;
  totalMinAvailableLongProfit: number;
  minAvailableShortProfit: number;
  totalMinAvailableShortProfit: number;
  profitDiff: number;
  isPricesStreamAlive: boolean;
  strategyId: number;
  strategies: any;
  buyReason: string;
  enabledLimits: boolean;
  sellError: boolean;
  emaStartPoint: number;
  testMode: boolean;
  status: string;
  currentProfit: number;
  tradeAmountPercent: number;
  totalPercentProfit: number;
  buyPrice: number;
  currentPrice: number;
  dealsCount: number;
  cummulativeQuoteQty: number;
  order: any;
  avrDealProfit: number;
  prevPrice: number;
  dealPricesArr: Array<number>;
  avgDealPrice: number;
  prevAvgDealPrice: number;
  avgPrice: number;
  prevAvgPrice: number;
  dmi5m: any;
  dmi1m: any;
}): Promise<BotState> {
  return BotStateModel.findOneAndUpdate(
    {
      strategyId: 1,
    },
    botState,
    {
      rawResult: false,
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
}

export async function getBotState(): Promise<Array<BotState>> {
  return BotStateModel.find({
    strategyId: 1,
  });
}
