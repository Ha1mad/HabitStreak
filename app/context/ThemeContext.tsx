import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { defaultPremiumProfile, loadPremiumProfile, premiumThemePacks, PremiumTheme } from '../lib/premium';

type Theme = 'light' | 'dark';

export const lightColors = {
  background: '#f5f5f5',
  surface: '#ffffff',
  text: '#1a1a1a',
  textSecondary: '#666666',
  border: '#e0e0e0',
  card: '#ffffff',
  modalBackground: 'rgba(0,0,0,0.5)',
  modalContent: '#ffffff',
  inputBorder: '#007AFF',
  placeholder: '#999999',
  tint: '#007AFF',
};

export const darkColors = {
  background: '#161618',
  surface: '#1c1c1e',
  text: '#ffffff',
  textSecondary: '#8e8e93',
  border: '#38383a',
  card: '#1c1c1e',
  modalBackground: 'rgba(0,0,0,0.8)',
  modalContent: '#1a1a1a',
  inputBorder: '#007AFF',
  placeholder: '#888888',
  tint: '#0A84FF',
};

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  colors: typeof lightColors;
  activeThemePack: PremiumTheme;
  refreshThemePreferences: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeThemePack, setActiveThemePack] = useState<PremiumTheme>(defaultPremiumProfile.themePack);

  const loadTheme = async () => {
    try {
      const [savedTheme, premiumProfile] = await Promise.all([AsyncStorage.getItem('theme'), loadPremiumProfile()]);
      if (savedTheme === 'light') {
        setTheme('light');
      } else if (savedTheme === 'dark') {
        setTheme('dark');
      }
      setActiveThemePack(premiumProfile.isPremium ? premiumProfile.themePack : defaultPremiumProfile.themePack);
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  useEffect(() => {
    // Restore persisted theme preferences after the initial render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTheme().catch(error => console.log('Error loading theme:', error));
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    await AsyncStorage.setItem('theme', newTheme);
  };

  const refreshThemePreferences = async () => {
    const premiumProfile = await loadPremiumProfile();
    setActiveThemePack(premiumProfile.isPremium ? premiumProfile.themePack : defaultPremiumProfile.themePack);
  };

  const baseColors = theme === 'dark' ? darkColors : lightColors;
  const themePack = premiumThemePacks[activeThemePack];
  const packColors = theme === 'dark' ? themePack.dark : themePack.light;
  const colors = {
    ...baseColors,
    background: packColors.background,
    surface: packColors.surface,
    border: packColors.border,
    tint: packColors.tint,
    inputBorder: themePack.accent,
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors, activeThemePack, refreshThemePreferences }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
