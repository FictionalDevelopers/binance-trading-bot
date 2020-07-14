import getBalances from './api/balance.js';

async function getBalanceTest() {
  try {
    console.log(await getBalances('ERD'));
  } catch (e) {
    console.error(e);
  }
}

getBalanceTest();
