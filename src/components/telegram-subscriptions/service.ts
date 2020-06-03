import TelegramSubscriptionModel, { TelegramSubscription } from './model';

export async function trackTelegramSubscription(telegramSubscription: {
  chatId: number;
  firstName: string;
  lastName: string;
  username: string;
  type: string;
  date: Date;
  subscribed: boolean;
}): Promise<TelegramSubscription> {
  return TelegramSubscriptionModel.findOneAndUpdate(
    {
      chatId: telegramSubscription.chatId,
    },
    telegramSubscription,
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
}

export async function getTelegramSubscriptions(): Promise<
  Array<TelegramSubscription>
> {
  return TelegramSubscriptionModel.find({
    subscribed: true,
  });
}

export async function unsubscribe(
  chatId: number,
): Promise<TelegramSubscription> {
  return TelegramSubscriptionModel.updateOne(
    {
      chatId,
    },
    {
      subscribed: false,
    },
  );
}
