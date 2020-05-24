import { load } from 'dotenv-extended';

const env = load({
    includeProcessEnv: true,
});

export default {
    APIKEY: env.APIKEY,
    APISECRET: env.APISECRET,
    DB_URL: env.DB_URL,
};
