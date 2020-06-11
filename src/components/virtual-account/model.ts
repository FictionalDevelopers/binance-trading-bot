import { model, Schema, Document } from 'mongoose';

export interface VirtualAccount extends Document {
  accountId: string;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema({
  accountId: {
    type: String,
    required: true,
  },
  value: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  updatedAt: {
    type: Date,
    default: Date.now(),
  },
});

export default model<VirtualAccount>('VirtualAccount', schema);
