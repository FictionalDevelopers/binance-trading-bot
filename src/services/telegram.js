import { env } from '../config';
import axios from 'axios';

console.log(env);

async function getUpdates() {
  return axios.get(`${env.TELEGRAM_API_URL}/getUpdates`);
}

async function sendMessage() {
  const message = {
    chat_id: 372621284,
    text: 'test',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Label 1',
            callback_data: 'Label 1 were pressed',
          },
        ],
        [
          {
            text: 'Label 2',
            callback_data: 'Label 2 were pressed',
          },
        ],
      ],
    },
  };
  return axios.post(`${env.TELEGRAM_API_URL}/sendMessage`, message);
}

(async function() {
  await sendMessage();
})();
