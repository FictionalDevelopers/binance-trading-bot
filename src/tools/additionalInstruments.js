let prev1sPrice = null;
const prices = [];
const intervalPriceDiff = [];

const promisifiedIntervalPriceDiffCallback = (intervalPriceDiff, interval) =>
  new Promise(resolve => {
    let result;
    setInterval(() => {
      if (
        intervalPriceDiff[4] > intervalPriceDiff[3] &&
        intervalPriceDiff[3] > intervalPriceDiff[2] &&
        intervalPriceDiff[2] > intervalPriceDiff[1] &&
        intervalPriceDiff[1] > intervalPriceDiff[0]
      )
        console.log('Price Up');
      intervalPriceDiff.length = 0;
      result = intervalPriceDiff.every(elem => elem < 0);
      return resolve(result);
    }, interval);
  });

export const getIntervalPriceDiff = async interval => {
  const result = await promisifiedIntervalPriceDiffCallback(
    intervalPriceDiff,
    interval,
  );
  return result;
};

export const sumPricesReducer = (accumulator, currentValue) =>
  accumulator + Number(currentValue);

const promisifiedOneSecondPriceDiffCallback = () =>
  new Promise(resolve => {
    let priceDiff;
    setInterval(() => {
      const current1sPrice = prices[prices.length - 1];
      if (!prev1sPrice) {
        prev1sPrice = current1sPrice;
        priceDiff = Number(0).toFixed(7);
        intervalPriceDiff.push(priceDiff);
        return;
      }
      priceDiff = current1sPrice
        ? current1sPrice / prev1sPrice > 1
          ? Number((current1sPrice / prev1sPrice) * 100 - 100)
          : Number(-1 * (100 - (current1sPrice / prev1sPrice) * 100))
        : null;

      prev1sPrice = current1sPrice;
      prices.length = 0;
      console.log(Number(priceDiff).toFixed(7) + '%; ');
      intervalPriceDiff.push(priceDiff);
      return resolve(priceDiff);
    }, 1000);
  });

export const getOneSecondPriceDiff = async () => {
  const oneSecondPriceDiff = await promisifiedOneSecondPriceDiffCallback();
  return oneSecondPriceDiff;
};
