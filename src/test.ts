import { binance } from './api/binance';
import { getOrdersList } from './api/order';

const symbol = 'erdusdt';

const showOrders = async () => {
  let orders;
  try {
    orders = await getOrdersList(symbol.toUpperCase());
    console.log(orders[orders.length - 1]);
  } catch (e) {
    console.error(e);
  }
};

showOrders();
