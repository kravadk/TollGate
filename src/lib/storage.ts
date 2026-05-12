import { useCallback, useEffect, useState } from "react";

/** Typed wrapper for localStorage. Returns [value, setValue, reset]. */
export function useLocalStore<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore (quota / private mode) */
    }
  }, [key, value]);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => (typeof next === "function" ? (next as (p: T) => T)(prev) : next));
  }, []);

  const reset = useCallback(() => {
    setValue(initial);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [key, initial]);

  return [value, set, reset];
}
