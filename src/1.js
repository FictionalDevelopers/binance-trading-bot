// import WebSocket from 'ws';
//
// // Создайте WebSocket-соединение с Binance
// const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
//
// // Обработка события открытия соединения
// ws.on('open', () => {
//   console.log('WebSocket соединение установлено.');
// });
//
// // Обработка входящих сообщений
// ws.on('message', data => {
//   const tradeData = JSON.parse(data);
//
//   // Определите тип сделки
//   const tradeType = tradeData.M ? 'Продажа' : 'Покупка';
//
//   console.log(`Тип сделки: ${tradeType}`);
//   console.log(`Цена: ${tradeData.p}`);
//   console.log(`Количество: ${tradeData.q}`);
// });
//
// // Обработка ошибок
// ws.on('error', error => {
//   console.error('Произошла ошибка:', error);
// });
//
// // Обработка закрытия соединения
// ws.on('close', () => {
//   console.log('WebSocket соединение закрыто.');
// });
const TechnicalIndicators = require('technicalindicators');
const { RSI, SMA, WildersSmoothing } = TechnicalIndicators;

const binance = require('node-binance-api')().options({});

// Parameters for Connors RSI
const rsiPeriod = 3; // RSI period
const smaPeriod = 2; // SMA period
const wildersSmoothingPeriod = 14; // Wilder's smoothing period

const connorsRSI = new RSI({ period: rsiPeriod });
const sma2 = new SMA({ period: smaPeriod });
const wildersSmoothing = new WildersSmoothing({
  period: wildersSmoothingPeriod,
});

const connorsRSIValues = [];

// Function to update Connors RSI values
function updateConnorsRSI(newPrice) {
  connorsRSI.update({ close: newPrice });
  sma2.update(connorsRSI.getResult());
  wildersSmoothing.update(sma2.getResult());
  connorsRSIValues.push(wildersSmoothing.getResult());
}

// Connect to Binance WebSocket for real-time price updates
binance.websockets.spotPrice(['LINKUSDT'], (symbol, price) => {
  const currentPrice = parseFloat(price);

  // Update Connors RSI values with new price
  updateConnorsRSI(currentPrice);

  // Get the latest Connors RSI value
  const latestConnorsRSIValue = connorsRSIValues[connorsRSIValues.length - 1];

  console.log(`Current Price: ${currentPrice}`);
  console.log(`Connors RSI: ${latestConnorsRSIValue}`);
});
