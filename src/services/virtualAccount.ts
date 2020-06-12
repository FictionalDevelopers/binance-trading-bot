import {
  service as virtualAccountService,
  VirtualAccount,
} from '../components/virtual-account';
import { getAccountId } from '../api/account';

type Action = 'SELL' | 'BUY';

const commissionRate = 0.001;

const createVirtualAccount = async (value: number): Promise<unknown> => {
  const account = await initBalance(value);
  console.log('account', account);
  return {};
};

export default createVirtualAccount;

async function initBalance(value: number): Promise<unknown> {
  const accountId = await getAccountId();
  return virtualAccountService.trackVirtualAccount({
    accountId,
    initialBalance: value,
    available: value,
  });
}

async function updateBalance(action: Action, price: number) {
  const accountId = await getAccountId();
  const { available } = await virtualAccountService.getVirtualAccount(
    accountId,
  );
}

function calculateBalance(
  action: Action,
  account: VirtualAccount,
  price: number,
  fraction = 100,
) {
  const { available, onOrder } = account;
  const operationValue = action === 'BUY' ? available : onOrder;
  const commission = getCommission(operationValue);
  return {
    available: available - operationValue,
    onOrder: Math.abs(operationValue / price),
  };
}

function getCommission(value: number): number {
  return Math.abs(value * commissionRate);
}
