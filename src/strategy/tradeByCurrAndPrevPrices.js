// import fs from 'fs';
// import { format } from 'date-fns';
//
// const tradeByCurrAndPrevPrices = trade => {
//   const currentPrice = Number(trade[1]);
//   const prevPrice = Number(trade[0]);
//   if (currentPrice - prevPrice >= 1 && !canISell) {
//     try {
//       fs.appendFile(
//         'message.txt',
//         `Buy: ${currentPrice}; Date:${format(
//           new Date(),
//           'MMMM Do yyyy, h:mm:ss a',
//         )}\n`,
//         err => {
//           if (err) throw err;
//           console.log('The buy price were appended to file!');
//         },
//       );
//       buyPrice = currentPrice;
//       canISell = true;
//       buysCounter++;
//     } catch (e) {
//       console.error(e);
//     } finally {
//     }
//   }
//   if (prevPrice - currentPrice >= 1 && canISell && buysCounter !== 0) {
//     try {
//       const profit =
//         currentPrice / buyPrice > 1
//           ? Number((currentPrice / buyPrice) * 100 - 100) - 0.2
//           : Number(-1 * (100 - (currentPrice / buyPrice) * 100)) - 0.2;
//       totalProfit += profit;
//       fs.appendFile(
//         'message.txt',
//         `Sell: ${currentPrice}; Date:${format(
//           new Date(),
//           'MMMM Do yyyy, h:mm:ss a',
//         )}\nCurrent profit: ${profit}%\nTotal profit: ${totalProfit}%\n\n`,
//         err => {
//           if (err) throw err;
//           console.log('The sell price were appended to file!');
//         },
//       );
//       canISell = false;
//       console.log('Current price: ' + currentPrice);
//       console.log('Prev price: ' + prevPrice);
//     } catch (e) {
//       console.error(e);
//     }
//   }
// };
