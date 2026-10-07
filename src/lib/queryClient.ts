import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 1,
    },
  },
});

// AsyncStorage is not encrypted, so balances, statements and member lists are
// NOT written to disk. Only queries marked `meta: { persist: true }` (public,
// non-personal data such as SmartGrow products) survive a restart.
// Encrypted offline caching is an integration slot: see docs/INTEGRATIONS.md.
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'smartchama-query-cache-v2',
});

export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24,
  // Bump to discard caches written by older app versions (which persisted everything)
  buster: 'v2',
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { meta?: Record<string, unknown>; state: { status: string } }) =>
      query.meta?.persist === true && query.state.status === 'success',
  },
};
