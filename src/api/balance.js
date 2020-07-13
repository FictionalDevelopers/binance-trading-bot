import { get } from 'lodash';
import { binance } from './binance';

export default async function getBalances(symbol = '') {
  try {
    const data = await binance.balance();
    return get(data, symbol) || data;
  } catch (e) {
    console.log(e);
  }
}
