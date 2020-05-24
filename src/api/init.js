import Binance from 'node-binance-api';

import { env } from '../config';

export default new Binance().options({
    APIKEY: env.APIKEY,
    APISECRET: env.APISECRET,
});
