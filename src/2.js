const _ = require('lodash');
const arr = [6.103, 6.1, 6.105, 4.201, 6.301];
// => { '4': [4.2], '6': [6.1, 6.3] }
const value = 6.109;
const str = Number(value).toLocaleString();
// console.log(str.slice(0, str.length - 1));
// console.log(Number().valueOf.call(6.195));
console.log(_.groupBy(arr, Number().toLocaleString()));
