import { bufferCount, pluck } from 'rxjs/operators';

import { getTradeStream } from './api/trades';
import { RESOURCES, SYMBOLS } from './constants';
import { getBalances } from './api/balance';
import { connect } from './db/connection';
import { service as OrderService } from './components/orders';

(async function() {
    await connect();

    const order = await OrderService.trackPurchaseOrder({
        price: 1200,
    });

    console.log(order);

    const balance = await getBalances('USDT');

    console.log('USDT balance', balance);

    getTradeStream({
        symbol: SYMBOLS.BTCUSDT,
        resource: RESOURCES.TRADE,
    })
        .pipe(pluck('price'), bufferCount(10, 1))
        .subscribe(trade => {
            console.log(trade);
        });
})();
