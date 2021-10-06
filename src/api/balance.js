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
    const balance = data.find(({ asset }) => asset === symbol.toUpperCase());
    console.log(balance);
    return balance.withdrawAvailable ? balance.withdrawAvailable : balance;
  } catch (e) {
    console.log(e);
  }
}
