// BUY SELL WITH DMI + RSI

/*      botState.status === 'buy' &&
      rsi1mValue < 70 &&
      rsi1mValue !== null &&
      rsi1hValue < 68 &&
      rsi1hValue !== null &&
      adx1mSignal + mdi1mSignal === 2
*/

/*      botState.status === 'sell' &&
      ((mdi1hSignal === 1 &&
        ((rsi1mValue >= 65 && expectedProfit >= 0.7 && adx1mSignal === -1) ||
          (rsi1mValue < 50 && adx1mSignal === -1))) ||
        (mdi1hSignal === -1 &&
          ((rsi1mValue >= 70 && expectedProfit >= 0.3) ||
            (rsi1mValue < 50 && adx1mSignal === -1))))
*/
/************************************/

/*
botState.status === 'buy' &&
ema1mSignal === 1 &&
// rsi1mValue > 50 &&
// rsi1mValue !== null &&
// rsi1hValue < 68 &&
// rsi1hValue !== null &&
mdi1mSignal === 1 &&
adx1mSignal === 1 &&
mdi1hSignal === 1
*/

/*      botState.status === 'sell' && // rsi1mValue >= 60 &&
      ((adx1mSignal === -1 && expectedProfitPercent >= 0.5) ||
        // expectedProfitPercent <= -1 ||
        // mdi1mSignal === -1
        //   ||
        ema1mSignal === -1)
*/

/************************************/
