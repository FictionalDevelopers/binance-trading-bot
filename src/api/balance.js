import { get } from 'lodash';
import { binance } from './binance';

export async function getBalances(symbol = '') {
  try {
    const data = await binance.balance();
    return get(data, symbol) || data;
  } catch (e) {
    console.log(e);
  }
}

export async function getFuturesBalances(symbol = '') {
  try {
    const data = await binance.futuresBalance();
    return data.find(({ asset }) => asset === symbol.toUpperCase())
      .withdrawAvailable;
  } catch (e) {
    console.log(e);
  }
}
