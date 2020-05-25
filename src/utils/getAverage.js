const getAverage = (numbers = []) =>
    numbers.reduce((sum, number) => sum + number) / numbers.length;

export default getAverage;
