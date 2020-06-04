import { get } from 'lodash';

import { binance } from './binance';

export async function getBalances(symbol = '') {
  const data = await binance.balance();
  return get(data, symbol) || data;
}
