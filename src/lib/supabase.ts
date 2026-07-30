import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  'https://stfjghudefipojpcdxtn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0ZmpnaHVkZWZpcG9qcGNkeHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTIzOTYsImV4cCI6MjA4NTg4ODM5Nn0.7lWo_gUi3zA5GF7wsGPdlStWwGLWI66QI4nRf0WjG_A',
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
