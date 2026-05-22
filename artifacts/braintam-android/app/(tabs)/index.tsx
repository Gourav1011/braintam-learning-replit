import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useGetStudentDashboard, useGetLeaderboard } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import { Colors } from "@/constants/colors";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { CachedDataBanner } from "@/components/CachedDataBanner";

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_BG = ["#FEF9C3", "#F3F4F6", "#FEF3C7"];
const MEDAL_BORDER = ["#FDE047", "#D1D5DB", "#FCD34D"];

function StatCard({
  icon,
  label,
  value,
  color,
  bg,
  onPress,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
  bg: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { student } = useAuth();
  const { data: dashboard, isLoading, isError, refetch } = useGetStudentDashboard();
  const { data: leaderboard } = useGetLeaderboard();
  const { isOnline } = useNetworkStatus();

  const firstName = (dashboard?.studentName ?? student?.name ?? "Student").split(" ")[0];
  const grade = dashboard?.grade ?? student?.grade ?? "—";
  const points = dashboard?.points ?? student?.points ?? 0;
  const rank = dashboard?.rank ?? "—";
  const initials = (dashboard?.studentName ?? student?.name ?? "S")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading && !!dashboard}
          onRefresh={refetch}
          tintColor="#FF6B1A"
          colors={["#FF6B1A", "#0B2B6B"]}
          progressBackgroundColor="#fff"
        />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.name}>{firstName}</Text>
            <Text style={styles.grade}>Grade {grade} Student</Text>
          </View>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        <View style={styles.pointsRow}>
          <View style={styles.pointsChip}>
            <Feather name="star" size={14} color="#F59E0B" />
            <Text style={styles.pointsText}>{points} pts</Text>
          </View>
          <View style={styles.rankChip}>
            <Feather name="award" size={14} color={Colors.primary} />
            <Text style={styles.rankText}>Rank #{rank}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Dashboard</Text>
        {isLoading && !dashboard ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : isError && !dashboard ? (
          <View style={styles.centered}>
            <Feather name="wifi-off" size={36} color={Colors.border} />
            <Text style={styles.errorText}>Couldn't load your dashboard</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {!isOnline && dashboard && (
              <CachedDataBanner onRetry={refetch} />
            )}
            <View style={styles.statGrid}>
              <StatCard
                icon="video"
                label="Live Classes"
                value={dashboard?.upcomingLiveClasses ?? 0}
                color="#EF4444"
                bg="#FEF2F2"
                onPress={() => router.push("/(tabs)/learn")}
              />
              <StatCard
                icon="file-text"
                label="Homework"
                value={dashboard?.pendingHomework ?? 0}
                color="#F59E0B"
                bg="#FFFBEB"
                onPress={() => router.push("/(tabs)/learn")}
              />
              <StatCard
                icon="clipboard"
                label="Assignments"
                value={dashboard?.pendingAssignments ?? 0}
                color={Colors.primary}
                bg="#FFF4EE"
                onPress={() => router.push("/(tabs)/learn")}
              />
              <StatCard
                icon="check-square"
                label="Tests"
                value={dashboard?.upcomingTests ?? 0}
                color="#8B5CF6"
                bg="#F5F3FF"
                onPress={() => router.push("/(tabs)/learn")}
              />
            </View>
          </>
        )}
      </View>

      {(dashboard?.subjectProgress ?? []).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subject Progress</Text>
          <View style={styles.card}>
            {(dashboard?.subjectProgress ?? []).map((sp) => (
              <View key={sp.subjectId} style={styles.progressRow}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressSubject}>{sp.subjectName}</Text>
                  <Text style={styles.progressPct}>{Math.round(sp.progress)}%</Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, sp.progress)}%` as any, backgroundColor: sp.color || Colors.primary },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {(leaderboard ?? []).length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Learners</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/me")}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.podiumRow}>
            {(leaderboard ?? []).slice(0, 3).map((entry, i) => (
              <View
                key={entry.rank}
                style={[
                  styles.podiumCard,
                  {
                    backgroundColor: MEDAL_BG[i] ?? "#F9FAFB",
                    borderColor: MEDAL_BORDER[i] ?? Colors.border,
                    marginTop: i === 1 ? 0 : 16,
                  },
                ]}
              >
                <Text style={styles.podiumMedal}>{MEDAL[i]}</Text>
                <View style={styles.podiumAvatar}>
                  <Text style={styles.podiumAvatarText}>
                    {entry.studentName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{entry.studentName.split(" ")[0]}</Text>
                <Text style={styles.podiumPts}>{entry.points} pts</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {(dashboard?.recentActivity ?? []).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.card}>
            {(dashboard?.recentActivity ?? []).slice(0, 5).map((item) => (
              <View key={item.id} style={styles.activityRow}>
                <View style={[styles.activityIcon, { backgroundColor: "#FFF4EE" }]}>
                  <Feather name="activity" size={14} color={Colors.primary} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.activityMeta}>
                    {item.subjectName ?? "Braintam"} •{" "}
                    {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </Text>
                </View>
                {item.score != null && (
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{item.score}%</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  header: {
    backgroundColor: Colors.navy,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    marginBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  greeting: { fontSize: 14, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.7)" },
  name: { fontSize: 26, fontFamily: "Poppins_700Bold", color: "#fff", lineHeight: 32 },
  grade: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.6)", marginTop: 2 },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },
  pointsRow: { flexDirection: "row", gap: 10 },
  pointsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pointsText: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#fff" },
  rankChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,107,26,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rankText: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#fff" },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: Colors.navy, marginBottom: 12 },
  seeAll: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: Colors.primary },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statValue: { fontSize: 28, fontFamily: "Poppins_700Bold", color: Colors.navy, lineHeight: 32 },
  statLabel: { fontSize: 12, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground, marginTop: 2 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  progressRow: { gap: 6 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressSubject: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  progressPct: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: Colors.mutedForeground },
  progressBar: { height: 8, backgroundColor: Colors.background, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  podiumRow: { flexDirection: "row", gap: 10 },
  podiumCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  podiumMedal: { fontSize: 22 },
  podiumAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumAvatarText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },
  podiumName: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: Colors.navy, textAlign: "center" },
  podiumPts: { fontSize: 11, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  activityIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  activityMeta: { fontSize: 12, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground, marginTop: 2 },
  scoreBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreText: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  centered: { minHeight: 80, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  errorText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: "#fff", fontFamily: "Poppins_600SemiBold", fontSize: 14 },
});
