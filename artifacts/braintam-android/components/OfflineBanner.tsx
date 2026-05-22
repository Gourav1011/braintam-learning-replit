import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const BANNER_HEIGHT = 44;

export function OfflineBanner() {
  const { isOnline, justCameOnline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const offlineTranslateY = useRef(new Animated.Value(-BANNER_HEIGHT - insets.top)).current;
  const onlineOpacity = useRef(new Animated.Value(0)).current;
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      Animated.spring(offlineTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else if (wasOffline.current) {
      Animated.timing(offlineTranslateY, {
        toValue: -BANNER_HEIGHT - insets.top - 8,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOnline, insets.top, offlineTranslateY]);

  useEffect(() => {
    if (justCameOnline) {
      Animated.sequence([
        Animated.timing(onlineOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1400),
        Animated.timing(onlineOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [justCameOnline, onlineOpacity]);

  return (
    <>
      <Animated.View
        style={[
          styles.offlineBanner,
          { paddingTop: insets.top + 8, transform: [{ translateY: offlineTranslateY }] },
        ]}
        accessibilityLiveRegion="polite"
        accessibilityLabel="No internet connection"
      >
        <Feather name="wifi-off" size={15} color="#fff" />
        <Text style={styles.offlineText}>No internet connection</Text>
        <TouchableOpacity
          onPress={() => queryClient.invalidateQueries()}
          style={styles.retryBtn}
          accessibilityLabel="Retry"
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={[
          styles.onlineBanner,
          { top: insets.top + 12, opacity: onlineOpacity },
        ]}
        pointerEvents="none"
        accessibilityLiveRegion="polite"
        accessibilityLabel="Back online"
        accessible
      >
        <Feather name="wifi" size={15} color="#fff" />
        <Text style={styles.onlineText}>Back online</Text>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: "#1F2937",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
    gap: 8,
    ...Platform.select({
      android: { elevation: 20 },
    }),
  },
  offlineText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    flex: 1,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  retryText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },
  onlineBanner: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 9999,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
    ...Platform.select({
      android: { elevation: 20 },
    }),
  },
  onlineText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
});
