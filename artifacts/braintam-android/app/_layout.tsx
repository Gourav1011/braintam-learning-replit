import { useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Stack, router, useSegments } from "expo-router";
import { SplashScreen } from "expo-router";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
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
import { OfflineBanner } from "@/components/OfflineBanner";
import { AuthProvider, useAuth } from "@/contexts/auth";
import {
  requestNotificationPermissions,
  setupNotificationChannels,
} from "@/services/notifications";
import { scheduleAllReminders } from "@/services/scheduleReminders";

SplashScreen.preventAutoHideAsync();

const TOKEN_KEY = "braintam_token";
const NOTIF_PROMPTED_KEY = "braintam_notif_prompted";
const TOKEN_POLL_MS = 2000;

if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api`);
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
    queries: {
      staleTime: 60_000,
      retry: 1,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "braintam_query_cache",
  throttleTime: 1000,
});

async function onLoginDetected(): Promise<void> {
  try {
    const alreadyPrompted = await AsyncStorage.getItem(NOTIF_PROMPTED_KEY);
    if (!alreadyPrompted) {
      await requestNotificationPermissions();
      await AsyncStorage.setItem(NOTIF_PROMPTED_KEY, "1");
    }
    await scheduleAllReminders();
  } catch {}
}

const UNPROTECTED = new Set(["login", "register"]);

function AuthGate() {
  const { isLoaded, token } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoaded) return;
    const root = segments[0] as string | undefined;
    const isPublic = root !== undefined && UNPROTECTED.has(root);
    if (!token && !isPublic) {
      router.replace("/login");
    } else if (token && isPublic) {
      router.replace("/(tabs)");
    }
  }, [isLoaded, token, segments]);

  return null;
}

function CacheClearer() {
  const { token } = useAuth();
  const prevToken = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (prevToken.current !== undefined && prevToken.current !== token) {
      queryClient.clear();
    }
    prevToken.current = token;
  }, [token]);

  return null;
}

function NotificationManager() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const lastToken = useRef<string | null | undefined>(undefined);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActive = useRef(true);

  useEffect(() => {
    if (Platform.OS === "web") return;

    setupNotificationChannels();

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
        await onLoginDetected();
      }
    };

    checkToken();

    pollRef.current = setInterval(() => {
      if (isActive.current) checkToken();
    }, TOKEN_POLL_MS);

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
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {});

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      appStateSub.remove();
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return null;
}

function ReconnectManager() {
  const { justCameOnline } = useNetworkStatus();

  useEffect(() => {
    if (justCameOnline) {
      queryClient.invalidateQueries();
    }
  }, [justCameOnline]);

  return null;
}

function RootLayoutInner() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <AuthGate />
      <CacheClearer />
      <NotificationManager />
      <ReconnectManager />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ animation: "fade" }} />
        <Stack.Screen name="register" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="course/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="test/[id]" options={{ animation: "slide_from_right" }} />
      </Stack>
      <OfflineBanner />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
          >
            <AuthProvider>
              <RootLayoutInner />
            </AuthProvider>
          </PersistQueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
