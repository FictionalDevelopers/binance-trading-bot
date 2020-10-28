import { Document, model, Schema } from 'mongoose';

export interface StochRsiSignal extends Document {
  latestRsi: number;
  previousRsi: number;
  date: Date;
  threshold: string;
  trend: string;
}

export const schema = new Schema({
  rsi: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  signal: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
});

export default model<StochRsiSignal>('StochRsiSignal', schema);
