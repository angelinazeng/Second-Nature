import { Dispatch, SetStateAction, useEffect, useState } from 'react'

/** useState that survives reloads. Storage can be blocked (private mode), so every access is guarded. */
export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored === null ? initial : (JSON.parse(stored) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Not persisted; the app still works for this session.
    }
  }, [key, value])

  return [value, setValue]
}
