import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useListLiveClasses } from "@workspace/api-client-react";
import {
  scheduleClassNotification,
  cancelClassNotification,
  isClassNotificationScheduled,
  getNotificationPermissionStatus,
} from "@/services/notifications";
import { Colors } from "@/constants/colors";

type ClassItem = {
  id: number;
  title: string;
  subjectName: string;
  teacher: string;
  scheduledAt: string;
  status: string;
  notifEnabled: boolean;
  notifPossible: boolean;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

function StatusBadge({ minsUntil, status }: { minsUntil: number; status: string }) {
  if (status === "live") {
    return (
      <View style={[styles.badge, { backgroundColor: "#DCFCE7" }]}>
        <View style={styles.liveDot} />
        <Text style={[styles.badgeText, { color: Colors.success }]}>LIVE</Text>
      </View>
    );
  }
  if (minsUntil > 0 && minsUntil <= 60) {
    return (
      <View style={[styles.badge, { backgroundColor: "#FFF4EE" }]}>
        <Text style={[styles.badgeText, { color: Colors.primary }]}>In {minsUntil} min</Text>
      </View>
    );
  }
  if (minsUntil > 0) {
    return (
      <View style={[styles.badge, { backgroundColor: "#EFF6FF" }]}>
        <Text style={[styles.badgeText, { color: Colors.navy }]}>Upcoming</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: "#F3F4F6" }]}>
      <Text style={[styles.badgeText, { color: Colors.mutedForeground }]}>Ended</Text>
    </View>
  );
}

export default function ClassesScreen() {
  const insets = useSafeAreaInsets();
  const { data: rawClasses, isLoading, isError, refetch } = useListLiveClasses();
  const [items, setItems] = useState<ClassItem[]>([]);
  const [permGranted, setPermGranted] = useState(true);

  useEffect(() => {
    getNotificationPermissionStatus().then((s) => setPermGranted(s === "granted"));
  }, []);

  // Reflect current notification state from AsyncStorage when data loads
  // (actual scheduling is done by the app-level orchestrator in _layout.tsx)
  useEffect(() => {
    if (!rawClasses) return;
    const build = async () => {
      const result: ClassItem[] = await Promise.all(
        rawClasses.map(async (c) => {
          const minsLeft = minutesUntil(c.scheduledAt);
          const notifPossible = minsLeft > 15 && c.status === "upcoming";
          const notifEnabled = notifPossible
            ? await isClassNotificationScheduled(c.id)
            : false;
          return {
            id: c.id,
            title: c.title,
            subjectName: c.subjectName,
            teacher: c.teacher,
            scheduledAt: c.scheduledAt,
            status: c.status,
            notifEnabled,
            notifPossible,
          };
        })
      );
      setItems(result);
    };
    build();
  }, [rawClasses]);

  // Non-optimistic toggle: update UI only after confirmed schedule/cancel success
  const toggleNotification = useCallback(async (item: ClassItem) => {
    if (Platform.OS !== "web") {
      await Haptics.selectionAsync();
    }
    if (item.notifEnabled) {
      await cancelClassNotification(item.id);
      // Cancel always succeeds (fire-and-forget); update state
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, notifEnabled: false } : i))
      );
    } else {
      const scheduled = await scheduleClassNotification(
        item.id,
        item.title,
        new Date(item.scheduledAt)
      );
      if (scheduled) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, notifEnabled: true } : i))
        );
      } else {
        Alert.alert(
          "Couldn't set reminder",
          "Please enable notifications for Braintam in your device settings.",
          [{ text: "OK" }]
        );
      }
    }
  }, []);

  const renderItem = ({ item }: { item: ClassItem }) => {
    const minsUntil = minutesUntil(item.scheduledAt);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.subject}>{item.subjectName}</Text>
            <Text style={styles.classTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.teacher}>
              <Feather name="user" size={12} color={Colors.muted} /> {item.teacher}
            </Text>
          </View>
          <StatusBadge minsUntil={minsUntil} status={item.status} />
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.timeRow}>
            <Feather name="clock" size={13} color={Colors.mutedForeground} />
            <Text style={styles.timeText}>{formatTime(item.scheduledAt)}</Text>
          </View>

          {item.notifPossible ? (
            <View style={styles.notifRow}>
              <Feather
                name="bell"
                size={14}
                color={item.notifEnabled ? Colors.primary : Colors.mutedForeground}
              />
              <Text style={[styles.notifLabel, item.notifEnabled && styles.notifLabelActive]}>
                {item.notifEnabled ? "Reminder set (15 min before)" : "Remind me"}
              </Text>
              <Switch
                value={item.notifEnabled}
                onValueChange={() => toggleNotification(item)}
                trackColor={{ false: Colors.border, true: "#FFD4B8" }}
                thumbColor={item.notifEnabled ? Colors.primary : "#D1D5DB"}
                ios_backgroundColor={Colors.border}
              />
            </View>
          ) : (
            <View style={styles.notifRow}>
              <Feather name="bell-off" size={14} color={Colors.border} />
              <Text style={styles.notifUnavailable}>
                {minsUntil <= 0 ? "Class ended" : "Too close to schedule a reminder"}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Classes</Text>
        {!permGranted && Platform.OS !== "web" && (
          <View style={styles.permBanner}>
            <Feather name="alert-circle" size={14} color={Colors.warning} />
            <Text style={styles.permText}>Enable notifications in device settings to get reminders</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading classes…</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Feather name="wifi-off" size={40} color={Colors.border} />
          <Text style={styles.emptyTitle}>Couldn't load classes</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="video" size={40} color={Colors.border} />
          <Text style={styles.emptyTitle}>No classes scheduled</Text>
          <Text style={styles.emptyDesc}>Check back later for upcoming live classes</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!items.length}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 },
  headerTitle: { fontSize: 26, fontFamily: "Poppins_700Bold", color: Colors.navy },
  permBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  permText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: Colors.muted, flex: 1 },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  cardInfo: { flex: 1, paddingRight: 10 },
  subject: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: Colors.primary, letterSpacing: 0.5, textTransform: "uppercase" },
  classTitle: { fontSize: 16, fontFamily: "Poppins_600SemiBold", color: Colors.navy, marginTop: 2, lineHeight: 22 },
  teacher: { fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.muted, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  badgeText: { fontSize: 11, fontFamily: "Poppins_600SemiBold" },
  cardBottom: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, gap: 8 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeText: { fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.muted },
  notifRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  notifLabel: { flex: 1, fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  notifLabelActive: { color: Colors.primary, fontFamily: "Poppins_600SemiBold" },
  notifUnavailable: { fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.border },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  loadingText: { fontSize: 14, fontFamily: "Poppins_400Regular", color: Colors.muted },
  emptyTitle: { fontSize: 18, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  emptyDesc: { fontSize: 14, fontFamily: "Poppins_400Regular", color: Colors.muted, textAlign: "center" },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: "#FFF", fontFamily: "Poppins_600SemiBold", fontSize: 14 },
});
