const getAverage = (numbers = []) =>
  numbers.reduce((sum, number) => Number(sum) + Number(number)) /
  numbers.length;

export default getAverage;
