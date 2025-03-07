import { useEffect, useState } from 'react';
import { useLocalStorage } from './use-local-storage';
import { toast } from "@/hooks/use-toast";

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

      // Update localStorage manually to ensure persistence
      try {
        localStorage.setItem('theme', theme);
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    };

    // Initial theme update
    updateTheme();

    // Listen for system theme changes
    mediaQuery.addEventListener('change', updateTheme);

    return () => {
      mediaQuery.removeEventListener('change', updateTheme);
    };
  }, [theme]);

  const updateTheme = (newTheme: Theme) => {
    try {
      setTheme(newTheme);
    } catch (error) {
      console.error('Error updating theme:', error);
      toast({
        title: "Theme Update Error",
        description: "Failed to update theme. Please try again.",
        variant: "destructive"
      });
    }
  };

  return { theme, setTheme: updateTheme, isDark };
}