const ccxt = require('ccxt');
const talib = require('talib');
const axios = require('axios');
const WebSocket = require('ws');

const exchange = new ccxt.binance();
const symbol = 'LINK/USDT';

const inputTimeframe = '1h'; // Можно изменить желаемый таймфрейм

async function calculateConnorsRSI() {
  // Получение исторических данных
  const historicalData = await exchange.fetchOHLCV(symbol, inputTimeframe);
  const closePrices = historicalData.map(data => data[4]);

  // Рассчитываем Connors RSI
  const input = {
    name: 'RSI',
    type: 'price',
    startIdx: 0,
    endIdx: closePrices.length - 1,
    inReal: closePrices,
    optInTimePeriod: 3, // Период RSI
  };

  talib.execute(input, (err, result) => {
    if (err) {
      console.error('Ошибка при вычислении RSI:', err);
      return;
    }

    const rsiValues = result.result.outReal;
    const connorsRSI = rsiValues.map((rsi, index) => {
      if (index < 2) return 0;
      const yesterdayRsi = rsiValues[index - 1];
      const twoDaysAgoRsi = rsiValues[index - 2];
      return (rsi + yesterdayRsi + twoDaysAgoRsi) / 3;
    });

    // Подключаемся к WebSocket Binance для получения данных в реальном времени
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/linkusdt@trade');

    ws.on('message', async data => {
      const tradeData = JSON.parse(data);
      const lastPrice = parseFloat(tradeData.p);
      // Добавляем последнюю цену закрытия
      closePrices.push(lastPrice);
      // Обновляем Connors RSI
      talib.execute(input, (err, result) => {
        if (err) {
          console.error('Ошибка при вычислении RSI:', err);
          return;
        }
        const latestRSI = result.result.outReal.pop();
        const latestConnorsRSI =
          (latestRSI +
            rsiValues[rsiValues.length - 1] +
            rsiValues[rsiValues.length - 2]) /
          3;
        console.log('Последний Connors RSI:', latestConnorsRSI);
      });
    });

    ws.on('error', err => {
      console.error('Ошибка WebSocket:', err);
    });
  });
}

calculateConnorsRSI();
