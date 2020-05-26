import mongoose from 'mongoose';

import { TYPES } from './constants';

const schema = new mongoose.Schema({
  price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(TYPES),
    required: true,
  },
});

export default mongoose.model('Order', schema);
