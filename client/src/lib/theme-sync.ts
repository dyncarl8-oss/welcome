/**
 * Whop Theme Synchronization
 * 
 * Syncs the app's theme with Whop's parent iframe theme by:
 * 1. Detecting Whop's current theme via iframe SDK
 * 2. Applying/removing 'dark' class on <html> element
 * 3. Listening for theme changes and updating in real-time
 * 4. Falling back to system preference when SDK unavailable
 */

const THEME_STORAGE_KEY = 'whop-app-theme';
const DARK_CLASS = 'dark';

/**
 * Safe localStorage getter - handles sandboxed iframe restrictions
 */
function safeGetStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    // localStorage blocked in sandboxed iframe
    return null;
  }
}

/**
 * Safe localStorage setter - handles sandboxed iframe restrictions
 */
function safeSetStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // localStorage blocked in sandboxed iframe - silently ignore
    console.log('⚠️ localStorage unavailable (sandboxed iframe), theme preference will not persist');
  }
}

/**
 * Apply theme to document
 */
function applyTheme(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add(DARK_CLASS);
  } else {
    document.documentElement.classList.remove(DARK_CLASS);
  }
  
  // Store in localStorage for flash prevention (if available)
  safeSetStorage(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  
  console.log(`🎨 Theme applied: ${isDark ? 'dark' : 'light'} mode`);
}

/**
 * Get system preference as fallback
 */
function getSystemThemePreference(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get cached theme from localStorage (safe for sandboxed iframes)
 */
function getCachedTheme(): boolean | null {
  const cached = safeGetStorage(THEME_STORAGE_KEY);
  if (cached === 'dark') return true;
  if (cached === 'light') return false;
  return null;
}

/**
 * Initialize Whop theme synchronization
 * Should be called early in app lifecycle (before React mounts)
 */
export async function initializeWhopThemeSync() {
  try {
    console.log('🎨 Initializing Whop theme sync...');
    
    // Apply cached theme immediately to prevent flash
    const cachedTheme = getCachedTheme();
    if (cachedTheme !== null) {
      applyTheme(cachedTheme);
    } else {
      // Fall back to system preference if no cache
      applyTheme(getSystemThemePreference());
    }
    
    // Try to get Whop iframe SDK and listen for theme changes
    try {
      const { iframeSdk, onThemeChange } = await import('./iframe-sdk');
      
      console.log('🎨 Whop iframe SDK loaded, setting up theme listeners...');
      
      // Register theme change listener
      const unsubscribe = onThemeChange((appearance) => {
        const isDark = appearance === 'dark';
        console.log(`🎨 Theme changed via onColorThemeChange: ${isDark ? 'dark' : 'light'}`);
        applyTheme(isDark);
      });
      
      // Try to fetch the current theme with timeout
      const themePromise = iframeSdk.getColorTheme();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Theme fetch timeout')), 2000)
      );
      
      try {
        const themeData = await Promise.race([themePromise, timeoutPromise]);
        console.log('🎨 Initial theme data from Whop:', themeData);
        
        if (themeData && typeof themeData === 'object' && 'appearance' in themeData) {
          const isDark = themeData.appearance === 'dark';
          console.log(`🎨 Applying initial Whop theme: ${isDark ? 'dark' : 'light'}`);
          applyTheme(isDark);
        }
      } catch (timeoutError) {
        console.log('⚠️ Initial theme fetch timed out (app may be loading before parent ready)');
        // This is okay - we'll get the theme via onColorThemeChange event
      }
      
      console.log('✅ Whop theme sync initialized with onColorThemeChange listener');
      
      return unsubscribe;
      
    } catch (sdkError) {
      console.log('⚠️ Whop iframe SDK not available, using fallback theme detection');
      
      // Fallback: Listen to system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        console.log(`🎨 System theme changed to: ${e.matches ? 'dark' : 'light'}`);
        applyTheme(e.matches);
      };
      
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      
      // Apply system preference if no cached theme
      if (getCachedTheme() === null) {
        applyTheme(mediaQuery.matches);
      }
      
      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      };
    }
    
  } catch (error) {
    console.error('❌ Error initializing theme sync:', error);
    // Fall back to system preference
    applyTheme(getSystemThemePreference());
  }
}

/**
 * Bootstrap theme early (call this from an inline script in index.html)
 */
export function bootstrapTheme() {
  const cachedTheme = getCachedTheme();
  if (cachedTheme !== null) {
    applyTheme(cachedTheme);
  } else {
    applyTheme(getSystemThemePreference());
  }
}
