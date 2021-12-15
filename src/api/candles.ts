import { combineLatest, concat, from, Observable } from 'rxjs';
import { bufferCount, concatAll, filter, map, pluck } from 'rxjs/operators';

import { KEY_MAPPERS, RESOURCES } from '../constants';
import mapKeys from '../utils/mapKeys';
import {
  candlesticksMapper,
  CandleListItem,
} from '../utils/candlesticksMapper';
import { getTradeStream } from './trades';
import { binance } from './binance';
import { toFixedNumber } from '../utils/toFixedNumber';

export type RawCandleStreamItem = {
  startTime: number;
  closeTime: number;
  symbol: string;
  interval: string;
  firstTradeId: number;
  lastTradeId: number;
  openPrice: string;
  closePrice: string;
  highPrice: string;
  lowPrice: string;
  baseAssetVolume: string;
  numberOfTrades: number;
  isClosed: boolean;
  quoteAssetVolume: string;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
};

export const getCandleStreamForInterval = (
  symbol: string,
  interval: string,
): Observable<RawCandleStreamItem> =>
  getTradeStream({
    symbol,
    resource: `${RESOURCES.KLINE}_${interval}`,
  }).pipe(pluck('kline'), map(mapKeys(KEY_MAPPERS.KLINE)));

export type CandleListConfig = {
  symbol: string;
  interval: string;
};
type LastClosedCandleOptions = {
  limit?: number;
  endTime?: number;
};

export function getCandlesList(
  config: CandleListConfig,
  options?: LastClosedCandleOptions,
): Promise<CandleListItem[]> {
  return new Promise((resolve, reject) => {
    const { interval, symbol } = config;
    binance.candlesticks(
      symbol.toUpperCase(),
      interval,
      (error, ticks) => {
        if (error) {
          return reject(error);
        }

        return resolve(ticks);
      },
      options,
    );
  }).then(candlesticksMapper);
}

export async function getLastClosedCandles(
  config: CandleListConfig,
  options: { limit: number } = { limit: 150 },
): Promise<CandleListItem[]> {
  const { interval, symbol } = config;
  const { limit } = options;

  const candles = await getCandlesList(
    { interval, symbol },
    { limit: limit + 1 },
  );

  return candles.filter(candle => candle.closeTime < Date.now());
}

export type CandleDetails = {
  volume: number;
  openPrice: number;
  closePrice: number;
  highestPrice: number;
  lowestPrice: number;
  closeTime: number;
};

const mapCandleListItemToVolumeSignalDetails = (
  candle: Partial<CandleListItem>,
): CandleDetails => {
  return {
    volume: candle.volume,
    openPrice: toFixedNumber(candle.open, 2),
    closePrice: toFixedNumber(candle.close, 2),
    highestPrice: toFixedNumber(candle.high, 2),
    lowestPrice: toFixedNumber(candle.low, 2),
    closeTime: candle.closeTime,
  };
};

const mapCandleStreamItemToVolumeSignalDetails = (
  candle: Partial<RawCandleStreamItem>,
): CandleDetails => {
  return {
    volume: toFixedNumber(candle.baseAssetVolume, 2),
    openPrice: toFixedNumber(candle.openPrice, 2),
    closePrice: toFixedNumber(candle.closePrice, 2),
    highestPrice: toFixedNumber(candle.highPrice, 2),
    lowestPrice: toFixedNumber(candle.lowPrice, 2),
    closeTime: candle.closeTime,
  };
};

type PreviousClosedCandles = CandleDetails[];

export function getClosedLiveCandlesPairStream(
  config: CandleListConfig,
  options: {
    closedCandlesNumber: number;
  } = { closedCandlesNumber: 1 },
): Observable<[PreviousClosedCandles, CandleDetails]> {
  const { symbol, interval } = config;
  const { closedCandlesNumber } = options;

  const lastClosedCandles$ = from(
    getLastClosedCandles({ symbol, interval }, { limit: closedCandlesNumber }),
  ).pipe(concatAll(), map(mapCandleListItemToVolumeSignalDetails));

  const candles$ = getCandleStreamForInterval(symbol, interval);

  const liveCandles$ = candles$.pipe(
    filter(candle => !candle.isClosed),
    map(mapCandleStreamItemToVolumeSignalDetails),
  );

  const closedCandles$ = concat(
    lastClosedCandles$,
    candles$.pipe(
      filter(candle => candle.isClosed),
      map(mapCandleStreamItemToVolumeSignalDetails),
    ),
  ).pipe(bufferCount(closedCandlesNumber, 1));

  return combineLatest(closedCandles$, liveCandles$).pipe(
    filter(([closed, current]) => {
      const [, latest] = closed;

      return latest.closeTime !== current.closeTime;
    }),
  );
}
