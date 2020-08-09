import { binance } from './api/binance';
import sortBy from 'lodash/_baseSortBy';

export default binance.prevDay(false, (error, prevDay) => {
  console.info(prevDay); // view all data
  const filteredArr = prevDay
    .filter(elem => elem.symbol.toString().endsWith('USDT'))
    .filter(elem => Number(elem.quoteVolume) > 12000000);

  // console.log(filteredArr)
  const resArr = filteredArr.map(({ symbol, quoteVolume }) => [
    symbol,
    Number(quoteVolume),
  ]);
  resArr.sort((currPair, nextPair) => {
    if (currPair[1] < nextPair[1]) return 1;
    if (currPair[1] == nextPair[1]) return 0;
    if (currPair[1] > nextPair[1]) return -1;
  });
  console.log(resArr);
  console.log(resArr.length);
});
