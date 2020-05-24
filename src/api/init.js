import Binance from 'node-binance-api';
import config from '../config';

const { APIKEY, APISECRET } = config;

export default new Binance().options({
    APIKEY,
    APISECRET,
});
