import { format } from 'date-fns';
import { SYMBOLS } from '../constants';
import { DATE_FORMAT } from '../constants/date';
import { sendToRecipients } from '../services/telegram';
import { getRsiStream } from '../indicators/rsi';
import { getDmiStream } from '../indicators/dmi';

export const dmiTradeStrategy = symbol= > {
    let canISell = false;
    let totalProfit = 0;
// const prevAvPrice = 0;
    let buyPrice = null;
// const vertVolumeSignal = false;
// const dmiSignal = null;
// const prevVolume = null;
    let prevDmi = null;
// let complexSignal = null;
    let dmiMdiSignal = 0;
    let dmiAdxSignal = 0;
    let isAdxHigherThanMdi = false;
    let isMdiHigherThanAdx = false;
    let rsiSignal = false;
// let rebuy = false;
    let currentPrice = null;
// let profit = 0;

    const strategy = async pricesStream => {
        // const pricesArrLength = trade.length;
        currentPrice = Number(pricesStream[pricesStream.length - 1]);
        // const currentAvPrice = trade.reduce(sumPricesReducer, 0) / pricesArrLength;
        const profit = buyPrice
            ? currentPrice / buyPrice > 1
                ? Number((currentPrice / buyPrice) * 100 - 100)
                : Number(-1 * (100 - (currentPrice / buyPrice) * 100))
            : 0;
        // if (!prevAvPrice) {
        //   prevAvPrice = currentAvPrice;
        //   console.log('No prev price found');
        //   return;
        // }
        console.log(
            `DmiAdxSignal: ${dmiAdxSignal} DmiMdiSignal: ${dmiMdiSignal}  profit: ${profit} canISell: ${canISell} rsi: ${rsiSignal} isAdxHigherThanMdi: ${isAdxHigherThanMdi} `,
        );

        if (
            dmiAdxSignal + dmiMdiSignal === 2 &&
            // isAdxHigherThanMdi &&
            !canISell &&
            rsiSignal
            // currentAvPrice - prevAvPrice >= 3)
            // ||
            // rebuy
        ) {
            // tradeActions.buyByMarketPrice(null, '1m_dmi_trade_history.txt');
            canISell = true;
            buyPrice = currentPrice;
            // rebuy = false;
            // buysCounter++;
            await sendToRecipients(`BUY
             STRATEGY 1
             symbol: ${symbol.toUpperCase()}
             price: ${currentPrice}
             date: ${format(new Date(), DATE_FORMAT)}
             total profit: ${Number(totalProfit).toPrecision(4)}%

         `);
            console.log(`BUY
                     STRATEGY 1
                     symbol: ${symbol.toUpperCase()}
                     price: ${currentPrice}
                     date: ${format(new Date(), DATE_FORMAT)}
                     total profit: ${Number(totalProfit).toPrecision(4)}%
      `);
            return;
        }
        if (
            canISell &&
            (profit >= 2 || dmiAdxSignal === -1)
            // buysCounter !== 0 &&
            // (dmiAdxSignal === -1 && isAdxHigherThanMdi) ||
            // (dmiMdiSignal === -1 && isMdiHigherThanAdx) ||
        ) {
            // rsiSignal &&
            // profit >= 1
            // || (canISell && profit <= -0.1)
            // tradeActions.sellByMarketPrice(null, '1m_dmi_trade_history.txt');
            canISell = false;
            totalProfit += profit;
            buyPrice = null;
            await sendToRecipients(`SELL
             STRATEGY 1
             symbol: ${symbol.toUpperCase()}
             price: ${currentPrice}
             date: ${format(new Date(), DATE_FORMAT)}
             current profit: ${Number(profit).toPrecision(4)}%
             total profit: ${Number(totalProfit).toPrecision(4)}%
         `);
            console.log(`Sell
                    STRATEGY 1
                    symbol: ${symbol.toUpperCase()}
                    price: ${currentPrice}
                    date: ${format(new Date(), DATE_FORMAT)}
                    current profit: ${Number(profit).toPrecision(4)}%
                    total profit: ${Number(totalProfit).toPrecision(4)}%
      `);
        }
        // if (
        //   !rsiSignal &&
        //   canISell
        //   // currentAvPrice - prevAvPrice <= 3
        //   // profit <= -0.3
        // ) {
        //   try {
        //     totalProfit += profit;
        //     prevProfit = profit;
        //     fs.appendFile(
        //       '1m_dmi_trade_history.txt',
        //       `Sell: ${currentPrice}; Date:${format(
        //         new Date(),
        //         'MMMM dd yyyy, h:mm:ss a',
        //       )}\nCurrent profit: ${profit}%\nTotal profit: ${totalProfit}%\n\n`,
        //       err => {
        //         if (err) throw err;
        //         console.log('The sell price were appended to file!');
        //       },
        //     );
        //     canISell = false;
        //     // dmiAdxSignal = 0;
        //     // dmiMdiSignal = 0;
        //     // rsiSignal = false;
        //     // console.log('Current price: ' + currentPrice);
        //     // console.log('Prev price: ' + prevPrice);
        //   } catch (e) {
        //     console.error(e);
        //   }
        // }
        // prevAvPrice = currentAvPrice;
    };

// const candlePrices$ = getCandleStreamForInterval(
//   SYMBOLS.BTCUSDT,
//   interval,
// ).pipe(pluck('closePrice'), map(Number));

// const volumes$ = makeVerticalVolumeToolStream(
//   {
//     interval,
//     symbol,
//   },
//   {
//     minimalLatestCandleVolume: 30,
//     minimalPercentageIncrease: 20,
//   },
// );

    getRsiStream({
        symbol: symbol,
        period: 14,
        interval: '1d',
    }).subscribe(rsi => {
        // console.log(rsi);
        rsiSignal = rsi >= 55;
    });
//     .pipe(
//   transformRsiToSignal({
//     overbought: [50, 70],
//     oversold: [30, 50],
//   }),
// );

    getDmiStream({
        symbol: symbol,
        interval: '1m',
        period: 14,
    }).subscribe(dmi => {
        if (!prevDmi) {
            prevDmi = dmi;
            return;
        }
        // console.log(dmi);
        if (dmi.pdi > dmi.adx && prevDmi.pdi < prevDmi.adx) {
            dmiAdxSignal = 1;
            // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
            // console.log('Curr dmi:'+ JSON.stringify(dmi));
            // console.log('Pdi is upper than then ADX');
        }
        if (dmi.pdi < dmi.adx && prevDmi.pdi > prevDmi.adx) {
            dmiAdxSignal = -1;
            // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
            // console.log('Curr dmi:'+ JSON.stringify(dmi));
            // console.log('Pdi is lower than then ADX');
        }
        if (dmi.adx - dmi.mdi >= 2) {
            isAdxHigherThanMdi = true;
            // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
            // console.log('Curr dmi:'+ JSON.stringify(dmi));
            // console.log('Pdi is upper than then MDI');
        }
        if (dmi.adx - dmi.mdi < 2) {
            isAdxHigherThanMdi = false;
            // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
            // console.log('Curr dmi:'+ JSON.stringify(dmi));
            // console.log('Pdi is lower than then MDI');
        }
        if (dmi.mdi - dmi.adx >= 2) {
            isMdiHigherThanAdx = true;
            // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
            // console.log('Curr dmi:'+ JSON.stringify(dmi));
            // console.log('Pdi is upper than then MDI');
        }
        if (dmi.mdi - dmi.adx < 2) {
            isMdiHigherThanAdx = false;
            // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
            // console.log('Curr dmi:'+ JSON.stringify(dmi));
            // console.log('Pdi is lower than then MDI');
        }
        // console.log(dmi)
        if (dmi.pdi > dmi.mdi && prevDmi.pdi < prevDmi.mdi) {
            dmiMdiSignal = 1;
            // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
            // console.log('Curr dmi:'+ JSON.stringify(dmi));
            // console.log('Pdi is upper than then ADX');
        }
        if (dmi.pdi < dmi.mdi && prevDmi.pdi > prevDmi.mdi) {
            dmiMdiSignal = -1;
            // console.log('Prev dmi:'+ JSON.stringify(prevDmi));
            // console.log('Curr dmi:'+ JSON.stringify(dmi));
            // console.log('Pdi is upper than then ADX');
        }

        prevDmi = dmi;
    });

// const strategy$ = makeStrategy({
//   buyTools: [volumes$],
//   sellTools: [rsiSignals$],
// });

// combineLatest(strategy$, candlePrices$).subscribe(
//   async ([strategySignalDetails, price]) => {
//     const date = format(new Date(), DATE_FORMAT);
//
//     if (!hasBought && strategySignalDetails.action === BUY) {
//       await sendToRecipients(`BUY
//         price: ${price}
//         date: ${date}
//         signals: ${JSON.stringify(strategySignalDetails.signals)}
//       `);
//
//       hasBought = true;
//     }
//
//     if (hasBought && strategySignalDetails.action === SELL) {
//       await sendToRecipients(`SELL
//         price: ${price}
//         date: ${date}
//         current profit:
//         total profit:
//       `);
//
//       hasBought = false;
//     }
//   },
// );


}