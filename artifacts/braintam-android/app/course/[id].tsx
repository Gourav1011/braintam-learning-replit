import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGetCourse, getGetCourseQueryKey } from "@workspace/api-client-react";
import { Colors } from "@/constants/colors";

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const courseId = Number(id);

  const { data: course, isLoading, isError, refetch } = useGetCourse(courseId, {
    query: { enabled: !!courseId, queryKey: getGetCourseQueryKey(courseId) },
  });

  const completedCount = course?.lessons?.filter((l) => l.completed).length ?? 0;
  const totalCount = course?.lessons?.length ?? 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>
      </View>
    );
  }

  if (isError || !course) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Feather name="wifi-off" size={36} color={Colors.border} />
          <Text style={styles.emptyTitle}>Couldn't load course</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>{course.title}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={styles.heroBand}>
          <View style={styles.heroIcon}>
            <Feather name="book-open" size={40} color="#fff" />
          </View>
          <View style={styles.heroBadges}>
            <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{course.subjectName}</Text></View>
            <View style={[styles.heroBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Text style={styles.heroBadgeText}>Grade {course.grade}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{course.title}</Text>
          {course.teacher && (
            <View style={styles.teacherRow}>
              <Feather name="user" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.teacherText}>by {course.teacher}</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.statsRow}>
            <View style={styles.statsCard}>
              <Feather name="layers" size={20} color={Colors.primary} />
              <Text style={styles.statsValue}>{totalCount}</Text>
              <Text style={styles.statsLabel}>Lessons</Text>
            </View>
            {course.rating && (
              <View style={styles.statsCard}>
                <Feather name="star" size={20} color="#F59E0B" />
                <Text style={styles.statsValue}>{course.rating.toFixed(1)}</Text>
                <Text style={styles.statsLabel}>Rating</Text>
              </View>
            )}
            <View style={styles.statsCard}>
              <Feather name="check-circle" size={20} color={Colors.success} />
              <Text style={styles.statsValue}>{completedCount}</Text>
              <Text style={styles.statsLabel}>Done</Text>
            </View>
          </View>

          {progress > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
              </View>
            </View>
          )}

          {course.description && (
            <View style={styles.descCard}>
              <Text style={styles.descTitle}>About this course</Text>
              <Text style={styles.descText}>{course.description}</Text>
            </View>
          )}

          <Text style={styles.lessonsTitle}>Course Lessons ({totalCount})</Text>

          {(course.lessons ?? []).map((lesson, i) => (
            <View
              key={lesson.id}
              style={[styles.lessonCard, lesson.completed && styles.lessonCardDone]}
            >
              <View style={[styles.lessonNum, lesson.completed ? styles.lessonNumDone : styles.lessonNumPending]}>
                {lesson.completed ? (
                  <Feather name="check" size={14} color="#fff" />
                ) : lesson.videoUrl ? (
                  <Feather name="play" size={14} color={Colors.navy} />
                ) : (
                  <Text style={styles.lessonNumText}>{i + 1}</Text>
                )}
              </View>
              <View style={styles.lessonInfo}>
                <Text style={[styles.lessonTitle, lesson.completed && styles.lessonTitleDone]} numberOfLines={2}>
                  {lesson.title}
                </Text>
                <View style={styles.lessonMeta}>
                  <Feather name="clock" size={11} color={Colors.mutedForeground} />
                  <Text style={styles.lessonMetaText}>{lesson.duration} min</Text>
                </View>
              </View>
              {lesson.completed && (
                <View style={styles.doneChip}>
                  <Text style={styles.doneChipText}>Done</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.navy,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: { flex: 1, fontSize: 17, fontFamily: "Poppins_600SemiBold", color: "#fff" },
  heroBand: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: "flex-start",
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroBadges: { flexDirection: "row", gap: 8 },
  heroBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  heroBadgeText: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#fff" },
  heroTitle: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#fff", lineHeight: 28 },
  teacherRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  teacherText: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.8)" },
  body: { padding: 20, gap: 18 },
  statsRow: { flexDirection: "row", gap: 12 },
  statsCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statsValue: { fontSize: 20, fontFamily: "Poppins_700Bold", color: Colors.navy },
  statsLabel: { fontSize: 11, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  progressSection: { gap: 8 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  progressPct: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: Colors.primary },
  progressBar: { height: 10, backgroundColor: Colors.border, borderRadius: 5, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: Colors.primary, borderRadius: 5 },
  descCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  descTitle: { fontSize: 15, fontFamily: "Poppins_700Bold", color: Colors.navy },
  descText: { fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.muted, lineHeight: 20 },
  lessonsTitle: { fontSize: 17, fontFamily: "Poppins_700Bold", color: Colors.navy },
  lessonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  lessonCardDone: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  lessonNum: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  lessonNumDone: { backgroundColor: Colors.success },
  lessonNumPending: { backgroundColor: "#EFF6FF" },
  lessonNumText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: Colors.navy },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: Colors.navy, lineHeight: 20 },
  lessonTitleDone: { color: Colors.success },
  lessonMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  lessonMetaText: { fontSize: 11, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  doneChip: { backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  doneChipText: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: Colors.success },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  emptyTitle: { fontSize: 18, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: "#fff", fontFamily: "Poppins_600SemiBold", fontSize: 14 },
});
