export const randomInteger = (min: number, max: number) => {
  const rand = min + Math.random() * (max + 1 - min);
  return Math.floor(rand);
};

export const randomElement = <T>(array: T[]) =>
  array[randomInteger(0, array.length - 1)];

export function shuffleArray<T>(array: T[], cloned?: boolean): T[] {
  const shuffled = cloned ? [...array] : array;
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
