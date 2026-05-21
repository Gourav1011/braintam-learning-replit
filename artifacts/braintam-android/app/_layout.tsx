import { useEffect, useRef } from "react";
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
/** How often (ms) to poll for a newly-stored token while the app is active */
const TOKEN_POLL_MS = 2000;

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
 * Core login-success handler.
 * Requests notification permission (once per install) and immediately
 * schedules reminders for all eligible classes and homework.
 * Safe to call multiple times — idempotent via the NOTIF_PROMPTED_KEY flag.
 */
async function onLoginDetected(): Promise<void> {
  try {
    const alreadyPrompted = await AsyncStorage.getItem(NOTIF_PROMPTED_KEY);
    if (!alreadyPrompted) {
      await requestNotificationPermissions();
      await AsyncStorage.setItem(NOTIF_PROMPTED_KEY, "1");
    }
    // Always (re-)schedule so newly assigned items are picked up
    await scheduleAllReminders();
  } catch {
    // Non-fatal
  }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  /** Tracks the last known token so we detect the null→value transition */
  const lastToken = useRef<string | null | undefined>(undefined);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActive = useRef(true);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    setupNotificationChannels();

    /**
     * Checks AsyncStorage for a token.
     * - On the very first call (lastToken.current === undefined): if a token
     *   exists, treat it as "already logged in" and run onLoginDetected().
     * - On subsequent calls: only fires onLoginDetected() when the token
     *   transitions from absent → present (i.e., the student just logged in
     *   while the app was foregrounded).
     */
    const checkToken = async () => {
      let token: string | null = null;
      try {
        token = await AsyncStorage.getItem(TOKEN_KEY);
      } catch {
        return;
      }
      const prev = lastToken.current;
      lastToken.current = token;
      if (token && (prev === undefined || prev === null)) {
        // First detection of a valid token → first login (or already logged in at startup)
        await onLoginDetected();
      }
    };

    // Run immediately on mount
    checkToken();

    // Poll every 2s while the app is active to catch login happening in-session
    pollRef.current = setInterval(() => {
      if (isActive.current) checkToken();
    }, TOKEN_POLL_MS);

    // On foreground: re-check token immediately + re-schedule reminders
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        isActive.current = true;
        queryClient.invalidateQueries();
        checkToken();
      } else {
        isActive.current = false;
      }
    };
    const appStateSub = AppState.addEventListener("change", handleAppState);

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
      if (pollRef.current) clearInterval(pollRef.current);
      appStateSub.remove();
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
