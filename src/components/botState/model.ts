import { model, Schema, Document } from 'mongoose';

export interface BotState extends Document {
  emaStartPoint: number;
}

const schema = new Schema({
  emaStartPoint: {
    type: Number,
    required: true,
    default: null,
  },
});

export default model<BotState>('BotState', schema);
