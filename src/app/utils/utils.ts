export function isNotEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  if (value === null || value === undefined) return false;
  const testDummy: TValue = value;
  return true;
}

export const getKeyValue = <T extends object, U extends keyof T>(key: U) => (obj: T) => obj[key];
