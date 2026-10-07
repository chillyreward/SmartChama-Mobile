import * as SecureStore from 'expo-secure-store';

// Storage adapter for the Supabase session, backed by expo-secure-store
// (Android Keystore-encrypted). A session JSON can exceed SecureStore's
// recommended 2 KB per value, so values are split into chunks.
//
// Layout: `${key}` holds the chunk count; `${key}.0`, `${key}.1`, ... hold the parts.

const CHUNK_SIZE = 1800;
const OPTIONS: SecureStore.SecureStoreOptions = {
  // Not migrated to another device or restored from backup
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// SecureStore keys may only contain alphanumerics, ".", "-" and "_"
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

async function removeChunks(key: string, from = 0) {
  for (let i = from; ; i++) {
    const part = await SecureStore.getItemAsync(`${key}.${i}`, OPTIONS);
    if (part === null) break;
    await SecureStore.deleteItemAsync(`${key}.${i}`, OPTIONS);
  }
}

export const secureSessionStorage = {
  async getItem(rawKey: string): Promise<string | null> {
    const key = safeKey(rawKey);
    const count = await SecureStore.getItemAsync(key, OPTIONS);
    if (count === null) return null;
    const n = Number(count);
    if (!Number.isInteger(n) || n < 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < n; i++) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`, OPTIONS);
      if (part === null) return null; // partial write: treat as signed out
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(rawKey: string, value: string): Promise<void> {
    const key = safeKey(rawKey);
    const chunks = value.match(new RegExp(`[\\s\\S]{1,${CHUNK_SIZE}}`, 'g')) ?? [''];
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${key}.${i}`, chunks[i], OPTIONS);
    }
    await removeChunks(key, chunks.length);
    await SecureStore.setItemAsync(key, String(chunks.length), OPTIONS);
  },

  async removeItem(rawKey: string): Promise<void> {
    const key = safeKey(rawKey);
    await removeChunks(key);
    await SecureStore.deleteItemAsync(key, OPTIONS);
  },
};
