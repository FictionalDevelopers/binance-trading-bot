import { combineLatest } from 'rxjs';
import { map, pluck } from 'rxjs/operators';
import { format } from 'date-fns';

import { connect } from './db/connection';
import { SYMBOLS } from './constants';
import { DATE_FORMAT } from './constants/date';
import { getCandleStreamForInterval } from './api/candles';
import { transformRsiToSignal } from './tools/rsi-tool';
import { makeVerticalVolumeToolStream } from './tools/vertical-volume-tool';
import { makeStrategy } from './strategies/make-strategy';
import { BUY, SELL } from './tools/signals';

import { processSubscriptions, sendToRecipients } from './services/telegram';
import { getRsiStream } from './indicators/rsi';
import { getDmiStream } from './indicators/dmi';
import { getEmaStream } from './indicators/ema';

(async function() {
  // await connect();
  // await processSubscriptions();

  const interval = '1m';
  const symbol = 'adausdt';
  let slow1mEMA = 0;
  let middle1mEMA = 0;
  let fast1mEMA = 0;
  let ema1mSignal = null;

  // const candlePrices$ = getCandleStreamForInterval(
  //   SYMBOLS.BTCUSDT,
  //   interval,
  // ).pipe(pluck('closePrice'), map(Number));
  //
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

  const rsiSignals$ = getRsiStream({
    symbol: SYMBOLS.BTCUSDT,
    period: 14,
    interval: '1m',
  }).pipe(
    transformRsiToSignal({
      overbought: [50, 70],
      oversold: [30, 50],
    }),
  );

  // getDmiStream({
  //   symbol: SYMBOLS.BTCUSDT,
  //   interval: '1m',
  //   period: 14,
  // }).subscribe(data => console.log('data', data));

  getEmaStream({
    symbol: 'adausdt',
    interval: '1m',
    period: 7,
  }).subscribe(data => {
    fast1mEMA = data;
  });
  getEmaStream({
    symbol: 'adausdt',
    interval: '1m',
    period: 25,
  }).subscribe(data => {
    middle1mEMA = data;
  });
  getEmaStream({
    symbol: 'adausdt',
    interval: '1m',
    period: 99,
  }).subscribe(data => {
    if (!slow1mEMA) {
      slow1mEMA = data;
      return;
    }
    slow1mEMA = data;
    if (fast1mEMA > middle1mEMA && middle1mEMA > slow1mEMA) ema1mSignal = 'buy';
    if (fast1mEMA < slow1mEMA) ema1mSignal = 'sell';
    console.log(slow1mEMA.toString());
    console.log(ema1mSignal);
  });

  // const strategy$ = makeStrategy({
  //   buyTools: [volumes$],
  //   sellTools: [rsiSignals$],
  // });
  //
  // let hasBought = false;
  //
  // await sendToRecipients(`INIT
  // symbol: ${symbol}
  // interval: ${interval}
  // period: 14,
  //
  // buy via VOLUME
  //   minimalLatestCandleVolume: 30
  //   minimalPercentageIncrease: 20
  // ---
  // sell via RSI
  //   overbought: [50, 70]
  //   oversold: [30, 50],
  // `);
  //
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
  //         signals: ${JSON.stringify(strategySignalDetails.signals)}
  //       `);
  //
  //       hasBought = false;
  //     }
  //   },
  // );
})();

process.on('unhandledRejection', async (reason: Error) => {
  await sendToRecipients(`ERROR
    ${reason.message}
    ${reason.stack}
  `);

  process.exit(1);
});
