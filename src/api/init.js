import Binance from 'node-binance-api';

import { env } from '../config';

export const binance = new Binance().options({
  APIKEY: env.APIKEY,
  APISECRET: env.APISECRET,
});
