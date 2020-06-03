import TelegramSubscriptionModel, { TelegramSubscription } from './model';

export async function trackTelegramSubscription(telegramSubscription: {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  type: string;
  date: Date;
}): Promise<TelegramSubscription> {
  return TelegramSubscriptionModel.findOneAndUpdate(
    {
      id: telegramSubscription.id,
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
