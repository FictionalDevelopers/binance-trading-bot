import { binance } from './api/binance';
import sortBy from 'lodash/_baseSortBy';
import { getEMASignal } from './components/ema-signals';

const symbol = process.argv[2];

const indicatorsData = {};

export const getPairs = () => {
  return new Promise((res, rej) => {
    binance.prevDay(false, (error, prevDay) => {
      // console.info(prevDay); // view all data
      const filteredArr = prevDay
        .filter(elem => elem.symbol.toString().endsWith('USDT'))
        .filter(elem => Number(elem.quoteVolume) > 9000000);

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
      // console.log(resArr);
      // console.log(resArr.length);
      if (error) rej(error);
      res(resArr);
    });
  });
};

const getEMAData = async (indicatorsData = {}) => {
  return new Promise((res, rej) => {
    getEMASignal(symbol, '1m', indicatorsData);
    getEMASignal(symbol, '15m', indicatorsData);
    getEMASignal(symbol, '1h', indicatorsData);
    const intervalId = setInterval(() => {
      if (
        indicatorsData.fast1mEMA &&
        indicatorsData.middle1mEMA &&
        indicatorsData.slow1mEMA &&
        indicatorsData.fast15mEMA &&
        indicatorsData.middle15mEMA &&
        indicatorsData.fast1hEMA &&
        indicatorsData.middle1hEMA
      ) {
        clearInterval(intervalId);
        res(indicatorsData);
      }
    }, 1000);
  });
};

// setInterval(() => {
//   const summary1m =
//     indicatorsData.fast1mEMA < indicatorsData.middle1mEMA &&
//     indicatorsData.middle1mEMA < indicatorsData.slow1mEMA;
//
//   const summary15m = indicatorsData.fast15mEMA > indicatorsData.middle15mEMA;
//   const summary1h = indicatorsData.fast1hEMA > indicatorsData.middle1hEMA;
//
//   const summaryEMABuySignal = summary1h && summary1m && summary15m;
//   console.log('summaryEMABuySignal', summaryEMABuySignal);
//   console.log('summary1mEMABuySignal', summary1m);
//   console.log('summary15mEMABuySignal', summary15m);
//   console.log('summary1hEMABuySignal', summary1h);
//   console.log(indicatorsData);
// }, 1000);

const showData = async () => {
  const pairs = await getPairs();
  pairs.forEach(pair => {
    console.log(pair[0]);
  });
  // const res = await getEMAData();
  // console.log(pairs);
};

showData();
