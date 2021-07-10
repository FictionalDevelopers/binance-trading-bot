import { get, find } from 'lodash';
import { binance } from './binance';

export const getExchangeInfo = async (
  symbol: string,
  filterType: string,
): Promise<unknown> => {
  const { symbols } = await binance.exchangeInfo();
  const symbolInfo = find(symbols, { symbol });
  const filters = get(symbolInfo, 'filters', []);
  return find(filters, { filterType }) || {};
};

export const getFuturesExchangeInfo = async (
  symbol: string,
  filterType: string,
): Promise<unknown> => {
  const { symbols } = await binance.exchangeInfo();
  const symbolInfo = find(symbols, { symbol });
  const filters = get(symbolInfo, 'filters', []);
  return find(filters, { filterType }) || {};
};
