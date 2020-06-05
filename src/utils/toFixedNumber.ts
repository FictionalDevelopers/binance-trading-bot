import { pipe } from 'rxjs';

export const toFixedNumber = (
  input: number | string,
  decimalPoints = 2,
): number => pipe(Number, n => n.toFixed(decimalPoints), Number)(input);
