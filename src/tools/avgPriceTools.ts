import getAvarage from '../utils/getAverage';
import { getTradeStream } from '../api/trades';
import { bufferCount, pluck } from 'rxjs/operators';

export const calculateAvgDealPriceChange = (botState, indicatorsData) => {
  if (botState.status === 'sell') {
    botState.dealPricesArr.push(botState.currentPrice);
    botState.avgDealPrice = getAvarage(botState.dealPricesArr);
    const avgPriceProfit = botState.avgDealPrice
      ? botState.avgDealPrice / botState.buyPrice > 1
        ? Number((botState.avgDealPrice / botState.buyPrice) * 100 - 100)
        : Number(-1 * (100 - (botState.avgDealPrice / botState.buyPrice) * 100))
      : 0;
    // indicatorsData.avgPriceDiff =
    //   (botState.maxAvailableProfit / avgPriceProfit) * 100 - 100;

    if (!botState.prevAvgDealPrice) {
      botState.prevAvgDealPrice = botState.avgDealPrice;
    } else {
      indicatorsData.avgDealPriceDiff =
        (botState.avgDealPrice / botState.prevAvgDealPrice) * 100 - 100;
      botState.prevAvgDealPrice = botState.avgDealPrice;
    }
    if (indicatorsData.avgDealPriceDiff > 0) {
      indicatorsData.avgDealPriceUpSignalCount++;
      indicatorsData.avgDealPriceDownSignalCount = 0;
    } else if (indicatorsData.avgDealPriceDiff < 0) {
      indicatorsData.avgDealPriceDownSignalCount++;
      indicatorsData.avgDealPriceUpSignalCount = 0;
    } else if (indicatorsData.avgDealPriceDiff === 0) {
      indicatorsData.avgDealPriceDownSignalCount = 0;
      indicatorsData.avgDealPriceUpSignalCount = 0;
    }
    if (indicatorsData.avgDealPriceUpSignalCount >= 3)
      indicatorsData.avgDealPriceSignal = 'buy';
    else if (indicatorsData.avgDealPriceDownSignalCount >= 3)
      indicatorsData.avgDealPriceSignal = 'sell';
  }
};

export const calculateAvgPriceChange = (
  symbol,
  resourse,
  bufferCountSize,
  botState,
  indicatorsData,
) => {
  getTradeStream({
    symbol: symbol,
    resource: resourse,
  })
    .pipe(pluck('price'), bufferCount(bufferCountSize, bufferCountSize))
    .subscribe(prices => {
      indicatorsData.avgPrice = getAvarage(prices);
      // const avgPriceProfit = botState.avgPrice
      //   ? botState.avgPrice / botState.buyPrice > 1
      //     ? Number((botState.avgPrice / botState.buyPrice) * 100 - 100)
      //     : Number(-1 * (100 - (botState.avgPrice / botState.buyPrice) * 100))
      //   : 0;
      // indicatorsData.avgPriceDiffPerTimes =
      //   (botState.maxAvailableProfit / avgPriceProfit) * 100 - 100;

      if (!indicatorsData.prevAvgPrice) {
        indicatorsData.prevAvgPrice = indicatorsData.avgPrice;
      } else {
        indicatorsData.avgPriceDiff =
          (indicatorsData.avgPrice / indicatorsData.prevAvgPrice) * 100 - 100;
        indicatorsData.prevAvgPrice = indicatorsData.avgPrice;
      }
      if (indicatorsData.avgPriceDiff > 0) {
        indicatorsData.avgPriceUpSignalCount++;
        indicatorsData.avgPriceDownSignalCount = 0;
      } else if (indicatorsData.avgPriceDiff < 0) {
        indicatorsData.avgPriceDownSignalCount++;
        indicatorsData.avgPriceUpSignalCount = 0;
      } else if (indicatorsData.avgPriceDiff === 0) {
        indicatorsData.avgPriceDownSignalCount = 0;
        indicatorsData.avgPriceUpSignalCount = 0;
      }
      if (indicatorsData.avgPriceUpSignalCount >= 1)
        indicatorsData.avgPriceSignal = 'buy';
      else if (indicatorsData.avgPriceDownSignalCount >= 1)
        indicatorsData.avgPriceSignal = 'sell';
    });
};
