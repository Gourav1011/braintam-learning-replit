import { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Linking } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListLiveClasses,
  useListAnimatedVideos,
  useListHomework,
  useListAssignments,
  useListTests,
  useSubmitHomework,
  useSubmitAssignment,
  useJoinLiveClass,
  getListHomeworkQueryKey,
  getListAssignmentsQueryKey,
} from "@workspace/api-client-react";
import type { LiveClass, AnimatedVideo, Homework, Assignment, Test } from "@workspace/api-client-react";
import {
  scheduleClassNotification,
  cancelClassNotification,
  isClassNotificationScheduled,
} from "@/services/notifications";
import { addClassOptOut, removeClassOptOut, isClassOptedOut } from "@/services/notifOptOut";
import { Colors } from "@/constants/colors";

type LearnTab = "classes" | "videos" | "homework" | "tests";

function minutesUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}
function hoursUntilDue(iso: string) {
  return (new Date(iso).getTime() - Date.now()) / 3600000;
}
function formatDue(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
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

function UrgencyBadge({ hours }: { hours: number }) {
  if (hours < 0) return <View style={[styles.badge, { backgroundColor: "#FEE2E2" }]}><Text style={[styles.badgeText, { color: Colors.error }]}>Overdue</Text></View>;
  if (hours <= 24) return <View style={[styles.badge, { backgroundColor: "#FFF4EE" }]}><Text style={[styles.badgeText, { color: Colors.primary }]}>Due in {Math.round(hours)}h</Text></View>;
  if (hours <= 72) return <View style={[styles.badge, { backgroundColor: "#FFFBEB" }]}><Text style={[styles.badgeText, { color: Colors.warning }]}>{Math.round(hours / 24)}d left</Text></View>;
  return <View style={[styles.badge, { backgroundColor: "#EFF6FF" }]}><Text style={[styles.badgeText, { color: Colors.navy }]}>Upcoming</Text></View>;
}

function LiveClassesTab() {
  const { data: rawClasses, isLoading, isError, refetch } = useListLiveClasses();
  const [items, setItems] = useState<(LiveClass & { notifEnabled: boolean; notifPossible: boolean })[]>([]);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const joinMutation = useJoinLiveClass({
    mutation: {
      onSuccess: async (data) => {
        setJoiningId(null);
        if (data.joinUrl) {
          const ok = await Linking.canOpenURL(data.joinUrl);
          if (ok) {
            await Linking.openURL(data.joinUrl);
          } else {
            Alert.alert("Can't open link", data.joinUrl);
          }
        }
      },
      onError: () => {
        setJoiningId(null);
        Alert.alert("Error", "Could not get the class link. Try again.");
      },
    },
  });

  const handleJoin = useCallback((classId: number) => {
    setJoiningId(classId);
    joinMutation.mutate({ id: classId });
  }, [joinMutation]);

  useEffect(() => {
    if (!rawClasses) return;
    (async () => {
      const result = await Promise.all(
        rawClasses.map(async (c) => {
          const minsLeft = minutesUntil(c.scheduledAt);
          const notifPossible = minsLeft > 15 && c.status === "upcoming";
          let notifEnabled = false;
          if (notifPossible) {
            const [scheduled, optedOut] = await Promise.all([
              isClassNotificationScheduled(c.id),
              isClassOptedOut(c.id),
            ]);
            notifEnabled = scheduled && !optedOut;
          }
          return { ...c, notifEnabled, notifPossible };
        })
      );
      setItems(result);
    })();
  }, [rawClasses]);

  const toggleNotif = useCallback(async (item: (typeof items)[0]) => {
    if (Platform.OS !== "web") await Haptics.selectionAsync();
    if (item.notifEnabled) {
      await cancelClassNotification(item.id);
      await addClassOptOut(item.id);
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, notifEnabled: false } : i));
    } else {
      const ok = await scheduleClassNotification(item.id, item.title, new Date(item.scheduledAt));
      if (ok) {
        await removeClassOptOut(item.id);
        setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, notifEnabled: true } : i));
      } else {
        Alert.alert("Couldn't set reminder", "Enable notifications in device settings.");
      }
    }
  }, []);

  if (isLoading) return <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  if (isError) return (
    <View style={styles.centered}>
      <Feather name="wifi-off" size={36} color={Colors.border} />
      <Text style={styles.emptyTitle}>Couldn't load classes</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
    </View>
  );
  if (items.length === 0) return (
    <View style={styles.centered}>
      <Feather name="video" size={36} color={Colors.border} />
      <Text style={styles.emptyTitle}>No classes scheduled</Text>
      <Text style={styles.emptyDesc}>Check back later</Text>
    </View>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => String(i.id)}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tabList}
      onRefresh={refetch}
      refreshing={isLoading}
      renderItem={({ item }) => {
        const mins = minutesUntil(item.scheduledAt);
        return (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardSubject}>{item.subjectName}</Text>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.cardMeta}>
                  <Feather name="user" size={12} color={Colors.mutedForeground} />
                  <Text style={styles.cardMetaText}>{item.teacher}</Text>
                </View>
              </View>
              <StatusBadge minsUntil={mins} status={item.status} />
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardMeta}>
              <Feather name="clock" size={12} color={Colors.mutedForeground} />
              <Text style={styles.cardMetaText}>{formatTime(item.scheduledAt)}</Text>
            </View>
            {item.status === "live" || item.status === "upcoming" ? (
              <View style={styles.notifRow}>
                {item.notifPossible ? (
                  <>
                    <Feather name="bell" size={13} color={item.notifEnabled ? Colors.primary : Colors.mutedForeground} />
                    <Text style={[styles.notifLabel, item.notifEnabled && styles.notifLabelOn]}>
                      {item.notifEnabled ? "Reminder set" : "Remind me"}
                    </Text>
                    <Switch
                      value={item.notifEnabled}
                      onValueChange={() => toggleNotif(item)}
                      trackColor={{ false: Colors.border, true: "#FFD4B8" }}
                      thumbColor={item.notifEnabled ? Colors.primary : "#D1D5DB"}
                    />
                  </>
                ) : item.status === "live" ? (
                  <TouchableOpacity
                    style={styles.joinBtn}
                    activeOpacity={0.85}
                    disabled={joiningId === item.id}
                    onPress={() => handleJoin(item.id)}
                  >
                    {joiningId === item.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Feather name="play-circle" size={14} color="#fff" />}
                    <Text style={styles.joinBtnText}>
                      {joiningId === item.id ? "Joining…" : "Join Now"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

function VideosTab() {
  const { data: videos, isLoading, isError, refetch } = useListAnimatedVideos();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const subjects = useMemo(() => {
    if (!videos) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const v of videos) {
      if (v.subjectName && !seen.has(v.subjectName)) {
        seen.add(v.subjectName);
        result.push(v.subjectName);
      }
    }
    return result;
  }, [videos]);

  const filtered = useMemo(() => {
    if (!videos) return [];
    if (!selectedSubject) return videos;
    return videos.filter((v) => v.subjectName === selectedSubject);
  }, [videos, selectedSubject]);

  if (isLoading) return <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  if (isError) return (
    <View style={styles.centered}>
      <Feather name="wifi-off" size={36} color={Colors.border} />
      <Text style={styles.emptyTitle}>Couldn't load videos</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
    </View>
  );
  if ((videos ?? []).length === 0) return (
    <View style={styles.centered}>
      <Feather name="play-circle" size={36} color={Colors.border} />
      <Text style={styles.emptyTitle}>No videos yet</Text>
    </View>
  );

  return (
    <FlatList
      data={filtered}
      keyExtractor={(v) => String(v.id)}
      numColumns={2}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tabList}
      columnWrapperStyle={{ gap: 12 }}
      onRefresh={refetch}
      refreshing={isLoading}
      ListHeaderComponent={
        subjects.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}>
              <TouchableOpacity
                style={[styles.filterChip, !selectedSubject && styles.filterChipActive]}
                onPress={() => setSelectedSubject(null)}
              >
                <Text style={[styles.filterChipText, !selectedSubject && styles.filterChipTextActive]}>All</Text>
              </TouchableOpacity>
              {subjects.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterChip, selectedSubject === s && styles.filterChipActive]}
                  onPress={() => setSelectedSubject(s)}
                >
                  <Text style={[styles.filterChipText, selectedSubject === s && styles.filterChipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : null
      }
      renderItem={({ item }: { item: AnimatedVideo }) => (
        <TouchableOpacity
          style={styles.videoCard}
          activeOpacity={0.88}
          onPress={async () => {
            if (!item.videoUrl) return;
            const ok = await Linking.canOpenURL(item.videoUrl);
            if (ok) {
              Linking.openURL(item.videoUrl);
            } else {
              Alert.alert("Can't open video", "No app available to play this video.");
            }
          }}
        >
          <View style={styles.videoThumb}>
            <Feather name="play-circle" size={32} color="#fff" />
          </View>
          <View style={styles.videoInfo}>
            <Text style={styles.videoSubject}>{item.subjectName}</Text>
            <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.cardMeta}>
              <Feather name="clock" size={11} color={Colors.mutedForeground} />
              <Text style={styles.cardMetaText}>{Math.round(item.duration / 60)} min</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

function HomeworkTab() {
  const queryClient = useQueryClient();
  const [hwFilter, setHwFilter] = useState<"pending" | "submitted" | "all">("pending");
  const [assignFilter, setAssignFilter] = useState<"pending" | "submitted" | "all">("pending");
  const [activeSection, setActiveSection] = useState<"hw" | "assign">("hw");
  const [submitting, setSubmitting] = useState<{ type: "hw" | "assign"; id: number; title: string } | null>(null);
  const [answer, setAnswer] = useState("");

  const hwParams = hwFilter !== "all" ? { status: hwFilter as "pending" | "submitted" } : {};
  const assignParams = assignFilter !== "all" ? { status: assignFilter as "pending" | "submitted" } : {};

  const { data: homework, isLoading: hwLoading, refetch: hwRefetch } = useListHomework(hwParams, {
    query: { queryKey: getListHomeworkQueryKey(hwParams) },
  });
  const { data: assignments, isLoading: assignLoading, refetch: assignRefetch } = useListAssignments(assignParams, {
    query: { queryKey: getListAssignmentsQueryKey(assignParams) },
  });

  const hwMutation = useSubmitHomework({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHomeworkQueryKey(hwParams) });
        setSubmitting(null);
        setAnswer("");
        Alert.alert("Submitted!", "Your homework has been submitted.");
      },
      onError: () => Alert.alert("Error", "Could not submit. Try again."),
    },
  });

  const assignMutation = useSubmitAssignment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey(assignParams) });
        setSubmitting(null);
        setAnswer("");
        Alert.alert("Submitted!", "Your assignment has been submitted.");
      },
      onError: () => Alert.alert("Error", "Could not submit. Try again."),
    },
  });

  const handleSubmit = () => {
    if (!submitting || !answer.trim()) { Alert.alert("Required", "Please write your answer."); return; }
    if (submitting.type === "hw") {
      hwMutation.mutate({ id: submitting.id, data: { answer: answer.trim() } });
    } else {
      assignMutation.mutate({ id: submitting.id, data: { answer: answer.trim() } });
    }
  };

  return (
    <>
      <View style={styles.sectionTabs}>
        <TouchableOpacity
          style={[styles.sectionTab, activeSection === "hw" && styles.sectionTabActive]}
          onPress={() => setActiveSection("hw")}
        >
          <Text style={[styles.sectionTabText, activeSection === "hw" && styles.sectionTabTextActive]}>Homework</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sectionTab, activeSection === "assign" && styles.sectionTabActive]}
          onPress={() => setActiveSection("assign")}
        >
          <Text style={[styles.sectionTabText, activeSection === "assign" && styles.sectionTabTextActive]}>Assignments</Text>
        </TouchableOpacity>
      </View>

      {activeSection === "hw" ? (
        <>
          <View style={styles.filterRow}>
            {(["pending", "submitted", "all"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, hwFilter === f && styles.filterChipActive]}
                onPress={() => setHwFilter(f)}
              >
                <Text style={[styles.filterChipText, hwFilter === f && styles.filterChipTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {hwLoading ? (
            <View style={styles.centered}><ActivityIndicator color={Colors.primary} /></View>
          ) : (homework ?? []).length === 0 ? (
            <View style={styles.centered}>
              <Feather name="check-circle" size={36} color={Colors.success} />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptyDesc}>No {hwFilter} homework</Text>
            </View>
          ) : (
            <FlatList
              data={homework as Homework[]}
              keyExtractor={(h) => String(h.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.tabList}
              onRefresh={hwRefetch}
              refreshing={hwLoading}
              renderItem={({ item }) => {
                const hours = hoursUntilDue(item.dueDate);
                return (
                  <View style={styles.card}>
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardSubject}>{item.subjectName}</Text>
                        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                        {item.maxMarks != null && (
                          <View style={styles.cardMeta}>
                            <Feather name="award" size={12} color={Colors.mutedForeground} />
                            <Text style={styles.cardMetaText}>{item.maxMarks} marks</Text>
                          </View>
                        )}
                      </View>
                      {item.status === "pending" ? <UrgencyBadge hours={hours} /> : (
                        <View style={[styles.badge, { backgroundColor: "#DCFCE7" }]}>
                          <Text style={[styles.badgeText, { color: Colors.success }]}>{item.status}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardDivider} />
                    <View style={styles.cardMeta}>
                      <Feather name="calendar" size={12} color={Colors.mutedForeground} />
                      <Text style={styles.cardMetaText}>Due: {formatDue(item.dueDate)}</Text>
                    </View>
                    {item.status === "pending" && (
                      <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={() => { setSubmitting({ type: "hw", id: item.id, title: item.title }); setAnswer(""); }}
                      >
                        <Feather name="send" size={13} color="#fff" />
                        <Text style={styles.submitBtnText}>Submit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          )}
        </>
      ) : (
        <>
          <View style={styles.filterRow}>
            {(["pending", "submitted", "all"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, assignFilter === f && styles.filterChipActive]}
                onPress={() => setAssignFilter(f)}
              >
                <Text style={[styles.filterChipText, assignFilter === f && styles.filterChipTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {assignLoading ? (
            <View style={styles.centered}><ActivityIndicator color={Colors.primary} /></View>
          ) : (assignments ?? []).length === 0 ? (
            <View style={styles.centered}>
              <Feather name="check-circle" size={36} color={Colors.success} />
              <Text style={styles.emptyTitle}>All done!</Text>
              <Text style={styles.emptyDesc}>No {assignFilter} assignments</Text>
            </View>
          ) : (
            <FlatList
              data={assignments as Assignment[]}
              keyExtractor={(a) => String(a.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.tabList}
              onRefresh={assignRefetch}
              refreshing={assignLoading}
              renderItem={({ item }) => {
                const hours = hoursUntilDue(item.dueDate);
                return (
                  <View style={styles.card}>
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardSubject}>{item.subjectName}</Text>
                        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                        <View style={styles.cardMeta}>
                          <Feather name="award" size={12} color={Colors.mutedForeground} />
                          <Text style={styles.cardMetaText}>{item.maxMarks} marks</Text>
                        </View>
                      </View>
                      {item.status === "pending" ? <UrgencyBadge hours={hours} /> : (
                        <View style={[styles.badge, { backgroundColor: "#DCFCE7" }]}>
                          <Text style={[styles.badgeText, { color: Colors.success }]}>{item.status}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardDivider} />
                    <View style={styles.cardMeta}>
                      <Feather name="calendar" size={12} color={Colors.mutedForeground} />
                      <Text style={styles.cardMetaText}>Due: {formatDue(item.dueDate)}</Text>
                    </View>
                    {item.description ? (
                      <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
                    ) : null}
                    {item.status === "pending" && (
                      <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={() => { setSubmitting({ type: "assign", id: item.id, title: item.title }); setAnswer(""); }}
                      >
                        <Feather name="send" size={13} color="#fff" />
                        <Text style={styles.submitBtnText}>Submit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          )}
        </>
      )}

      <Modal visible={!!submitting} transparent animationType="slide" onRequestClose={() => setSubmitting(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSubmitting(null)} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Submit {submitting?.type === "hw" ? "Homework" : "Assignment"}</Text>
            <Text style={styles.modalSubtitle} numberOfLines={2}>{submitting?.title}</Text>
            <TextInput
              style={styles.answerInput}
              placeholder="Write your answer here…"
              placeholderTextColor={Colors.mutedForeground}
              value={answer}
              onChangeText={setAnswer}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSubmitting(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, (hwMutation.isPending || assignMutation.isPending) && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={hwMutation.isPending || assignMutation.isPending}
              >
                {hwMutation.isPending || assignMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function TestsTab() {
  const { data: tests, isLoading, isError, refetch } = useListTests();
  if (isLoading) return <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  if (isError) return (
    <View style={styles.centered}>
      <Feather name="wifi-off" size={36} color={Colors.border} />
      <Text style={styles.emptyTitle}>Couldn't load tests</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
    </View>
  );
  if ((tests ?? []).length === 0) return (
    <View style={styles.centered}>
      <Feather name="check-square" size={36} color={Colors.border} />
      <Text style={styles.emptyTitle}>No tests yet</Text>
    </View>
  );

  return (
    <FlatList
      data={tests as Test[]}
      keyExtractor={(t) => String(t.id)}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tabList}
      onRefresh={refetch}
      refreshing={isLoading}
      renderItem={({ item }) => {
        const statusColors: Record<string, { bg: string; text: string }> = {
          upcoming: { bg: "#EFF6FF", text: Colors.navy },
          ongoing: { bg: "#DCFCE7", text: Colors.success },
          completed: { bg: "#F3F4F6", text: Colors.mutedForeground },
        };
        const sc = statusColors[item.status] ?? statusColors.upcoming;
        return (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardSubject}>{item.subjectName}</Text>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.metaRowWrap}>
                  <View style={styles.cardMeta}>
                    <Feather name="help-circle" size={12} color={Colors.mutedForeground} />
                    <Text style={styles.cardMetaText}>{item.totalQuestions} questions</Text>
                  </View>
                  <View style={styles.cardMeta}>
                    <Feather name="clock" size={12} color={Colors.mutedForeground} />
                    <Text style={styles.cardMetaText}>{item.duration} min</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
              </View>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.testCardBottom}>
              <View style={styles.cardMeta}>
                <Feather name="calendar" size={12} color={Colors.mutedForeground} />
                <Text style={styles.cardMetaText}>{formatTime(item.scheduledAt)}</Text>
              </View>
              {item.status === "completed" && item.score != null ? (
                <View style={[styles.badge, { backgroundColor: "#EFF6FF" }]}>
                  <Text style={[styles.badgeText, { color: Colors.navy }]}>
                    {item.score}/{item.maxScore ?? "?"}
                  </Text>
                </View>
              ) : item.status !== "completed" ? (
                <TouchableOpacity
                  style={styles.takeTestBtn}
                  onPress={() => router.push(`/test/${item.id}` as any)}
                >
                  <Feather name="play" size={12} color="#fff" />
                  <Text style={styles.takeTestText}>Start Test</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      }}
    />
  );
}

const TABS: { id: LearnTab; label: string; icon: any }[] = [
  { id: "classes", label: "Live Classes", icon: "video" },
  { id: "videos", label: "Videos", icon: "play-circle" },
  { id: "homework", label: "Work", icon: "file-text" },
  { id: "tests", label: "Tests", icon: "check-square" },
];

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<LearnTab>("classes");

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Learn</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
        style={styles.tabsScroll}
      >
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.learnTab, activeTab === t.id && styles.learnTabActive]}
            onPress={async () => {
              if (Platform.OS !== "web") await Haptics.selectionAsync();
              setActiveTab(t.id);
            }}
          >
            <Feather
              name={t.icon}
              size={15}
              color={activeTab === t.id ? Colors.navy : Colors.mutedForeground}
            />
            <Text style={[styles.learnTabText, activeTab === t.id && styles.learnTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.flex}>
        {activeTab === "classes" && <LiveClassesTab />}
        {activeTab === "videos" && <VideosTab />}
        {activeTab === "homework" && <HomeworkTab />}
        {activeTab === "tests" && <TestsTab />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8, paddingTop: 8 },
  headerTitle: { fontSize: 26, fontFamily: "Poppins_700Bold", color: Colors.navy },
  tabsScroll: { flexGrow: 0 },
  tabsRow: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
  learnTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  learnTabActive: { backgroundColor: "#EFF6FF", borderColor: Colors.navy },
  learnTabText: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: Colors.mutedForeground },
  learnTabTextActive: { color: Colors.navy },
  tabList: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardSubject: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: Colors.primary, textTransform: "uppercase", letterSpacing: 0.5 },
  cardTitle: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: Colors.navy, marginTop: 2, lineHeight: 21 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  cardMetaText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  metaRowWrap: { flexDirection: "row", gap: 12 },
  cardDivider: { height: 1, backgroundColor: Colors.border },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4 },
  badgeText: { fontSize: 11, fontFamily: "Poppins_600SemiBold" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  notifRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  notifLabel: { flex: 1, fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  notifLabelOn: { color: Colors.primary, fontFamily: "Poppins_600SemiBold" },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.success,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  joinBtnText: { color: "#fff", fontSize: 13, fontFamily: "Poppins_700Bold" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
  },
  submitBtnText: { color: "#fff", fontSize: 13, fontFamily: "Poppins_700Bold" },
  testCardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  takeTestBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.navy,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  takeTestText: { color: "#fff", fontSize: 12, fontFamily: "Poppins_700Bold" },
  videoCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  videoThumb: {
    height: 90,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  videoInfo: { padding: 10, gap: 4 },
  videoSubject: { fontSize: 10, fontFamily: "Poppins_600SemiBold", color: Colors.primary, textTransform: "uppercase", letterSpacing: 0.4 },
  videoTitle: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: Colors.navy, lineHeight: 17 },
  sectionTabs: { flexDirection: "row", marginHorizontal: 20, marginBottom: 10, backgroundColor: Colors.background, borderRadius: 12, padding: 4 },
  sectionTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  sectionTabActive: { backgroundColor: Colors.navy },
  sectionTabText: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: Colors.mutedForeground },
  sectionTabTextActive: { color: "#fff" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  filterChipText: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: Colors.mutedForeground },
  filterChipTextActive: { color: "#fff" },
  descText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalWrap: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalCard: { padding: 24, gap: 14 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: Colors.navy },
  modalSubtitle: { fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  answerInput: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: Colors.text,
    minHeight: 120,
  },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  modalCancelText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: Colors.muted },
  modalSubmit: { flex: 1, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  modalSubmitText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#fff" },
  btnDisabled: { opacity: 0.7 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  emptyTitle: { fontSize: 18, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  emptyDesc: { fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: "#fff", fontFamily: "Poppins_600SemiBold", fontSize: 14 },
});
