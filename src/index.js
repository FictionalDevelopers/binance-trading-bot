import { getTradeStream } from './trades';

const SYMBOLS = {
    BTCUSDT: 'btcusdt',
    BNBUSDT: 'bnbusdt',
    BNBBTC: 'bnbbtc',
};

const RESOURCES = {
    AGG_TRADE: 'aggTrade',
    TICKER: 'ticker',
    KLINE: 'kline',
};

getTradeStream({
    symbol: SYMBOLS.BTCUSDT,
    resource: RESOURCES.AGG_TRADE,
}).subscribe(trade => {
    console.log(trade);
});
