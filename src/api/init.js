import Binance from 'node-binance-api';
import dotenv from 'dotenv';

dotenv.config();
const { APIKEY, APISECRET } = process.env;

export default new Binance().options({
    APIKEY,
    APISECRET,
});
