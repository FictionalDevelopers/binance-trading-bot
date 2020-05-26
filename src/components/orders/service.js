import Order from './model';
import { TYPES } from './constants';

export function trackOrder({ price, type, date = new Date() }) {
  return Order.create({
    price,
    type,
    date,
  });
}

export function trackPurchaseOrder({ price, date = new Date() }) {
  return trackOrder({
    price,
    date,
    type: TYPES.PURCHASE,
  });
}

export function trackSaleOrder({ price, date = new Date() }) {
  return trackOrder({
    price,
    date,
    type: TYPES.SALE,
  });
}
