const determineDealType = (indicatorsData, sens) => {
  if (
    indicatorsData.obv1h.buySignalCount > sens &&
    indicatorsData.obv4h.buySignalCount > sens
  )
    return 'long';
  else if (
    indicatorsData.obv1h.sellSignalCount > sens &&
    indicatorsData.obv4h.sellSignalCount > sens
  )
    return 'short';
  return 'undetermined';
};

export default determineDealType;
