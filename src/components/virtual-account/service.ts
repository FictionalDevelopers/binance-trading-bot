import VirtualAccountModel, { VirtualAccount } from './model';

export async function trackVirtualAccount(virtualAccount: {
  accountId: string;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}): Promise<VirtualAccount> {
  return VirtualAccountModel.findOneAndUpdate(
    {
      accountId: virtualAccount.accountId,
    },
    virtualAccount,
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
}

export async function getVirtualAccount(
  accountId: string,
): Promise<VirtualAccount> {
  return VirtualAccountModel.findOne({
    accountId,
  });
}
