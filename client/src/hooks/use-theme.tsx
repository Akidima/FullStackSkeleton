import { useEffect, useState } from 'react';
import { useLocalStorage } from './use-local-storage';
import debounce from 'lodash/debounce';
import { toast } from "@/hooks/use-toast";

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'system');
  const [isDark, setIsDark] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Debounced theme update with a longer delay and error handling
  const debouncedUpdateThemeJson = debounce(async (newTheme: Theme) => {
    if (isUpdating) return;

    setIsUpdating(true);
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
      await new Promise((resolve) => {
        form.onsubmit = () => {
          resolve(undefined);
          return false;
        };
        form.submit();
      });
    } catch (error) {
      console.error('Error updating theme:', error);
      // Show error toast only if it's not a rate limit error (those are handled in the settings page)
      if (!error.toString().includes('Too many requests')) {
        toast({
          title: "Theme Update Error",
          description: "Failed to sync theme preference. Your theme will still work but might reset on reload.",
          variant: "destructive"
        });
      }
    } finally {
      document.body.removeChild(form);
      setIsUpdating(false);
    }
  }, 2000); // Increase debounce delay to 2 seconds

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

      // Update theme.json with debouncing and error handling
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