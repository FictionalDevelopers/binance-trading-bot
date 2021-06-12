const determineDealType = (indicatorsData, sens) => {
  if (
    indicatorsData.obv15m.buySignalCount >= 4 &&
    indicatorsData.obv5m.buySignalCount >= 4 &&
    indicatorsData.obv1m.buySignalCount >= 4
  )
    return 'long';
  else if (
    indicatorsData.obv15m.sellSignalCount >= 4 &&
    indicatorsData.obv5m.sellSignalCount >= 4 &&
    indicatorsData.obv1m.sellSignalCount >= 4
  )
    return 'short';
  return 'undetermined';
};

export default determineDealType;
