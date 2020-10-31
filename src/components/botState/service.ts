import BotStateModel, { BotState } from './model';

export async function trackBotState(botState: {
  strategyId: number;
  strategies: any;
  buyReason: string;
  enabledLimits: boolean;
  sellError: boolean;
  emaStartPoint: number;
  testMode: boolean;
  status: string;
  currentProfit: number;
  totalProfit: number;
  tradeAmountPercent: number;
  totalPercentProfit: number;
  buyPrice: number;
  currentPrice: number;
  dealsCount: number;
  cummulativeQuoteQty: number;
  order: any;
  avrDealProfit: number;
  prevPrice: number;
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
