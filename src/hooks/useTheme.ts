'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Theme } from '@/types';

const THEME_KEY = 'cerebro-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem(THEME_KEY) as Theme | null;
  return saved && ['light', 'dark', 'system'].includes(saved) ? saved : 'system';
}

export function useTheme() {
  // Initialize with default values for SSR
  const [theme, setThemeState] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  // Resolved theme based on current theme setting
  const resolvedTheme = useMemo((): 'light' | 'dark' => {
    if (!mounted) return 'light';
    if (theme === 'system') return getSystemTheme();
    return theme;
  }, [theme, mounted]);

  // Apply theme to document
  const applyTheme = useCallback((themeToApply: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', themeToApply);
  }, []);

  // Initialize on mount - this is a standard hydration pattern
  useEffect(() => {
    const storedTheme = getStoredTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard hydration pattern
    setThemeState(storedTheme);
    setMounted(true);
  }, []);

  // Apply theme whenever it changes (after mount)
  useEffect(() => {
    if (!mounted) return;
    applyTheme(resolvedTheme);
  }, [mounted, resolvedTheme, applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      applyTheme(getSystemTheme());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted, applyTheme]);

  // Set theme function
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const nextTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  }, [resolvedTheme, setTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    mounted,
  };
}
