const Binance = require('node-binance-api');
const binance = new Binance();

const symbol = 'LINKUSDT';
const period = 14; // Период для Connors RSI

// Массивы для хранения цен закрытия и вычисленных значений Connors RSI
const closePrices = [];
const connorsRSIValues = [];

// Функция для вычисления Connors RSI
const calculateConnorsRSI = () => {
  if (closePrices.length >= period) {
    const priceSlice = closePrices.slice(-period);
    const upDays = priceSlice.filter((price, index) => {
      return price > priceSlice[index - 1];
    }).length;
    const downDays = priceSlice.filter((price, index) => {
      return price < priceSlice[index - 1];
    }).length;

    const rsi = upDays / period / (upDays / period + downDays / period);
    const connorsRSI = ((rsi + rsi * 2 + rsi * 3) / 6) * 100;

    connorsRSIValues.push(connorsRSI);
    console.log(`Connors RSI: ${connorsRSI}`);
  }
};

// Подключение к WebSocket для получения данных в реальном времени
binance.websockets.candlesticks(symbol, '1m', candlesticks => {
  const closePrice = parseFloat(candlesticks.k.c);
  closePrices.push(closePrice);

  if (closePrices.length > period) {
    closePrices.shift(); // Удаляем самый старый элемент
  }

  calculateConnorsRSI();
});

// // Обработка ошибок
// binance.websockets.error(error => {
//   console.error(error);
// });
//
// // Обработка закрытия соединения
// binance.websockets.terminate(status => {
//   console.log(`WebSocket connection terminated: ${status}`);
// });
