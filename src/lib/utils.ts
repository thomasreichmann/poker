import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generic change detection helpers
export function shallowEqualByKeys<T extends object>(
  a: T,
  b: T,
  keys: Array<keyof T>
): boolean {
  for (const key of keys) {
    if (
      (a as Record<string, unknown>)[key as string] !==
      (b as Record<string, unknown>)[key as string]
    )
      return false;
  }
  return true;
}

export function arrayDiffBy<T>(
  prev: T[],
  next: T[],
  keyFn: (item: T) => string | number,
  equalsFn: (a: T, b: T) => boolean
): { added: T[]; removed: T[]; updated: Array<{ prev: T; next: T }> } {
  const prevMap = new Map<string | number, T>();
  for (const item of prev) prevMap.set(keyFn(item), item);

  const nextMap = new Map<string | number, T>();
  for (const item of next) nextMap.set(keyFn(item), item);

  const added: T[] = [];
  const removed: T[] = [];
  const updated: Array<{ prev: T; next: T }> = [];

  for (const [k, nextItem] of nextMap) {
    const prevItem = prevMap.get(k);
    if (!prevItem) {
      added.push(nextItem);
    } else if (!equalsFn(prevItem, nextItem)) {
      updated.push({ prev: prevItem, next: nextItem });
    }
  }

  for (const [k, prevItem] of prevMap) {
    if (!nextMap.has(k)) removed.push(prevItem);
  }

  return { added, removed, updated };
}

export function hasArrayChanges<T>(
  prev: T[],
  next: T[],
  keyFn: (item: T) => string | number,
  equalsFn: (a: T, b: T) => boolean
): boolean {
  const { added, removed, updated } = arrayDiffBy(prev, next, keyFn, equalsFn);
  return added.length > 0 || removed.length > 0 || updated.length > 0;
}
