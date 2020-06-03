export const COMMON = {
  e: 'eventType',
  E: 'eventTime',
  t: 'tradeId',
  s: 'symbol',
  a: 'aggregateTradeId',
  p: 'price',
  q: 'quantity',
  f: 'firstTradeId',
  l: 'lastTradeId',
  T: 'tradeTime',
  m: 'isBuyerMarketMaker',
  k: 'kline',
};

export const KLINE = {
  ...COMMON,
  t: 'startTime',
  T: 'closeTime',
  i: 'interval',
  f: 'firstTradeId',
  L: 'lastTradeId',
  o: 'openPrice',
  c: 'closePrice',
  h: 'highPrice',
  l: 'lowPrice',
  v: 'baseAssetVolume',
  n: 'numberOfTrades',
  x: 'isClosed',
  q: 'quoteAssetVolume',
  V: 'takerBuyBaseAssetVolume',
  Q: 'takerBuyQuoteAssetVolume',
};

export const RSI_ALERT = {
  overBought: 'overbought',
  overSold: 'oversold',
  rsiVal: 'rsi',
};

export const TELEGRAM_CHAT = {
  id: 'chatId',
  first_name: 'firstName',
  last_name: 'lastName',
};
