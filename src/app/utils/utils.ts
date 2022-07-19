export function isNotEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  if (value === null || value === undefined) return false;
  const testDummy: TValue = value;
  return true;
}

export const getKeyValue = <T extends object, U extends keyof T>(key: U) => (obj: T) => obj[key];


export function getLongestCommonStartingSubstring(arr1: string[]) {
  let arr = arr1.concat().sort(),
    a1 = arr[0],
    a2 = arr[arr.length - 1],
    L = a1.length,
    i = 0;
  while (i < L && a1.charAt(i) === a2.charAt(i)) i++;
  return a1.substring(0, i);
}