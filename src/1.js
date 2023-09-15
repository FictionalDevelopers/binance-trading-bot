import WebSocket from 'ws';

// Создайте WebSocket-соединение с Binance
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

// Обработка события открытия соединения
ws.on('open', () => {
  console.log('WebSocket соединение установлено.');
});

// Обработка входящих сообщений
ws.on('message', data => {
  const tradeData = JSON.parse(data);

  // Определите тип сделки
  const tradeType = tradeData.M ? 'Продажа' : 'Покупка';

  console.log(`Тип сделки: ${tradeType}`);
  console.log(`Цена: ${tradeData.p}`);
  console.log(`Количество: ${tradeData.q}`);
});

// Обработка ошибок
ws.on('error', error => {
  console.error('Произошла ошибка:', error);
});

// Обработка закрытия соединения
ws.on('close', () => {
  console.log('WebSocket соединение закрыто.');
});
