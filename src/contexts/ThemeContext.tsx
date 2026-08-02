import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  colors: {
    primary: string;
    primaryDark: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    danger: string;
  };
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

  const currentColors = {
    primary: colors.primary,
    primaryDark: colors.primaryDark,
    background: isDark ? colors.background.dark : colors.background.light,
    card: isDark ? colors.card.dark : colors.card.light,
    text: isDark ? colors.text.dark : colors.text.light,
    textSecondary: isDark ? colors.textSecondary.dark : colors.textSecondary.light,
    border: isDark ? colors.border.dark : colors.border.light,
    danger: colors.danger,
  };

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
