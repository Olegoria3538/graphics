export const isEmail = (value: any): value is string => {
  if (typeof value !== "string") return false;
  const re = /\S+@\S+\.\S+/;
  return re.test(value);
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
};

export const isNumeric = (value: unknown): value is number | string | null => {
  return isNumber(Number(value));
};

export const isUrl = (url: any): url is string => {
  if (typeof url !== "string") return false;
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

export const isPromise = <T = unknown>(obj: any): obj is Promise<T> => {
  return (
    !!obj &&
    (typeof obj === "object" || typeof obj === "function") &&
    typeof obj.then === "function"
  );
};
export const isNill = (x: any): x is null | undefined => {
  return x === null || x === undefined;
};

export const isEmpty = (x: any): x is null | undefined | "" => {
  return x === null || x === undefined || x === "";
};

export const isString = (x: any): x is string => {
  return typeof x === "string";
};

export const isFile = (x: any): x is File => {
  return x instanceof File;
};

export const isIterable = <T = any>(obj: any): obj is Iterable<T> => {
  if (isNill(obj)) return false;
  return typeof obj[Symbol.iterator] === "function";
};
