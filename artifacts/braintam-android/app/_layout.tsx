import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { Stack } from "expo-router";
import { SplashScreen } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  requestNotificationPermissions,
  setupNotificationChannels,
} from "@/services/notifications";

SplashScreen.preventAutoHideAsync();

const TOKEN_KEY = "braintam_token";
const NOTIF_PROMPTED_KEY = "braintam_notif_prompted";

if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

setAuthTokenGetter(async () => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [permissionRequested, setPermissionRequested] = useState(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    // Set up Android notification channels regardless of login state
    setupNotificationChannels();

    // Request notification permissions only when the student is logged in (has a token).
    // This mirrors "permissions requested at first login" — we check once per install.
    const initPermissions = async () => {
      const token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
      const alreadyPrompted = await AsyncStorage.getItem(NOTIF_PROMPTED_KEY).catch(() => null);

      if (token && !alreadyPrompted) {
        // First time the app is opened after login — request permission
        await requestNotificationPermissions();
        await AsyncStorage.setItem(NOTIF_PROMPTED_KEY, "1").catch(() => {});
      } else if (!token) {
        // Not logged in yet — watch for the token to appear (polling once per 3s for up to 30s)
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const t = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
          const prompted = await AsyncStorage.getItem(NOTIF_PROMPTED_KEY).catch(() => null);
          if ((t && !prompted) || attempts >= 10) {
            clearInterval(poll);
            if (t && !prompted) {
              await requestNotificationPermissions();
              await AsyncStorage.setItem(NOTIF_PROMPTED_KEY, "1").catch(() => {});
            }
          }
        }, 3000);
        return () => clearInterval(poll);
      }

      setPermissionRequested(true);
    };

    const cleanup = initPermissions();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) {
          console.log("Notification received:", notification.request.content.title);
        }
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (_response) => {}
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      cleanup?.then?.((fn) => fn?.());
    };
  }, []);

  useEffect(() => {
    if (!permissionRequested || Platform.OS === "web") return;
    const handleChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        queryClient.invalidateQueries();
      }
    };
    const sub = AppState.addEventListener("change", handleChange);
    return () => sub.remove();
  }, [permissionRequested]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <Stack screenOptions={{ headerShown: false }} />
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
