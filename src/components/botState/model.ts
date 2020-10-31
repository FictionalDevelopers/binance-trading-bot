import { model, Schema, Document } from 'mongoose';

export interface BotState extends Document {
  emaStartPoint: number;
  buyPrice: number;
  dealsCount: number;
}

const botState = {
  cummulativeQuoteQty: null,
  order: null,
  avrDealProfit: null,
  dealsCount: 1,
  startTime: new Date().getTime(),
  workDuration: null,
  stopLoss: null,
  prevPrice: null,
  updateState: function(fieldName, value) {
    this[`${fieldName}`] = value;
  },
};

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
});

export default model<BotState>('BotState', schema);
