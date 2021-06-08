const determineDealType = indicatorsData => {
  if (
    indicatorsData.obv1h.buySignalCount > 0 &&
    indicatorsData.obv4h.buySignalCount > 0
  )
    return 'long';
  else if (
    indicatorsData.obv1h.sellSignalCount > 0 &&
    indicatorsData.obv4h.sellSignalCount > 0
  )
    return 'short';
};

export default determineDealType;
