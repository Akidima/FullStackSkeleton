import { useEffect, useState } from 'react';
import { useLocalStorage } from './use-local-storage';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'system');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Handle system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      const root = window.document.documentElement;
      const systemIsDark = mediaQuery.matches;

      // Remove all theme classes
      root.classList.remove('light', 'dark');

      // Apply theme based on setting
      if (theme === 'system') {
        root.classList.add(systemIsDark ? 'dark' : 'light');
        setIsDark(systemIsDark);
      } else {
        root.classList.add(theme);
        setIsDark(theme === 'dark');
      }

      // Also update theme.json through a hidden form submission
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/@themes';

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'theme';
      input.value = JSON.stringify({
        variant: 'tint',
        primary: 'hsl(221 83% 53%)',
        appearance: theme,
        radius: 0.75
      });

      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    };

    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);

    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [theme]);

  return { theme, setTheme, isDark };
}