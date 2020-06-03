import { model, Schema, Document } from 'mongoose';

export interface TelegramSubscription extends Document {
  chatId: number;
  subscribed: boolean;
  firstName: string;
  lastName: string;
  username: string;
  type: string;
  date: Date;
}

const schema = new Schema({
  chatId: {
    type: Number,
    required: true,
  },
  firstName: {
    type: String,
    default: '',
  },
  lastName: {
    type: String,
    default: '',
  },
  username: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: '',
  },
  subscribed: {
    type: Boolean,
    default: true,
  },
  date: {
    type: Date,
    required: true,
  },
});

export default model<TelegramSubscription>('TelegramSubscription', schema);
