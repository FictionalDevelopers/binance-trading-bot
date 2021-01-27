import { pluck, bufferCount } from 'rxjs/operators';
import { format } from 'date-fns';
import { connect } from './db/connection';
import { RESOURCES } from './constants';
import { DATE_FORMAT } from './constants/date';
import { getTradeStream } from './api/trades.js';
import { sendToRecipients } from './services/telegram';
import getBalances from './api/balance';
import { getExchangeInfo } from './api/exchangeInfo';
import { marketSellAction, marketBuyAction, getOrdersList } from './api/order';
import { getEMASignal, runEMAInterval } from './components/ema-signals';
import { getDMISignal } from './components/dmi-signals';
import { getRSISignal } from './components/rsi-signals';
import {
  getStochRSISignal,
  runStochRsiInterval,
} from './components/stochRSI-signals';
import { getObvSignal, runObvInterval } from './components/obv-signals';
import { service as botStateService } from './components/botState';
import _head from 'lodash/head';
import { getForceIndexSignal, runEFIInterval } from './components/forceIndex';
import { getForceIndexStream } from './indicators/forceIndex';
import getAvarage from './utils/getAverage';
import { getStochRsiStream } from './indicators/stochRSI';
import { getTrixSignal, runTrixInterval } from './components/trix-signal';

(async function() {
  await connect();
  // await processSubscriptions();
  const revisionNumber = 'ffa2bef39307f7d13bf20d5b92ebaafe4115b081';
  const symbol = 'linkusdt';
  const cryptoCoin = symbol.toUpperCase().slice(0, -4);
  const { available: initialUSDTBalance } = await getBalances('USDT');
  const { available: initialCryptoCoinBalance } = await getBalances(cryptoCoin);
  const { stepSize } = await getExchangeInfo(symbol.toUpperCase(), 'LOT_SIZE');
  // const openOrders = await checkAllOpenOrders(symbol.toUpperCase());
  // const ordersList = await getOrdersList(symbol.toUpperCase());
  // const lastOrder = ordersList[ordersList.length - 1] || null;
  const workingDeposit = 400;
  // const symbol = process.argv[2];
  let botState;

  try {
    const response = await botStateService.getBotState();
    const initialState = JSON.parse(JSON.stringify(_head(response)));

    botState = {
      ...initialState,
      availableUSDT: initialUSDTBalance,
      availableCryptoCoin: initialCryptoCoinBalance,
      updateState: function(fieldName, value) {
        this[`${fieldName}`] = value;
      },
    };
  } catch (e) {
    await sendToRecipients(`ERROR
    ${JSON.stringify(e)};
  `);

    process.exit(1);
  }

  const indicatorsData = {
    trix: {
      trix5m: {
        av: null,
        prevAv: null,
        signal: null,
        value: null,
        prev: null,
      },
    },
    efi: {
      efi1h: {
        efiBuySignalCount: 0,
        efiSellSignalCount: 0,
        prevEfi: null,
        efi: null,
        signal: null,
        av: null,
        prevAv: null,
      },
      efi5m: {
        efiBuySignalCount: 0,
        efiSellSignalCount: 0,
        prevEfi: null,
        efi: null,
        signal: null,
        av: null,
        prevAv: null,
      },
      efi15m: {
        efiBuySignalCount: 0,
        efiSellSignalCount: 0,
        prevEfi: null,
        efi: null,
        signal: null,
        av: null,
        prevAv: null,
      },
      efi1m: {
        efiBuySignalCount: 0,
        efiSellSignalCount: 0,
        prevEfi: null,
        efi: null,
        signal: null,
        av: null,
        prevAv: null,
      },
    },

    obvBuySignalCount: 0,
    obvSellSignalCount: 0,
    prevObv: null,
    obv: null,
    obvSignal: null,
    priceGrowArea: false,
    stochRsi: {
      stoch1m: {
        BuySignalCount: 0,
        SellSignalCount: 0,
        prev: null,
        value: null,
        signal: null,
        av: null,
        prevAv: null,
      },
      stoch5m: {
        BuySignalCount: 0,
        SellSignalCount: 0,
        prev: null,
        value: null,
        signal: null,
        av: null,
        prevAv: null,
      },
      stoch15m: {
        BuySignalCount: 0,
        SellSignalCount: 0,
        prev: null,
        value: null,
        signal: null,
        av: null,
        prevAv: null,
      },

      stoch1h: null,
    },
    emaSignal: null,
    dmi5m: {
      prevDmi: null,
      dmiMdiSignal: 0,
      adxSignal: 0,
      mdiSignal: 0,
      adxBuySignalVolume: 0,
      adxSellSignalVolume: 0,
      willPriceGrow: false,
      trend: null,
      adx: null,
    },
    dmi15m: {
      prevDmi: null,
      dmiMdiSignal: 0,
      adxSignal: 0,
      mdiSignal: 0,
      adxBuySignalVolume: 0,
      adxSellSignalVolume: 0,
      willPriceGrow: false,
      trend: null,
      adx: null,
      signal: null,
    },
    dmi1h: {
      prevDmi: null,
      dmiMdiSignal: 0,
      adxSignal: 0,
      mdiSignal: 0,
      adxBuySignalVolume: 0,
      adxSellSignalVolume: 0,
      willPriceGrow: false,
      trend: null,
      adx: null,
    },
    dmi1m: {
      signal: null,
      prevDmi: null,
      dmiMdiSignal: 0,
      adxSignal: 0,
      mdiSignal: 0,
      adxBuySignalVolume: 0,
      adxSellSignalVolume: 0,
      willPriceGrow: false,
      trend: null,
      adx: null,
    },
    rsi1m: {
      rsiValue: null,
      prevRsi: null,
      sellNow: false,
      buyNow: false,
    },
    rsi5m: {
      rsiValue: null,
      prevRsi: null,
      sellNow: false,
      buyNow: false,
    },
    rsi15m: {
      rsiValue: null,
      prevRsi: null,
      sellNow: false,
      buyNow: false,
    },
    slow1mEMA: 0,
    middle1mEMA: 0,
    fast1mEMA: 0,
    slow5mEMA: 0,
    middle5mEMA: 0,
    fast5mEMA: 0,
    slow1hEMA: 0,
    middle1hEMA: 0,
    fast1hEMA: 0,
    slow15mEMA: 0,
    middle15mEMA: 0,
    fast15mEMA: 0,
    summaryEMABuySignal: false,
    rsiRebuy: {
      value: true,
    },
  };

  // runEMAInterval(indicatorsData, botState);
  runObvInterval(indicatorsData);

  // const rsiRebuyChecker = setInterval(() => {
  //   if (
  //     indicatorsData.rsi1m.rsiValue !== null &&
  //     indicatorsData.rsi5m.rsiValue !== null &&
  //     indicatorsData.rsi5m.rsiValue <= 33
  //   )
  //     indicatorsData.rsiRebuy.value = true;
  //   if (
  //     indicatorsData.rsi1m.rsiValue >= 41 &&
  //     indicatorsData.rsi5m.rsiValue >= 41
  //   )
  //     if (botState.status) indicatorsData.rsiRebuy.value = false;
  // }, 1000);

  const trader = async pricesStream => {
    const { tradeAmountPercent } = botState;
    if (botState.status === 'isPending') return;
    botState.updateState(
      'currentPrice',
      Number(pricesStream[pricesStream.length - 1]),
    );
    const expectedProfitPercent = botState.buyPrice
      ? botState.currentPrice / botState.buyPrice > 1
        ? Number((botState.currentPrice / botState.buyPrice) * 100 - 100)
        : Number(-1 * (100 - (botState.currentPrice / botState.buyPrice) * 100))
      : 0;

    const conditions = {
      upTrend: {
        buy:
          botState.status === 'buy' &&
          Number(
            (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
          ) >= 0.1 &&
          indicatorsData.rsi5m.rsiValue !== null &&
          indicatorsData.rsi5m.rsiValue <= 67 &&
          // indicatorsData.rsi5m.rsiValue >= 61 &&
          indicatorsData.rsi1m.rsiValue !== null &&
          indicatorsData.rsi1m.rsiValue < 68,
        sell: {
          takeProfit: null,
          stopLoss:
            botState.status === 'sell' &&
            botState.buyReason === 'upTrend' &&
            Number(
              (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
                100,
            ) >= 0.05,
        },
      },
      downTrend: {
        buy:
          botState.status === 'buy' &&
          indicatorsData.rsi1m.rsiValue >= 62 &&
          Number(
            (indicatorsData.fast1mEMA / indicatorsData.middle1mEMA) * 100 - 100,
          ) >= 0.1,

        // indicatorsData.rsiRebuy.value &&
        // indicatorsData.middle1mEMA < indicatorsData.slow1mEMA &&
        // indicatorsData.rsi1m.rsiValue !== null &&
        // indicatorsData.rsi1m.rsiValue >= 41 &&
        // indicatorsData.rsi1m.rsiValue <= 40 &&
        // indicatorsData.rsi5m.rsiValue !== null &&
        // indicatorsData.rsi5m.rsiValue >= 41 &&
        // indicatorsData.rsi5m.rsiValue <= 45,

        sell: {
          takeProfit:
            botState.status === 'sell' &&
            botState.buyReason === 'downTrend' &&
            expectedProfitPercent >= 0.7,

          // // indicatorsData.rsi1m.rsiValue >= 59 &&
          // ((Number(
          //   (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
          //     100,
          // ) >= 0.1 &&
          //   expectedProfitPercent > 0.5) ||
          //   expectedProfitPercent >= 0.7),
          stopLoss:
            botState.status === 'sell' &&
            botState.buyReason === 'downTrend' &&
            Number(
              (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
                100,
            ) >= 0.1,
          // indicatorsData.rsi1m.rsiValue !== null &&
          // indicatorsData.rsi1m.rsiValue < 39 &&
          // indicatorsData.rsi5m.rsiValue !== null &&
          // indicatorsData.rsi5m.rsiValue < 39,
        },
      },
      upFlat: {
        buy:
          botState.status === 'buy' &&
          indicatorsData.fast5mEMA > indicatorsData.middle5mEMA &&
          // indicatorsData.fast1mEMA > indicatorsData.middle1mEMA &&
          // indicatorsData.emaSignal === 'buy' &&
          indicatorsData.rsi1m.rsiValue <= 50 &&
          indicatorsData.rsi1m.rsiValue !== null,
        sell: {
          takeProfit:
            botState.status === 'sell' &&
            botState.buyReason === 'upFlat' &&
            indicatorsData.rsi1m.rsiValue >= 69 &&
            expectedProfitPercent > 0,
          stopLoss:
            botState.status === 'sell' &&
            botState.buyReason === 'upFlat' &&
            Number(
              (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
                100,
            ) >= 0.05,
          // (Number(
          //   (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
          //     100,
          // ) >= 0.1 ||
        },
      },
      downFlat: {
        buy:
          botState.status === 'buy' &&
          // indicatorsData.fast5mEMA < indicatorsData.middle5mEMA &&
          // indicatorsData.emaSignal === 'buy' &&
          indicatorsData.rsi1m.rsiValue < 35 &&
          indicatorsData.rsi1m.rsiValue !== null &&
          indicatorsData.rsi5m.rsiValue >= 40,
        sell: {
          takeProfit:
            botState.status === 'sell' &&
            botState.buyReason === 'downFlat' &&
            indicatorsData.rsi1m.rsiValue >= 59 &&
            expectedProfitPercent > 0,
          stopLoss:
            botState.status === 'sell' &&
            botState.buyReason === 'downFlat' &&
            indicatorsData.rsi5m.rsiValue !== null &&
            indicatorsData.rsi5m.rsiValue < 39,
        },
      },
      stochRsiStrategy: {
        buy:
          botState.status === 'buy' &&
          indicatorsData.dmi5m.signal === 'BUY' &&
          indicatorsData.dmi5m.willPriceGrow,
        // Number(
        //   (indicatorsData.fast1mEMA / indicatorsData.middle1mEMA) * 100 - 100,
        // ) >= 0.1 &&
        // indicatorsData.trix.trix5m.signal === 'buy',
        // indicatorsData.rsi1m.rsiValue !== null &&
        // indicatorsData.rsi1m.rsiValue < 67 &&
        // indicatorsData.rsi1m.rsiValue > 50 &&
        // indicatorsData.rsi5m.rsiValue !== null &&
        // indicatorsData.rsi5m.rsiValue < 68 &&
        // indicatorsData.efi1h.efiSignal === 'buy' &&
        // ((indicatorsData.efi5m.efi > 0 &&
        // indicatorsData.stochRsi.stoch5m.signal === 'buy' &&
        // indicatorsData.stochRsi.stoch1m.signal === 'buy',
        // indicatorsData.efi.efi15m.efi > 0 &&
        //   indicatorsData.stochRsiSignal.stoch1m === 'buy' &&
        //   indicatorsData.dmi5m.adx > 20) ||
        //   (indicatorsData.efi1m.efi > 0 &&
        // indicatorsData.efi.efi5m.efi > 0,
        //     indicatorsData.dmi1m.adx > 20 &&
        //     indicatorsData.stochRsiSignal.stoch1m === 'buy')),
        // indicatorsData.obvSignal === 'buy' &&
        // indicatorsData.rsi5m.rsiValue >= 41 &&
        // indicatorsData.rsi15m.rsiValue >= 41 &&
        // indicatorsData.stochRsiSignal.stoch5m === 'buy' &&
        // indicatorsData.stochRsiSignal.stoch1m === 'buy',
        // indicatorsData.efi.efi > 0,
        sell: {
          takeProfit: null,
          // botState.status === 'sell' &&
          // botState.buyReason === 'stochRsi' &&
          // indicatorsData.stochRsiSignal.stoch5m === 'sell' ||
          // expectedProfitPercent <= -1,

          stopLoss:
            botState.status === 'sell' &&
            !indicatorsData.dmi5m.willPriceGrow &&
            indicatorsData.dmi5m.signal === 'SELL',

          // botState.buyReason === 'stochRsi' &&
          // ((indicatorsData.rsi1m.rsiValue !== null &&
          //   indicatorsData.rsi1m.rsiValue < 49 &&
          //   expectedProfitPercent < 0) ||
          //   indicatorsData.stochRsi.stoch5m.signal === 'sell'),

          // indicatorsData.trix.trix5m.signal === 'sell',
          // ((indicatorsData.stochRsi.stoch5m.signal === 'sell' &&
          //   indicatorsData.stochRsi.stoch15m.signal === 'sell') ||
          //   (Number(
          //     (indicatorsData.middle1mEMA / indicatorsData.fast1mEMA) * 100 -
          //       100,
          //   ) >= 0.1 &&
          //     expectedProfitPercent < 0)),
          // indicatorsData.efi1h.efiSignal === 'sell',

          // indicatorsData.obvSignal === 'sell',
          // indicatorsData.stochRsiSignal.stoch15m === 'sell',
          //   expectedProfitPercent >= 1),

          // ((indicatorsData.stochRsiSignal.stoch5m === 'sell' &&
          //   !indicatorsData.priceGrowArea) ||
          //   (indicatorsData.priceGrowArea &&
          //     Number(
          //       (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) *
          //         100 -
          //         100,
          //     ) >= 0.5)),

          // (indicatorsData.rsi5m.rsiValue !== null &&
          //   indicatorsData.rsi5m.rsiValue < 39)),)
        },
      },
      trendsCatcher: {
        buy:
          botState.status === 'buy' && indicatorsData.dmi15m.signal === 'BUY',
        // indicatorsData.dmi1h.willPriceGrow &&
        // Number(
        //   (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
        // ) >= 0.1,
        sell: {
          takeProfit:
            expectedProfitPercent >= 1 &&
            botState.buyReason === 'trendsCatcher',
          stopLoss:
            botState.status === 'sell' &&
            indicatorsData.dmi15m.signal === 'SELL' &&
            botState.buyReason === 'trendsCatcher',
          // (Number(
          //   (indicatorsData.middle5mEMA / indicatorsData.fast5mEMA) * 100 -
          //     100,
          // ) >= 0.5 ||
          //   !indicatorsData.dmi1h.willPriceGrow),
        },
      },
    };

    /** ******************************************BUY ACTIONS********************************************************/

    /** *********************UP TREND***********************/
    if (botState.strategies.upTrend.enabled) {
      if (conditions.upTrend.buy) {
        await marketBuyAction(
          false,
          symbol,
          botState,
          cryptoCoin,
          pricesStream,
          stepSize,
          'TRENDS CATCHER',
          workingDeposit,
          'RESISTANCE LEVEL',
        );
        botState.buyReason = 'upTrend';
        return;
      }
    }

    /** *********************DOWN TREND***********************/

    if (botState.strategies.downTrend.enabled) {
      if (conditions.downTrend.buy) {
        await marketBuyAction(
          false,
          symbol,
          botState,
          cryptoCoin,
          pricesStream,
          stepSize,
          'WAVES CATCHER',
          workingDeposit,
          'DOWN TREND CORRECTION LEVEL',
        );
        botState.buyReason = 'downTrend';
        indicatorsData.rsiRebuy.value = false;
        return;
      }
    }

    /** *********************UP FLAT***********************/

    if (botState.strategies.upFlat.enabled) {
      if (conditions.upFlat.buy) {
        await marketBuyAction(
          false,
          symbol,
          botState,
          cryptoCoin,
          pricesStream,
          stepSize,
          'WAVES CATCHER',
          workingDeposit,
          'UP FLAT ',
        );
        botState.buyReason = 'upFlat';
        return;
      }
    }

    /** *********************DOWN FLAT***********************/

    if (botState.strategies.downFlat.enabled) {
      if (conditions.downFlat.buy) {
        await marketBuyAction(
          false,
          symbol,
          botState,
          cryptoCoin,
          pricesStream,
          stepSize,
          'WAVES CATCHER',
          workingDeposit,
          'DOWN FLAT',
        );
        botState.buyReason = 'downFlat';
        return;
      }
    }

    /** *********************StochRSI Strategy***********************/

    if (botState.strategies.stochRsi.enabled) {
      if (conditions.stochRsiStrategy.buy) {
        await marketBuyAction(
          false,
          symbol,
          botState,
          cryptoCoin,
          pricesStream,
          stepSize,
          'STOCH RSI',
          workingDeposit,
          'STOCH RSI SIGNAL',
        );
        botState.buyReason = 'stochRsi';
        indicatorsData.obvBuySignalCount = 0;
        return;
      }
    }

    /** ******************** TRENDS CATHCER ***********************/

    if (botState.strategies.trendsCatcher.enabled) {
      if (conditions.trendsCatcher.buy) {
        await marketBuyAction(
          false,
          symbol,
          botState,
          cryptoCoin,
          pricesStream,
          stepSize,
          'TRENDS CATCHER',
          workingDeposit,
          'ADX SIGNAL',
        );
        botState.buyReason = 'trendsCatcher';
        return;
      }
    }

    /** *****************************************SELL ACTIONS********************************************************/

    /** *********************UP TREND***********************/

    if (conditions.upTrend.sell.stopLoss) {
      await marketSellAction(
        'upTrend',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'STOP LOSS OR TAKE PROFIT',
      );
      indicatorsData.rsiRebuy.value = true;
      return;
    }

    /** *********************DOWN TREND***********************/

    if (conditions.downTrend.sell.takeProfit) {
      await marketSellAction(
        'downTrend',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'DOWNTREND CORRECTION TAKE PROFIT',
      );
      indicatorsData.rsiRebuy.value = false;
      return;
    }

    if (conditions.downTrend.sell.stopLoss) {
      await marketSellAction(
        'downTrend',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'DOWNTREND CORRECTION STOP LOSS',
      );
      indicatorsData.rsiRebuy.value = true;
      return;
    }

    /** *********************UP FLAT***********************/

    if (conditions.upFlat.sell.takeProfit) {
      if (
        false
        // Number(
        //   (indicatorsData.fast5mEMA / indicatorsData.middle5mEMA) * 100 - 100,
        // ) >= 0.1 &&
        // Number(
        //   (indicatorsData.fast15mEMA / indicatorsData.middle15mEMA) * 100 - 100,
        // ) >= 0.1
      ) {
        botState.buyReason = 'upTrend';
        await sendToRecipients(` INFO
                     Bot was switched to the TRENDS CATCHER strategy!
        `);
        indicatorsData.rsiRebuy.value = true;
        return;
      } else {
        await marketSellAction(
          'upFlat',
          false,
          symbol,
          botState,
          cryptoCoin,
          expectedProfitPercent,
          pricesStream,
          stepSize,
          initialUSDTBalance,
          'UP FLAT TAKE PROFIT',
        );
        indicatorsData.rsiRebuy.value = true;
        return;
      }
    }
    //
    if (conditions.upFlat.sell.stopLoss) {
      await marketSellAction(
        'upFlat',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'UP FLAT STOP LOSS',
      );
      indicatorsData.rsiRebuy.value = true;
      return;
    }

    /** *********************DOWN FLAT***********************/

    if (conditions.downFlat.sell.takeProfit) {
      await marketSellAction(
        'downFlat',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'DOWN FLAT TAKE PROFIT',
      );
      indicatorsData.rsiRebuy.value = true;
      return;
    }

    if (conditions.downFlat.sell.stopLoss) {
      await marketSellAction(
        'downFlat',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'DOWN FLAT LEVEL STOP LOSS',
      );
      indicatorsData.rsiRebuy.value = true;
      return;
    }

    /** *********************STOCH RSI ***********************/

    if (
      conditions.stochRsiStrategy.sell.takeProfit &&
      !botState.strategies.stochRsi.stopLoss
    ) {
      await marketSellAction(
        'stochRsi',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'STOCH RSI TAKE PROFIT',
        true,
      );
      return;
    }

    if (conditions.stochRsiStrategy.sell.stopLoss) {
      await marketSellAction(
        'stochRsi',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'STOCH RSI STOP LOSS',
        false,
      );
      indicatorsData.obvSellSignalCount = 0;

      // indicatorsData.priceGrowArea = false;
      return;
    }

    /** *********************TRENDS CATCHER***********************/

    if (
      conditions.trendsCatcher.sell.takeProfit &&
      !botState.strategies.trendsCatcher.stopLoss
    ) {
      await marketSellAction(
        'trendsCatcher',
        false,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'TRENDS CATCHER TAKE PROFIT',
        true,
      );
      return;
    }

    if (conditions.trendsCatcher.sell.stopLoss) {
      await marketSellAction(
        'trendsCatcher',
        true,
        symbol,
        botState,
        cryptoCoin,
        expectedProfitPercent,
        pricesStream,
        stepSize,
        initialUSDTBalance,
        'STOP LOSS',
      );
      return;
    }

    botState.updateState('prevPrice', botState.currentPrice);
  };

  // getTrixSignal(symbol, '5m', indicatorsData.trix.trix5m);
  // getStochRSISignal(symbol, '5m', indicatorsData.stochRsi.stoch5m, 2.5, 2.5);
  // getStochRSISignal(symbol, '1m', indicatorsData.stochRsi.stoch1m, 2.5, 2.5);
  // getEMASignal(symbol, '1m', indicatorsData);
  // getRSISignal(symbol, '1m', indicatorsData.rsi1m);

  // getForceIndexSignal(symbol, '5m', 13, indicatorsData.efi.efi5m);
  // getForceIndexSignal(symbol, '15m', 13, indicatorsData.efi.efi15m);
  // getStochRSISignal(symbol, '1m', indicatorsData, 5, 5);
  // getDMISignal(symbol, '15m', indicatorsData.dmi15m);
  getDMISignal(symbol, '5m', indicatorsData.dmi5m);

  // getRSISignal(symbol, '1m', indicatorsData.rsi1m);
  // getEMASignal(symbol, '5m', indicatorsData);
  // getEMASignal(symbol, '15m', indicatorsData);
  // getEMASignal(symbol, '1m', indicatorsData);
  // getObvSignal(symbol, '1h', indicatorsData);
  // getForceIndexSignal(symbol, '1h', 13, indicatorsData.efi1h);
  // getForceIndexSignal(symbol, '5m', 13, indicatorsData.efi5m);
  // getForceIndexSignal(symbol, '1m', 13, indicatorsData.efi1m);

  if (botState.testMode) {
    await sendToRecipients(`INIT (TEST MODE)
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  Revision N: ${revisionNumber}
  Strategies: ${JSON.stringify(botState.strategies)}
  Status: ${botState.status.toUpperCase()}
  Symbol: ${symbol.toUpperCase()}
  `);
  } else {
    await sendToRecipients(`INIT
  Bot started working at: ${format(new Date(), DATE_FORMAT)}
  Revision N: ${revisionNumber}
  Strategies: ${JSON.stringify(botState.strategies)}
  Status: ${botState.status.toUpperCase()}
  Symbol: ${symbol.toUpperCase()}
  Initial USDT balance: ${initialUSDTBalance} USDT
  Initial ${cryptoCoin} balance: ${initialCryptoCoinBalance} ${cryptoCoin}
  `);
  }

  // runStochRsiInterval(indicatorsData.stochRsi.stoch5m);

  getTradeStream({
    symbol: symbol,
    resource: RESOURCES.TRADE,
  })
    .pipe(pluck('price'), bufferCount(1, 1))
    .subscribe(trader);

  // getForceIndexStream({
  //   symbol: symbol,
  //   interval: '5m',
  //   period: 13,
  // })
  //   .pipe(bufferCount(10, 10))
  //   .subscribe(data => {
  //     const currentAv = getAvarage(data);
  //     if (!indicatorsData.efi.efi5m.prevAv) {
  //       indicatorsData.efi.efi5m.prevAv = currentAv;
  //       return;
  //     }
  //     console.log(getAvarage(data));
  //     console.log('Av: ' + currentAv);
  //     console.log('Prev av: ' + indicatorsData.efi.efi5m.prevAv + '\n');
  //     indicatorsData.efi.efi5m.prevAv = currentAv;
  //   });

  // getStochRsiStream({
  //   symbol: symbol,
  //   interval: '5m',
  // })
  //   .pipe(bufferCount(10, 10))
  //   .subscribe(data => {
  //     indicatorsData.stochRsi.stoch5m.av = getAvarage(data);
  //     if (
  //       indicatorsData.stochRsi.stoch5m.av &&
  //       indicatorsData.stochRsi.stoch5m.prevAv
  //     ) {
  //       if (
  //         indicatorsData.stochRsi.stoch5m.av >
  //         indicatorsData.stochRsi.stoch5m.prevAv
  //       )
  //         indicatorsData.stochRsi.stoch5m.signal = 'buy';
  //       if (
  //         indicatorsData.stochRsi.stoch5m.av <
  //         indicatorsData.stochRsi.stoch5m.prevAv
  //       )
  //         indicatorsData.stochRsi.stoch5m.signal = 'sell';
  //     }
  //     console.log(getAvarage(data));
  //     console.log('Av: ' + indicatorsData.stochRsi.stoch5m.av);
  //     console.log('Prev av: ' + indicatorsData.stochRsi.stoch5m.prevAv + '\n');
  //   });
})();

process.on('unhandledRejection', async (reason: Error) => {
  console.error(reason);
  await sendToRecipients(`ERROR
    ${JSON.stringify(reason)};
  `);

  process.exit(1);
});
