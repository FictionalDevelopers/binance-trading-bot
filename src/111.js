import { binance } from './api/binance';
import _maxBy from 'lodash/maxBy';

// console.log(binance.depthVolume('LINKUSDT'));

const getSum = (numbers = []) =>
  numbers.reduce((sum, number) => Number(sum) + Number(number));

binance.websockets.trades('LINKUSDT', trades => {
  const {
    e: eventType,
    E: eventTime,
    s: symbol,
    p: price,
    q: quantity,
    m: maker,
    a: tradeId,
  } = trades;
  console.log(quantity);
  // console.info(
  //   'event: ' +
  //     eventType +
  //     ' trade update. price: ' +
  //     price +
  //     ', quantity: ' +
  //     quantity +
  //     ', maker: ' +
  //     maker,
  // );
});

// binance.websockets.depthCache(['LINKUSDT'], (symbol, depth) => {
//   const bids = binance.sortBids(depth.bids);
//   const asks = binance.sortAsks(depth.asks);
//   const shortBids = binance.array(bids).slice(0, 10);
//   const shortAsks = binance.array(asks).slice(0, 10);
//   const maxBidSize = _maxBy(shortBids, arrItem => arrItem[1]);
//   const maxAskSize = _maxBy(shortAsks, arrItem => arrItem[1]);
//   console.log('Max BID: ' + maxBidSize);
//   console.log('Max ASK: ' + maxAskSize);
//   // const bidsSum = getSum(shortBids.map(arr => arr[1]));
//   // const asksSum = getSum(shortAsks.map(arr => arr[1]));
//   // console.log((bidsSum / asksSum) * 100 - 100);
//
//   // console.log('bids', shortBids);
//   // console.log('asks', shortAsks);
//   // console.info('best bid: ' + binance.first(bids));
//   // console.info('best ask: ' + binance.first(asks) + '\n');
//   // console.info('last bid: ' + shortBids[9][0]);
//   // console.info('last ask: ' + shortAsks[9][0] + '\n');
// });
