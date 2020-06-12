import { model, Schema, Document } from 'mongoose';

export interface VirtualAccount extends Document {
  accountId: string;
  initialBalance: number;
  available: number;
  onOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema({
  accountId: {
    type: String,
    required: true,
  },
  initialBalance: {
    type: Number,
    default: 0,
  },
  available: {
    type: Number,
    default: 0,
  },
  onOrder: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  updatedAt: {
    type: Date,
    default: new Date(),
  },
});

export default model<VirtualAccount>('VirtualAccount', schema);
