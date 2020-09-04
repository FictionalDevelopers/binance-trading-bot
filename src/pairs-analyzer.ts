import { binance } from './api/binance';
import sortBy from 'lodash/_baseSortBy';
import { getEMASignal } from './components/ema-signals';
import { getDMISignal } from './components/dmi-signals';

const symbol = process.argv[2];

const data = {};

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

const getEMAData = async (symbol, indicatorsData = {}) => {
  return new Promise((res, rej) => {
    // getEMASignal(symbol, '1m', indicatorsData);
    getEMASignal(symbol, '5m', indicatorsData);
    // getEMASignal(symbol, '1h', indicatorsData);
    const intervalId = setInterval(() => {
      if (
        indicatorsData.fast5mEMA &&
        indicatorsData.middle5mEMA &&
        indicatorsData.slow5mEMA
        // indicatorsData.fast15mEMA &&
        // indicatorsData.middle15mEMA &&
        // indicatorsData.slow1hEMA &&
        // indicatorsData.middle1hEMA
      ) {
        clearInterval(intervalId);
        res(indicatorsData);
      }
    }, 1000);
  });
};

const getDMIData = async (
  symbol,
  indicators1hData = {},
  indicators5mData = {},
) => {
  return new Promise((res, rej) => {
    // getEMASignal(symbol, '1m', indicatorsData);
    getDMISignal(symbol, '5m', indicators5mData);
    const intervalId = setInterval(() => {
      if (
        indicators5mData.adx &&
        indicators5mData.mdi &&
        indicators5mData.pdi
        // indicators1hData.adx &&
        // indicators1hData.mdi &&
        // indicators1hData.pdi
      ) {
        clearInterval(intervalId);
        res({
          // dmi1h: indicators1hData,
          dmi5m: indicators5mData,
        });
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

const checkConclusion = indicatorsData => {
  // const summary1m =
  //   indicatorsData.fast1mEMA < indicatorsData.middle1mEMA &&
  //   indicatorsData.middle1mEMA < indicatorsData.slow1mEMA;

  // const summary15m = indicatorsData.fast15mEMA > indicatorsData.middle15mEMA;
  // const summary1h = indicatorsData.fast1hEMA > indicatorsData.middle1hEMA;
  const summary1h = indicatorsData.middle1hEMA > indicatorsData.slow1hEMA;

  const summaryEMABuySignal = summary1h;
  return summaryEMABuySignal;
};

const showData = async () => {
  try {
    const pairs = await getPairs();
    const suitablePairs = [];
    for (const pair of pairs.slice(0, 2)) {
      const symbol = pair[0].toLowerCase();
      const pairEMAData = await getEMAData(symbol, {});
      console.log(symbol, pairEMAData);
      const isPairSuitable = checkConclusion(pairEMAData);
      if (isPairSuitable) pairs.push([symbol]);
    }
    console.log(suitablePairs);
  } catch (e) {
    console.error(e);
  }
};

// showData();
const showOne = async symbol => {
  const data = await getEMAData(symbol, {});
  if (
    data.fast5mEMA > data.middle5mEMA &&
    data.middle5mEMA > data.slow5mEMA
    // indicatorsData.fast15mEMA >= indicatorsData.middle15mEMA;
    // indicatorsData.fast1hEMA > indicatorsData.middle1hEMA;
    // data.fast1hEMA > data.middle1hEMA
    // &&
    // data.middle1hEMA > data.slow1hEMA
  ) {
    console.log(symbol, data);
    // console.log('1h', (data.fast1hEMA / data.middle1hEMA) * 100 - 100);
    // console.log('15m', (data.fast15mEMA / data.middle15mEMA) * 100 - 100);
  } else console.log(false);
};

showOne(symbol);
