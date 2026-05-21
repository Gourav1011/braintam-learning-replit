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
import { scheduleAllReminders } from "@/services/scheduleReminders";

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

/**
 * Runs on every app foreground and at mount.
 * If the student is logged in (has a token) and hasn't been prompted yet,
 * requests notification permissions and schedules reminders for all upcoming
 * classes and homework — regardless of which tabs have been visited.
 */
async function handleLoginCheck(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const [token, alreadyPrompted] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(NOTIF_PROMPTED_KEY),
    ]);

    if (!token) return; // Not logged in yet — nothing to do

    if (!alreadyPrompted) {
      // First foreground after login — request permissions
      await requestNotificationPermissions();
      await AsyncStorage.setItem(NOTIF_PROMPTED_KEY, "1");
    }

    // Always (re)schedule reminders on foreground so new items are picked up
    await scheduleAllReminders();
  } catch {
    // Non-fatal — silently ignore
  }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [ready, setReady] = useState(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS === "web") {
      setReady(true);
      return;
    }

    // Set up Android notification channels
    setupNotificationChannels();

    // Run login check immediately on mount
    handleLoginCheck().finally(() => setReady(true));

    // Re-run on every app foreground (catches login that happened in background,
    // permission grant in Settings, or newly assigned homework/classes)
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        queryClient.invalidateQueries();
        handleLoginCheck();
      }
    });

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
      sub.remove();
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

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
