import mongoose from 'mongoose';

import { env } from '../config';

export const connect = (url = env.DB_URL) =>
  mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
