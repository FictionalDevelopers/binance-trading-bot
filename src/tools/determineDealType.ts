const determineDealType = (indicatorsData, sens) => {
  if (
    indicatorsData.obv15m.buySignalCount >= 2 &&
    indicatorsData.obv5m.buySignalCount >= 2 &&
    indicatorsData.obv1m.buySignalCount >= 2
  )
    return 'long';
  else if (
    indicatorsData.obv15m.sellSignalCount >= 2 &&
    indicatorsData.obv5m.sellSignalCount >= 2 &&
    indicatorsData.obv1m.sellSignalCount >= 2
  )
    return 'short';
  return 'undetermined';
};

export default determineDealType;
