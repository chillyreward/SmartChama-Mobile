import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildPalette, type Palette } from '../theme/colors';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  colors: Palette;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem('smartchama_theme').then((saved: string | null) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setMode(saved as ThemeMode);
      }
    }).catch(() => {});
  }, []);

  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
    AsyncStorage.setItem('smartchama_theme', newMode).catch(() => {});
  };

  const isDark = mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark');

  const currentColors = useMemo(() => buildPalette(isDark), [isDark]);

  return (
    <ThemeContext.Provider value={{ mode, isDark, setThemeMode, colors: currentColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
