import { useEffect, useState } from 'react';

/**
 * Returns `value` after it has remained unchanged for `delayMs` milliseconds.
 *
 * On mount the initial value is returned immediately. Subsequent changes are
 * deferred; if `value` changes again before the timer fires, the pending update
 * is cancelled and a new one is scheduled.
 *
 * Use to debounce search-input or filter changes before pushing them to URL params.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
