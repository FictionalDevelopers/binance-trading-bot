import { model, Schema, Document } from 'mongoose';

export interface BotState extends Document {
  emaStartPoint: number;
  buyPrice: number;
  dealsCount: number;
}

const schema = new Schema({
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
});

export default model<BotState>('BotState', schema);
