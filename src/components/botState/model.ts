import { model, Schema, Document } from 'mongoose';

export interface BotState extends Document {
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
}
const schema = new Schema({
  strategies: {
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
});

export default model<BotState>('BotState', schema);
