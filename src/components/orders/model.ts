import { model, Schema, Document, Types } from 'mongoose';

import { model as StrategySignalModel } from '../strategy-signals';

export interface Order extends Document {
  action: 'SELL' | 'BUY';
  price: number;
  date: Date;
}

const schema = new Schema({
  price: {
    type: Number,
    required: true,
  },
  strategySignal: {
    type: Types.ObjectId,
    ref: StrategySignalModel,
  },
  date: {
    type: Date,
    required: true,
  },
  action: {
    type: String,
    enum: ['SELL', 'BUY'],
    required: true,
  },
});

export default model<Order>('Order', schema);
