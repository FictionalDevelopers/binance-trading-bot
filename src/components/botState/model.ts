import { model, Schema, Document } from 'mongoose';

export interface BotState extends Document {
  emaStartPoint: number;
  buyPrice: number;
  dealsCount: number;
}

const schema = new Schema({
  status: {
    type: String,
    required: true,
  },
  emaStartPoint: {
    type: Number,
    required: true,
    default: null,
  },
  buyPrice: {
    type: Number,
    default: null,
    required: true,
  },
  dealsCount: {
    type: Number,
    default: 1,
  },
  enabledLimits: {
    type: Boolean,
    default: false,
    required: true,
  },
  boughtBeforeResistanceLevel: {
    type: Boolean,
    default: false,
    required: true,
  },
});

export default model<BotState>('BotState', schema);
