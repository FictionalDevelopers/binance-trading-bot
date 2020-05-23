const getTradeStream = require('./trades');

const SYMBOLS = {
    BTCUSDT: 'btcusdt',
    BNBUSDT: 'bnbusdt',
    BNBBTC: 'bnbbtc'
};

const RESOURCES = {
    AGG_TRADE: 'aggTrade',
    TICKER: 'ticker'
};

getTradeStream({
    symbol: SYMBOLS.BNBUSDT,
    resource: RESOURCES.AGG_TRADE
}).subscribe(trade => {
    console.log(trade);
});
