import Binance from 'node-binance-api';

import { env } from '../config';

export const binance = new Binance().options({
  APIKEY: env.APIKEY,
  APISECRET: env.APISECRET,
  useServerTime: true,
  recvWindow: 60000, // Set a higher recvWindow to increase response timeout
  verbose: true, // Add extra output when subscribing to WebSockets, etc
  log: log => {
    console.log(log); // You can create your own logger here, or disable console output
  },
});
