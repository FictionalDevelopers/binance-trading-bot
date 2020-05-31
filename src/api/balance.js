import { get } from 'lodash';

import binance from './init';

export async function getBalances(symbol = '') {
  const data = await binance.balance();
  return get(data, symbol) || data;
}

getBalances().then(data=>console.log(data)).catch(e=>console.log(e))