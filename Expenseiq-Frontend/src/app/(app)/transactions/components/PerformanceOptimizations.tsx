'use client';

import { useState, useEffect } from 'react';

// Debounced search hook — prevents excessive filtering on rapid keystrokes
export function useDebouncedSearch(value: string, delay: number = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
