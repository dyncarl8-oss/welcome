import { createSdk } from "@whop/iframe";

let sdkInstance: ReturnType<typeof createSdk> | null = null;
let sdkPromise: Promise<ReturnType<typeof createSdk>> | null = null;

type ThemeChangeCallback = (appearance: "light" | "dark") => void;
let themeChangeCallbacks: ThemeChangeCallback[] = [];

const fetchAppConfig = async () => {
  const response = await fetch("/api/config");
  const config = await response.json();
  return config.appId;
};

export const getIframeSdk = async () => {
  if (sdkInstance) {
    return sdkInstance;
  }
  
  if (!sdkPromise) {
    sdkPromise = fetchAppConfig().then((appId) => {
      sdkInstance = createSdk({ 
        appId,
        onMessage: {
          onColorThemeChange: async (themeData) => {
            console.log('🎨 Received onColorThemeChange event:', themeData);
            if (themeData.appearance) {
              // Notify all registered callbacks
              themeChangeCallbacks.forEach(callback => {
                callback(themeData.appearance as "light" | "dark");
              });
            }
          }
        }
      });
      return sdkInstance;
    });
  }
  
  return sdkPromise;
};

export const onThemeChange = (callback: ThemeChangeCallback) => {
  themeChangeCallbacks.push(callback);
  return () => {
    themeChangeCallbacks = themeChangeCallbacks.filter(cb => cb !== callback);
  };
};

export const iframeSdk = {
  openExternalUrl: async (params: { url: string }) => {
    const sdk = await getIframeSdk();
    return sdk.openExternalUrl(params);
  },
  inAppPurchase: async (params: { planId: string; id?: string }) => {
    const sdk = await getIframeSdk();
    return sdk.inAppPurchase(params);
  },
  getColorTheme: async () => {
    const sdk = await getIframeSdk();
    return sdk.getColorTheme();
  },
};
