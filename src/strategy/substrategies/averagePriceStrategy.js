import fs from "fs";
import {format} from "date-fns";


let canISell = false;
let buysCounter = 0;
let totalProfit = 0;
let prevAvPrice = 0;
let buyPrice = null;
let vertVolumeSignal = false;
let dmiSignal = null;
let prevVolume = null;
let prevDmi = null;
let complexSignal = null;


const tradeBy20Prices = trade => {
    const pricesArrLength = trade.length;
    const currentAvPrice = trade.reduce(sumPricesReducer, 0) / pricesArrLength;
    if (!prevAvPrice) {
        prevAvPrice = currentAvPrice;
        console.log('No prev price found');
        return;
    }
    if (currentAvPrice - prevAvPrice >= 3 && !canISell && vertVolumeSignal) {
        try {
            buyPrice = Number(trade[trade.length - 1]);
            fs.appendFile(
                'message.txt',
                `Buy: ${buyPrice}; Date:${format(
                    new Date(),
                    'MMMM Do yyyy, h:mm:ss a',
                )}\n`,
                err => {
                    if (err) throw err;
                    console.log('Bought by ' + buyPrice);
                },
            );
            canISell = true;
            vertVolumeSignal = false;
            buysCounter++;
        } catch (e) {
            console.error(e);
        }
    }
    if (
        prevAvPrice - currentAvPrice >= 3 &&
        canISell &&
        buysCounter !== 0 &&
        vertVolumeSignal
    ) {
        try {
            const profit =
                trade[trade.length - 1] / buyPrice > 1
                    ? Number((trade[trade.length - 1] / buyPrice) * 100 - 100)
                    : Number(-1 * (100 - (trade[trade.length - 1] / buyPrice) * 100));
            totalProfit += profit;
            fs.appendFile(
                'message.txt',
                `Sell: ${trade[trade.length - 1]}; Date:${format(
                    new Date(),
                    'MMMM Do yyyy, h:mm:ss a',
                )}\nCurrent profit: ${profit}%\nTotal profit: ${totalProfit}%\n\n`,
                err => {
                    if (err) throw err;
                    console.log('Sold by ' + trade[trade.length - 1]);
                },
            );
            canISell = false;
            vertVolumeSignal = false;
        } catch (e) {
            console.error(e);
        }
    }
    prevAvPrice = currentAvPrice;
};
