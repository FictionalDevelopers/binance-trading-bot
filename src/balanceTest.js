import getBalances from './api/balance.js';

async function getBalanceTest() {
  try {
    console.log(await getBalances('USDT'));
  } catch (e) {
    console.error(e);
  }
}

getBalanceTest();
