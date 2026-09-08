import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
const KEY = 'agridrone.session.v1'
export const sessionStorage = {
  get: () => Platform.OS === 'web' ? Promise.resolve(globalThis.sessionStorage?.getItem(KEY) ?? null) : SecureStore.getItemAsync(KEY),
  set: async (value: string) => { if (Platform.OS === 'web') globalThis.sessionStorage.setItem(KEY, value); else await SecureStore.setItemAsync(KEY, value) },
  clear: async () => { if (Platform.OS === 'web') globalThis.sessionStorage?.removeItem(KEY); else await SecureStore.deleteItemAsync(KEY) },
}
