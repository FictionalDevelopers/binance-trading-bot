import { config } from 'dotenv';

const { parsed } = config();

export default {
    APIKEY: parsed.APIKEY,
    APISECRET: parsed.APISECRET,
    DB_URL: parsed.DB_URL,
};
