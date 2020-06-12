import * as crypto from 'crypto';
import { binance } from './binance';

export async function getAccountId(): Promise<string> {
  const key = await binance.getOption('APIKEY');
  return crypto
    .createHash('md5')
    .update(key)
    .digest('hex');
}
