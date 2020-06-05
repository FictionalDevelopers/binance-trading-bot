import { toFixedNumber } from './toFixedNumber';

export const candlesticksMapper = (
  ticks: CandleTupleItem[],
): CandleListItem[] => {
  return ticks.map(tick => {
    const [
      time,
      open,
      high,
      low,
      close,
      volume,
      closeTime,
      assetVolume,
      trades,
      buyBaseVolume,
      buyAssetVolume,
      ignored,
    ] = tick;

    return {
      time,
      open,
      high,
      low,
      close,
      volume: toFixedNumber(volume, 2),
      closeTime,
      assetVolume,
      trades,
      buyBaseVolume,
      buyAssetVolume,
      ignored,
    };
  });
};

export type CandleListItem = {
  time: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: number;
  closeTime: number;
  assetVolume: string;
  trades: number;
  buyBaseVolume: string;
  buyAssetVolume: string;
  ignored: string;
};

type CandleTupleItem = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];
