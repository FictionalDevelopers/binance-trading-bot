import { Document, model, Schema } from 'mongoose';
import values from 'lodash/values';

import { THRESHOLDS, TRENDS } from './constants';

export interface RsiSignal extends Document {
  latestRsi: number;
  previousRsi: number;
  date: Date;
  threshold: string;
  trend: string;
}

export const schema = new Schema({
  latestRsi: {
    type: Number,
    required: true,
  },
  previousRsi: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  threshold: {
    type: String,
    enum: values(THRESHOLDS),
    required: true,
  },
  trend: {
    type: String,
    enum: values(TRENDS),
    required: true,
  },
});

export default model<RsiSignal>('RsiSignal', schema);
