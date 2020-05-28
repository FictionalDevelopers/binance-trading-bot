import sum from './sum';

const getAverage = (numbers = []) => sum(numbers) / numbers.length;

export default getAverage;
