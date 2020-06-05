export function getPercentageDifference(first: number, second: number): number {
  return (Math.abs(first - second) / first) * 100;
}
