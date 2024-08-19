export const sortLines = (vehicles) => {
  const numbers = [];
  const letters = [];

  vehicles.forEach((line) => {
    if (/^\d+$/.test(line.route)) {
      numbers.push(line);
    } else {
      letters.push(line);
    }
  });

  const sortedNumbers = numbers.sort(sortNumbers);
  const sortedLetters = letters.sort(sortLetters);

  const sortedLines = [...sortedNumbers, ...sortedLetters];

  return sortedLines;
};

const sortNumbers = (a, b) => {
  const aNumber = parseInt(a.route);
  const bNumber = parseInt(b.route);

  return aNumber - bNumber;
};

const sortLetters = (a, b) => {
  return a.route.localeCompare(b.route);
};

export const getTimeDifferenceInMinutes = async (time1, time2) => {
  // Konwersja czasów na obiekty Date
  const [hours1, minutes1] = await time1.split(":").map(Number);
  const [hours2, minutes2] = await time2.split(":").map(Number);

  // Tworzenie obiektów Date
  const date1 = new Date();
  date1.setHours(hours1, minutes1, 0);

  const date2 = new Date();
  date2.setHours(hours2, minutes2, 0);

  // Obliczanie różnicy w milisekundach, a potem przeliczanie na minuty
  const differenceInMinutes = (date2 - date1) / (1000 * 60);

  return differenceInMinutes;
};
