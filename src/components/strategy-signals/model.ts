import { model, Schema, Document } from 'mongoose';

type Action = 'SELL' | 'BUY';

type Signal = {
  action: Action;
  meta: any;
  type: string;
};

export interface StrategySignal extends Document {
  action: Action;
  date: Date;
  signals: Signal[];
}

const subSignalSchema = new Schema({
  action: {
    type: String,
    enum: ['SELL', 'BUY'],
    required: true,
  },
  meta: {},
});

const schema = new Schema({
  action: {
    type: String,
    enum: ['SELL', 'BUY'],
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  signals: [subSignalSchema],
});

export default model<StrategySignal>('StrategySignal', schema);
