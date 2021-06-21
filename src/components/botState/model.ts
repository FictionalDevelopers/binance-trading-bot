import { model, Schema, Document } from 'mongoose';

export interface BotState extends Document {
  dealType: string;
  strategyId: number;
  strategies: any;
  buyReason: string;
  enabledLimits: boolean;
  sellError: boolean;
  emaStartPoint: number;
  testMode: boolean;
  status: string;
  currentProfit: number;
  totalLongProfit: number;
  totalShortProfit: number;
  tradeAmountPercent: number;
  totalPercentProfit: number;
  buyPrice: number;
  currentPrice: number;
  dealsCount: number;
  cummulativeQuoteQty: number;
  order: any;
  avrDealProfit: number;
  avgPrice: number;
  prevAvgPrice: number;
  prevPrice: number;
  dealPricesArr: Array<number>;
  avgDealPrice: number;
  prevAvgDealPrice: number;
  maxAvailableLongProfit: number;
  maxAvailableShortProfit: number;
  totalMaxAvailableLongProfit: number;
  totalMaxAvailableShortProfit: number;
  minAvailableLongProfit: number;
  minAvailableShortProfit: number;
  totalMinAvailableLongProfit: number;
  totalMinAvailableShortProfit: number;
  profitDiff: number;
  dmi5m: any;
  dmi1m: any;
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
  totalLongProfit: {
    type: Number,
    default: null,
  },
  totalShortProfit: {
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
  maxAvailableLongProfit: {
    type: Number,
    default: 0,
  },
  maxAvailableShortProfit: {
    type: Number,
    default: 0,
  },
  totalMaxAvailableLongProfit: {
    type: Number,
    default: 0,
  },
  totalMaxAvailableShortProfit: {
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
  minAvailableLongProfit: {
    type: Number,
    default: 0,
  },
  totalMinAvailableLongProfit: {
    type: Number,
    default: 0,
  },
  minAvailableShortProfit: {
    type: Number,
    default: 0,
  },
  totalMinAvailableShortProfit: {
    type: Number,
    default: 0,
  },
  dealPricesArr: {
    type: Array,
    default: [],
  },
  avgDealPrice: {
    type: Number,
    default: 0,
  },
  prevAvgDealPrice: {
    type: Number,
    default: 0,
  },
  avgPrice: {
    type: Number,
    default: 0,
  },
  prevAvgPrice: {
    type: Number,
    default: 0,
  },
  dealType: {
    type: String,
    default: '',
  },
  dmi5m: {
    type: Object,
    default: {},
  },
  dmi1m: {
    type: Object,
    default: {},
  },
});

export default model<BotState>('BotState', schema);
