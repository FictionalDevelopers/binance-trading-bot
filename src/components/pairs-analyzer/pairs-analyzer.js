import binance from '../../api/init';
import sortBy from 'lodash/_baseSortBy';

export default binance.prevDay(false, (error, prevDay) => {
    // console.info(prevDay); // view all data
    let filteredArr = prevDay.filter(elem=> elem.symbol.toString().endsWith('USDT'));
    // console.log(filteredArr)
    let resArr = filteredArr.map(({symbol, priceChangePercent})=> [symbol, Number(priceChangePercent)]);
    resArr.sort((currPair, nextPair)=> {
        if (currPair[1] < nextPair[1]) return 1;
        if (currPair[1] == nextPair[1]) return 0;
        if (currPair[1] > nextPair[1]) return -1;
    });
    console.log(resArr);
});

