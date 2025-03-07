import { useEffect, useState } from 'react';
import { useLocalStorage } from './use-local-storage';
import debounce from 'lodash/debounce';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'system');
  const [isDark, setIsDark] = useState(false);

  // Debounced theme update to prevent rate limiting
  const debouncedUpdateThemeJson = debounce((newTheme: Theme) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/@themes';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'theme';
    input.value = JSON.stringify({
      variant: 'tint',
      primary: 'hsl(221 83% 53%)',
      appearance: newTheme,
      radius: 0.75
    });

    form.appendChild(input);
    document.body.appendChild(form);

    try {
      form.submit();
    } catch (error) {
      console.error('Error updating theme:', error);
    } finally {
      document.body.removeChild(form);
    }
  }, 1000); // Wait 1 second between theme updates

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

      // Update theme.json with debouncing
      debouncedUpdateThemeJson(theme);
    };

    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);

    return () => {
      mediaQuery.removeEventListener('change', updateTheme);
      debouncedUpdateThemeJson.cancel(); // Cancel any pending updates
    };
  }, [theme]);

  return { theme, setTheme, isDark };
}