const determineDealType = (indicatorsData, sens) => {
  if (
    indicatorsData.haCandle.ha1mCandle.signal === 'buy' &&
    indicatorsData.haCandle.ha1mCandle.shadowSignal === 'buy'

    // indicatorsData.obv15m.buySignalCount >= 4 &&
    // indicatorsData.obv5m.buySignalCount >= 4 &&
    // indicatorsData.obv1m.buySignalCount >= 4
  )
    return 'long';
  else if (
    indicatorsData.haCandle.ha1mCandle.signal === 'sell' &&
    indicatorsData.haCandle.ha1mCandle.shadowSignal === 'sell'

    // indicatorsData.obv15m.sellSignalCount >= 4 &&
    // indicatorsData.obv5m.sellSignalCount >= 4 &&
    // indicatorsData.obv1m.sellSignalCount >= 4
  )
    return 'short';
  return 'undetermined';
};

export default determineDealType;
