import { model, Schema, Document } from 'mongoose';

export interface BotState extends Document {
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
  dealPricesArr: Array<number>;
  avgDealPrice: number;
  prevAvgDealPrice: number;
  maxAvailableProfit: number;
  totalMaxAvailableProfit: number;
  minAvailableProfit: number;
  totalMinAvailableProfit: number;
  profitDiff: number;
}
const schema = new Schema({
  strategyId: {
    type: Number,
    default: 1,
    required: true,
  },
  strategies: {
    scalper: {
      enabled: {
        type: Boolean,
        default: false,
      },
      stopLoss: {
        type: Boolean,
        default: false,
      },
    },
    upTrend: {
      enabled: {
        type: Boolean,
        default: false,
      },
      stopLoss: {
        type: Boolean,
        default: false,
      },
    },
    downTrend: {
      enabled: {
        type: Boolean,
        default: false,
      },
      stopLoss: {
        type: Boolean,
        default: false,
      },
    },
    upFlat: {
      enabled: {
        type: Boolean,
        default: false,
      },
      stopLoss: {
        type: Boolean,
        default: false,
      },
    },
    downFlat: {
      enabled: {
        type: Boolean,
        default: false,
      },
      stopLoss: {
        type: Boolean,
        default: false,
      },
    },
    stochRsi: {
      enabled: {
        type: Boolean,
        default: false,
      },
      stopLoss: {
        type: Boolean,
        default: false,
      },
    },
    trendsCatcher: {
      enabled: {
        type: Boolean,
        default: false,
      },
      stopLoss: {
        type: Boolean,
        default: false,
      },
    },
  },
  buyReason: {
    type: String,
    default: null,
  },
  enabledLimits: {
    type: Boolean,
    default: false,
  },
  sellError: {
    type: Boolean,
    default: false,
  },
  emaStartPoint: {
    type: Number,
    default: null,
  },
  testMode: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    default: 'buy',
  },
  currentProfit: {
    type: Number,
    default: null,
  },
  totalProfit: {
    type: Number,
    default: null,
  },
  tradeAmountPercent: {
    type: Number,
    default: 0.95,
  },
  totalPercentProfit: {
    type: Number,
    default: null,
  },
  buyPrice: {
    type: Number,
    default: null,
  },
  currentPrice: {
    type: Number,
    default: null,
  },
  dealsCount: {
    type: Number,
    default: 1,
  },
  cummulativeQuoteQty: {
    type: Number,
    default: null,
  },
  order: {
    type: Object,
    default: null,
  },
  avrDealProfit: {
    type: Number,
    default: null,
  },
  prevPrice: {
    type: Number,
    default: null,
  },
  maxAvailableProfit: {
    type: Number,
    default: 0,
  },
  totalMaxAvailableProfit: {
    type: Number,
    default: 0,
  },
  profitDiff: {
    type: Number,
    default: 0,
  },
  isPricesStreamAlive: {
    type: Boolean,
    default: false,
  },
  minAvailableProfit: {
    type: Number,
    default: 0,
  },
  totalMinAvailableProfit: {
    type: Number,
    default: 0,
  },
  dealPricesArr: {
    type: Number,
    default: 0,
  },
  avgDealPrice: {
    type: Number,
    default: 0,
  },
  prevAvgDealPrice: {
    type: Number,
    default: 0,
  },
});

export default model<BotState>('BotState', schema);
