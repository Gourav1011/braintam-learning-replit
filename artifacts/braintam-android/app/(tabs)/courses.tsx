import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  useListCourses,
  useListSubjects,
  getListCoursesQueryKey,
} from "@workspace/api-client-react";
import type { Course, Subject } from "@workspace/api-client-react";
import { Colors } from "@/constants/colors";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { CachedDataBanner } from "@/components/CachedDataBanner";

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#6366F1",
  Science: "#10B981",
  English: "#F59E0B",
  History: "#EF4444",
  Geography: "#3B82F6",
  Physics: "#8B5CF6",
  Chemistry: "#EC4899",
  Biology: "#14B8A6",
  Hindi: "#F97316",
  "Social Science": "#84CC16",
};

function getSubjectColor(name: string, fallback: string) {
  return SUBJECT_COLORS[name] ?? fallback ?? Colors.navy;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather
          key={s}
          name="star"
          size={12}
          color={s <= Math.round(rating) ? "#F59E0B" : Colors.border}
        />
      ))}
      <Text style={styles.ratingNum}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function CourseCard({ course, onPress }: { course: Course; onPress: () => void }) {
  const color = getSubjectColor(course.subjectName, Colors.navy);
  const progress =
    course.completedLessons != null && course.totalLessons > 0
      ? (course.completedLessons / course.totalLessons) * 100
      : 0;

  return (
    <TouchableOpacity style={styles.courseCard} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.courseThumbnail, { backgroundColor: color + "22" }]}>
        <View style={[styles.courseIconCircle, { backgroundColor: color }]}>
          <Feather name="book-open" size={24} color="#fff" />
        </View>
        <View style={[styles.subjectBadge, { backgroundColor: color }]}>
          <Text style={styles.subjectBadgeText}>{course.subjectName}</Text>
        </View>
      </View>
      <View style={styles.courseInfo}>
        <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
        {course.teacher && (
          <View style={styles.teacherRow}>
            <Feather name="user" size={11} color={Colors.mutedForeground} />
            <Text style={styles.teacherText}>{course.teacher}</Text>
          </View>
        )}
        <View style={styles.courseMeta}>
          <View style={styles.metaChip}>
            <Feather name="layers" size={11} color={Colors.mutedForeground} />
            <Text style={styles.metaText}>{course.totalLessons} lessons</Text>
          </View>
          <View style={styles.metaChip}>
            <Feather name="award" size={11} color={Colors.mutedForeground} />
            <Text style={styles.metaText}>Gr. {course.grade}</Text>
          </View>
        </View>
        {course.rating && <StarRating rating={course.rating} />}
        {progress > 0 && (
          <View style={styles.progressWrap}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: color }]} />
            </View>
            <Text style={styles.progressLabel}>{Math.round(progress)}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function CoursesScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const { isOnline } = useNetworkStatus();

  const params = {
    subjectId,
    search: search.trim() || undefined,
  };

  const { data: courses, isLoading, isError, refetch } = useListCourses(params, {
    query: { queryKey: getListCoursesQueryKey(params) },
  });
  const { data: subjects } = useListSubjects();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Courses</Text>
        <Text style={styles.headerSub}>Explore all learning courses</Text>
      </View>

      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color={Colors.mutedForeground} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search courses…"
          placeholderTextColor={Colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        <TouchableOpacity
          style={[styles.chip, !subjectId && styles.chipActive]}
          onPress={() => setSubjectId(undefined)}
        >
          <Text style={[styles.chipText, !subjectId && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {(subjects ?? []).map((s: Subject) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.chip, subjectId === s.id && styles.chipActive]}
            onPress={async () => {
              if (Platform.OS !== "web") await Haptics.selectionAsync();
              setSubjectId(subjectId === s.id ? undefined : s.id);
            }}
          >
            <Text style={[styles.chipText, subjectId === s.id && styles.chipTextActive]}>
              {s.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading && !(courses ?? []).length ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : isError && !(courses ?? []).length ? (
        <View style={styles.centered}>
          <Feather name="wifi-off" size={40} color={Colors.border} />
          <Text style={styles.emptyTitle}>Couldn't load courses</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (courses ?? []).length === 0 ? (
        <View style={styles.centered}>
          <Feather name="book-open" size={40} color={Colors.border} />
          <Text style={styles.emptyTitle}>No courses found</Text>
          <Text style={styles.emptyDesc}>Try adjusting your filters</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => (
            <CourseCard
              course={item}
              onPress={() => router.push(`/course/${item.id}` as any)}
            />
          )}
          ListHeaderComponent={
            !isOnline ? <CachedDataBanner onRetry={refetch} /> : null
          }
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8, paddingTop: 8 },
  headerTitle: { fontSize: 26, fontFamily: "Poppins_700Bold", color: Colors.navy },
  headerSub: { fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground, marginTop: 2 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: Colors.text,
  },
  chipsScroll: { flexGrow: 0 },
  chipsRow: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  chipText: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: Colors.mutedForeground },
  chipTextActive: { color: "#fff" },
  list: { paddingHorizontal: 20, paddingTop: 4, gap: 14 },
  courseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  courseThumbnail: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  courseIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectBadge: {
    position: "absolute",
    top: 10,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  subjectBadgeText: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: "#fff" },
  courseInfo: { padding: 14, gap: 6 },
  courseTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: Colors.navy, lineHeight: 22 },
  teacherRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  teacherText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  courseMeta: { flexDirection: "row", gap: 12 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  starRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingNum: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#F59E0B", marginLeft: 4 },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressBar: { flex: 1, height: 6, backgroundColor: Colors.background, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: Colors.mutedForeground },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  emptyTitle: { fontSize: 18, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  emptyDesc: { fontSize: 14, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: "#fff", fontFamily: "Poppins_600SemiBold", fontSize: 14 },
});
