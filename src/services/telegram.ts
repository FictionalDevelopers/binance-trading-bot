import axios from 'axios';
import _pipe from 'lodash/fp/pipe';
import _map from 'lodash/fp/map';
import _get from 'lodash/fp/get';
import _uniqBy from 'lodash/fp/uniqBy';
import _filter from 'lodash/fp/filter';
import { env } from '../config';
import mapKeys from '../utils/mapKeys';
import { KEY_MAPPERS } from '../constants';
import { service as telegramService } from '../components/telegram-subscriptions';

const isStartBot = ({ text }) => text === '/start';
const getChatInfo = ({ chat }) => ({ ...chat });

const getSubscribers = _pipe(
  _map(_get('message')),
  _filter(isStartBot),
  _map(getChatInfo),
  _uniqBy('id'),
  _map(mapKeys(KEY_MAPPERS.TELEGRAM_CHAT)),
);

export const sendToRecipients = async (
  text: string,
): Promise<Array<unknown>> => {
  const subscriptions = await telegramService.getTelegramSubscriptions();
  const messages = subscriptions.map(({ chatId }) => ({
    chat_id: chatId,
    text,
  }));

  return Promise.all(
    messages.map(
      message => axios.post(`${env.TELEGRAM_API_URL}/sendMessage`, message),
      // .catch(() => telegramService.unsubscribe(message.chat_id)),
    ),
  );
};

export const processSubscriptions = async (): Promise<Array<unknown>> => {
  const { data } = await getUpdates();
  const users = getSubscribers(data.result);
  return Promise.all(
    users.map(user => telegramService.trackTelegramSubscription(user)),
  );
};

async function getUpdates() {
  return axios.get(`${env.TELEGRAM_API_URL}/getUpdates`);
}
