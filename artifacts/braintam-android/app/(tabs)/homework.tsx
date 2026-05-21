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
import { useListHomework } from "@workspace/api-client-react";
import {
  scheduleHomeworkNotification,
  cancelHomeworkNotification,
  isHomeworkNotificationScheduled,
  getNotificationPermissionStatus,
} from "@/services/notifications";
import {
  addHomeworkOptOut,
  removeHomeworkOptOut,
  isHomeworkOptedOut,
} from "@/services/notifOptOut";
import { Colors } from "@/constants/colors";

type HWItem = {
  id: number;
  title: string;
  subjectName: string;
  dueDate: string;
  maxMarks: number | null | undefined;
  status: string;
  notifEnabled: boolean;
  notifPossible: boolean;
};

function hoursUntilDue(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3600000;
}

function formatDue(iso: string): string {
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

function UrgencyBadge({ hours }: { hours: number }) {
  if (hours < 0) {
    return (
      <View style={[styles.badge, { backgroundColor: "#FEE2E2" }]}>
        <Text style={[styles.badgeText, { color: Colors.error }]}>Overdue</Text>
      </View>
    );
  }
  if (hours <= 24) {
    return (
      <View style={[styles.badge, { backgroundColor: "#FFF4EE" }]}>
        <Feather name="alert-triangle" size={10} color={Colors.primary} />
        <Text style={[styles.badgeText, { color: Colors.primary }]}>Due in {Math.round(hours)}h</Text>
      </View>
    );
  }
  if (hours <= 72) {
    return (
      <View style={[styles.badge, { backgroundColor: "#FFFBEB" }]}>
        <Text style={[styles.badgeText, { color: Colors.warning }]}>{Math.round(hours / 24)}d left</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: "#EFF6FF" }]}>
      <Text style={[styles.badgeText, { color: Colors.navy }]}>Upcoming</Text>
    </View>
  );
}

export default function HomeworkScreen() {
  const insets = useSafeAreaInsets();
  const { data: rawHW, isLoading, isError, refetch } = useListHomework();
  const [items, setItems] = useState<HWItem[]>([]);
  const [permGranted, setPermGranted] = useState(true);

  useEffect(() => {
    getNotificationPermissionStatus().then((s) => setPermGranted(s === "granted"));
  }, []);

  // Reflect actual scheduled + opt-out state from AsyncStorage when data loads
  useEffect(() => {
    if (!rawHW) return;
    const build = async () => {
      const result: HWItem[] = await Promise.all(
        rawHW.map(async (h) => {
          const hours = hoursUntilDue(h.dueDate);
          const notifPossible = hours > 24;
          let notifEnabled = false;
          if (notifPossible) {
            const [scheduled, optedOut] = await Promise.all([
              isHomeworkNotificationScheduled(h.id),
              isHomeworkOptedOut(h.id),
            ]);
            notifEnabled = scheduled && !optedOut;
          }
          return {
            id: h.id,
            title: h.title,
            subjectName: h.subjectName,
            dueDate: h.dueDate,
            maxMarks: h.maxMarks,
            status: h.status,
            notifEnabled,
            notifPossible,
          };
        })
      );
      setItems(result);
    };
    build();
  }, [rawHW]);

  // Non-optimistic toggle — also persists opt-out preference
  const toggleNotification = useCallback(async (item: HWItem) => {
    if (Platform.OS !== "web") {
      await Haptics.selectionAsync();
    }
    if (item.notifEnabled) {
      await cancelHomeworkNotification(item.id);
      await addHomeworkOptOut(item.id); // persist: user explicitly disabled
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, notifEnabled: false } : i))
      );
    } else {
      const scheduled = await scheduleHomeworkNotification(
        item.id,
        item.title,
        new Date(item.dueDate)
      );
      if (scheduled) {
        await removeHomeworkOptOut(item.id); // clear opt-out: user re-enabled
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

  const renderItem = ({ item }: { item: HWItem }) => {
    const hours = hoursUntilDue(item.dueDate);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.subject}>{item.subjectName}</Text>
            <Text style={styles.hwTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.marks}>
              <Feather name="award" size={12} color={Colors.muted} /> {item.maxMarks ?? "—"} marks
            </Text>
          </View>
          <UrgencyBadge hours={hours} />
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.dueRow}>
            <Feather name="calendar" size={13} color={Colors.mutedForeground} />
            <Text style={styles.dueText}>Due: {formatDue(item.dueDate)}</Text>
          </View>

          {item.notifPossible ? (
            <View style={styles.notifRow}>
              <Feather
                name="bell"
                size={14}
                color={item.notifEnabled ? Colors.navy : Colors.mutedForeground}
              />
              <Text style={[styles.notifLabel, item.notifEnabled && styles.notifLabelActive]}>
                {item.notifEnabled ? "Reminder set (24h before)" : "Remind me 24h before"}
              </Text>
              <Switch
                value={item.notifEnabled}
                onValueChange={() => toggleNotification(item)}
                trackColor={{ false: Colors.border, true: "#C7D9F5" }}
                thumbColor={item.notifEnabled ? Colors.navy : "#D1D5DB"}
                ios_backgroundColor={Colors.border}
              />
            </View>
          ) : (
            <View style={styles.notifRow}>
              <Feather name="bell-off" size={14} color={Colors.border} />
              <Text style={styles.notifUnavailable}>
                {hours < 0 ? "Deadline passed" : "Less than 24h remaining"}
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
        <Text style={styles.headerTitle}>Homework</Text>
        {!permGranted && Platform.OS !== "web" && (
          <View style={styles.permBanner}>
            <Feather name="alert-circle" size={14} color={Colors.warning} />
            <Text style={styles.permText}>Enable notifications in device settings to get reminders</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.navy} size="large" />
          <Text style={styles.loadingText}>Loading homework…</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Feather name="wifi-off" size={40} color={Colors.border} />
          <Text style={styles.emptyTitle}>Couldn't load homework</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="check-circle" size={40} color={Colors.success} />
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptyDesc}>No pending homework right now</Text>
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
  subject: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: Colors.navy, letterSpacing: 0.5, textTransform: "uppercase" },
  hwTitle: { fontSize: 16, fontFamily: "Poppins_600SemiBold", color: Colors.navy, marginTop: 2, lineHeight: 22 },
  marks: { fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.muted, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4 },
  badgeText: { fontSize: 11, fontFamily: "Poppins_600SemiBold" },
  cardBottom: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, gap: 8 },
  dueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dueText: { fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.muted },
  notifRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  notifLabel: { flex: 1, fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  notifLabelActive: { color: Colors.navy, fontFamily: "Poppins_600SemiBold" },
  notifUnavailable: { flex: 1, fontSize: 12, fontFamily: "Poppins_400Regular", color: Colors.border },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  loadingText: { fontSize: 14, fontFamily: "Poppins_400Regular", color: Colors.muted },
  emptyTitle: { fontSize: 18, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  emptyDesc: { fontSize: 14, fontFamily: "Poppins_400Regular", color: Colors.muted, textAlign: "center" },
  retryBtn: { backgroundColor: Colors.navy, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: "#FFF", fontFamily: "Poppins_600SemiBold", fontSize: 14 },
});
