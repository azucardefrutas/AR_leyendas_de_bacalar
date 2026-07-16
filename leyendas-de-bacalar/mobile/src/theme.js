import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Paleta de la laguna de Bacalar (los teals que pidió el usuario). Se combina en
// modo claro (predominante, brillante) y modo oscuro. #00626f es el color de marca
// del landing intro.
const BRAND = {
  teal900: '#00343B',
  teal800: '#00626F', // marca / splash
  teal700: '#097AA3',
  aqua: '#63A2B0',
  sky: '#6DBDE6',
  mint: '#79DBDC',
  ice: '#8ED6EE',
  pale: '#A5F2F3',
};

const light = {
  ...BRAND,
  mode: 'light',
  bg: '#EAF9FB',
  bgGrad: ['#EAFAFB', '#D7F1F4', '#CDEEF2'],
  surface: 'rgba(255,255,255,0.66)',
  surfaceSolid: '#F4FCFD',
  card: 'rgba(255,255,255,0.62)',
  cardBrd: 'rgba(255,255,255,0.8)',
  text: '#053942',
  muted: '#3F6A72',
  faint: 'rgba(5,57,66,0.5)',
  line: 'rgba(9,122,163,0.16)',
  primary: '#097AA3',
  primaryGrad: ['#8ED6EE', '#097AA3'],
  onPrimary: '#FFFFFF',
  accent: '#00626F',
  splashBg: '#00626F',
  logoTint: null, // logo azul (original) en claro
  barIcon: '#00626F',
};

const dark = {
  ...BRAND,
  mode: 'dark',
  bg: '#04222B',
  bgGrad: ['#062E37', '#04222B', '#031A22'],
  surface: 'rgba(255,255,255,0.08)',
  surfaceSolid: '#07303A',
  card: 'rgba(255,255,255,0.10)',
  cardBrd: 'rgba(255,255,255,0.18)',
  text: '#EAF9FB',
  muted: 'rgba(234,249,251,0.72)',
  faint: 'rgba(234,249,251,0.45)',
  line: 'rgba(141,214,238,0.2)',
  primary: '#6DBDE6',
  primaryGrad: ['#8ED6EE', '#097AA3'],
  onPrimary: '#04222B',
  accent: '#8ED6EE',
  splashBg: '#00626F',
  logoTint: '#FFFFFF', // logo blanco en oscuro
  barIcon: '#EAF9FB',
};

const THEMES = { light, dark };
const STORAGE_KEY = 'ldb:ar:theme';

const ThemeContext = createContext({ colors: light, mode: 'light', toggle: () => {} });

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') setMode(saved);
      } catch {
        // sin preferencia guardada
      }
    })();
  }, []);

  const value = useMemo(() => ({
    mode,
    colors: THEMES[mode],
    toggle: () => setMode((m) => {
      const next = m === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    }),
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Export directo por compatibilidad (algunos módulos usan colors sueltos).
export const colors = light;
export const gradients = { bg: light.bgGrad };
