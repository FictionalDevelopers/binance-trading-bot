import { binance } from './api/binance';

export const getOrders = (symbol: string): Promise<unknown> =>
  new Promise((resolve, reject) => {
    binance.allOrders(symbol, (error, orders) => {
      if (error) {
        return reject(error);
      }
      return resolve(orders);
    });
  });

const showOrders = async () => {
  let orders;
  try {
    orders = await getOrders('ERDUSDT');
    console.log(orders[orders.length - 1]);
  } catch (e) {
    console.error(e);
  }
};

showOrders();
