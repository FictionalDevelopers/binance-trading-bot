export interface BuySignaller<T> {
  onBuySignall(handler: (signalDetails?: T) => void): void;
}

export interface StopBuySignaller<T> {
  onBuyStopSignall(handler: (signalDetails?: T) => void): void;
}

export interface SellSignaller<T> {
  onSellSignall(handler: (signalDetails?: T) => void): void;
}

export interface StopSellSignaller<T> {
  onSellStopSignall(handler: (signalDetails?: T) => void): void;
}
