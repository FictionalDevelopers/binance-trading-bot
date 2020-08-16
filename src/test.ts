import { getOrdersList } from './api/order';
import { getTradesHistory } from './api/order';

async function aaa() {
  try {
    const ordersList = await getTradesHistory(false);
    console.log(ordersList);
  } catch (e) {
    console.log(e);
  }
}

aaa();
