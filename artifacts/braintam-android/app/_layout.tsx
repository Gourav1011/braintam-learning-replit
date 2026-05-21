import { useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { Stack, router, useSegments } from "expo-router";
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
      <NotificationManager />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ animation: "fade" }} />
        <Stack.Screen name="register" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="course/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="test/[id]" options={{ animation: "slide_from_right" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RootLayoutInner />
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
