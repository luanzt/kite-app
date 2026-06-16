import { createMMKV, type MMKV } from 'react-native-mmkv'
import { createJSONStorage, type StateStorage } from 'zustand/middleware'

export const storage: MMKV = createMMKV({ id: 'app-storage' })

export const storageUtils = {
  getString: (key: string): string | undefined => storage.getString(key),
  setString: (key: string, value: string): void => storage.set(key, value),
  getBoolean: (key: string): boolean | undefined => storage.getBoolean(key),
  setBoolean: (key: string, value: boolean): void => storage.set(key, value),
  delete: (key: string): void => {
    storage.remove(key)
  },
  clearAll: (): void => storage.clearAll()
}

const mmkvStateStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const value = storage.getString(name)
    return value ?? null
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, value)
  },
  removeItem: (name: string): void => {
    storage.remove(name)
  }
}

export const mmkvZustandStorage = createJSONStorage(() => mmkvStateStorage)
