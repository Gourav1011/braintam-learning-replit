import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useListHomework, useSubmitHomework } from "@workspace/api-client-react";
import type { Homework } from "@workspace/api-client-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { CachedDataBanner } from "@/components/CachedDataBanner";
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

// ── Types ───────────────────────────────────────────────────────────────────
type HWItem = {
  id: number;
  title: string;
  subjectName: string;
  dueDate: string;
  maxMarks: number | null | undefined;
  status: string;
  homeworkType: string | null | undefined;
  questionsJson: string | null | undefined;
  notifEnabled: boolean;
  notifPossible: boolean;
};

type ParsedQuestion = { text: string; options: string[]; correctOption: number };

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseQuestions(json?: string | null): ParsedQuestion[] {
  if (!json) return [];
  try { return JSON.parse(json) as ParsedQuestion[]; } catch { return []; }
}

function hoursUntilDue(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3600000;
}
function formatDue(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// ── Sub-components ───────────────────────────────────────────────────────────
function UrgencyBadge({ hours }: { hours: number }) {
  if (hours < 0) return (
    <View style={[styles.badge, { backgroundColor: "#FEE2E2" }]}>
      <Text style={[styles.badgeText, { color: Colors.error }]}>Overdue</Text>
    </View>
  );
  if (hours <= 24) return (
    <View style={[styles.badge, { backgroundColor: "#FFF4EE" }]}>
      <Feather name="alert-triangle" size={10} color={Colors.primary} />
      <Text style={[styles.badgeText, { color: Colors.primary }]}>Due in {Math.round(hours)}h</Text>
    </View>
  );
  if (hours <= 72) return (
    <View style={[styles.badge, { backgroundColor: "#FFFBEB" }]}>
      <Text style={[styles.badgeText, { color: Colors.warning }]}>{Math.round(hours / 24)}d left</Text>
    </View>
  );
  return (
    <View style={[styles.badge, { backgroundColor: "#EFF6FF" }]}>
      <Text style={[styles.badgeText, { color: Colors.navy }]}>Upcoming</Text>
    </View>
  );
}

// ── MCQ Homework Modal ────────────────────────────────────────────────────────
function McqHomeworkModal({
  homework,
  onClose,
  onSubmit,
  submitting,
}: {
  homework: HWItem;
  onClose: () => void;
  onSubmit: (answer: string) => void;
  submitting: boolean;
}) {
  const insets = useSafeAreaInsets();
  const questions = parseQuestions(homework.questionsJson);
  const [currentQ, setCurrentQ] = useState(0);
  // answers[questionIndex] = selected option index
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const answered = Object.keys(answers).length;
  const question = questions[currentQ];

  function selectOption(optIdx: number) {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setAnswers(prev => ({ ...prev, [currentQ]: optIdx }));
  }

  function handleSubmit() {
    // Build answer array: one entry per question (undefined → -1 for unanswered)
    const answerArray = questions.map((_, i) => answers[i] ?? -1);
    onSubmit(JSON.stringify(answerArray));
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.quizContainer, { paddingTop: insets.top }]}>
        {/* Top bar */}
        <View style={styles.quizTopBar}>
          <TouchableOpacity style={styles.quizBackBtn} onPress={onClose}>
            <Feather name="x" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.quizTopTitle} numberOfLines={1}>{homework.title}</Text>
            <Text style={styles.quizTopSub}>{homework.subjectName} · {homework.maxMarks ?? "?"} marks</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.quizProgress}>
          <View style={styles.quizProgressMeta}>
            <Text style={styles.quizProgressLabel}>Q {currentQ + 1} / {questions.length}</Text>
            <Text style={styles.quizProgressLabel}>{answered} answered</Text>
          </View>
          <View style={styles.quizProgressBar}>
            <View style={[styles.quizProgressFill, { width: `${(answered / questions.length) * 100}%` as any }]} />
          </View>
        </View>

        {/* Question + options */}
        {question && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.quizQuestionArea} showsVerticalScrollIndicator={false}>
            <View style={styles.quizQuestionCard}>
              <Text style={styles.quizQuestionNum}>Question {currentQ + 1}</Text>
              <Text style={styles.quizQuestionText}>{question.text}</Text>
            </View>

            <View style={styles.quizOptionsWrap}>
              {question.options.map((opt, idx) => {
                const selected = answers[currentQ] === idx;
                return (
                  <TouchableOpacity key={idx} style={[styles.quizOption, selected && styles.quizOptionSelected]}
                    onPress={() => selectOption(idx)} activeOpacity={0.85}>
                    <View style={[styles.quizOptionLetter, selected && styles.quizOptionLetterSelected]}>
                      <Text style={[styles.quizOptionLetterText, selected && { color: "#fff" }]}>
                        {String.fromCharCode(65 + idx)}
                      </Text>
                    </View>
                    <Text style={[styles.quizOptionText, selected && styles.quizOptionTextSelected]}>{opt}</Text>
                    {selected && <Feather name="check-circle" size={18} color={Colors.navy} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Bottom nav: Prev · dots · Next/Submit */}
        <View style={[styles.quizNavBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.quizNavBtn, currentQ === 0 && styles.quizNavBtnDisabled]}
            onPress={() => setCurrentQ(q => Math.max(0, q - 1))}
            disabled={currentQ === 0}
          >
            <Feather name="chevron-left" size={22} color={currentQ === 0 ? Colors.border : Colors.navy} />
            <Text style={[styles.quizNavBtnText, currentQ === 0 && styles.quizNavBtnTextDisabled]}>Prev</Text>
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quizDots}>
            {questions.map((_, i) => (
              <TouchableOpacity key={i}
                style={[styles.quizDot, i === currentQ && styles.quizDotActive, answers[i] !== undefined && styles.quizDotAnswered]}
                onPress={() => setCurrentQ(i)}>
                <Text style={[styles.quizDotText, i === currentQ && styles.quizDotTextActive]}>{i + 1}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {currentQ < questions.length - 1 ? (
            <TouchableOpacity style={styles.quizNavBtn} onPress={() => setCurrentQ(q => q + 1)}>
              <Text style={styles.quizNavBtnText}>Next</Text>
              <Feather name="chevron-right" size={22} color={Colors.navy} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.quizSubmitBtn, submitting && { opacity: 0.7 }]}
              onPress={() => setShowConfirm(true)} disabled={submitting}>
              <Text style={styles.quizSubmitBtnText}>Submit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Confirm dialog */}
        <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <Feather name="help-circle" size={36} color={Colors.navy} />
              <Text style={styles.confirmTitle}>Submit Homework?</Text>
              <Text style={styles.confirmDesc}>
                {answered}/{questions.length} answered.{answered < questions.length ? ` ${questions.length - answered} unanswered!` : " All done!"}
              </Text>
              <View style={styles.confirmRow}>
                <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowConfirm(false)}>
                  <Text style={styles.confirmCancelText}>Review</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmSubmit, submitting && { opacity: 0.7 }]}
                  onPress={handleSubmit} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmSubmitText}>Submit ✓</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

// ── Writing Homework Modal ────────────────────────────────────────────────────
function WritingHomeworkModal({
  homework,
  onClose,
  onSubmit,
  submitting,
}: {
  homework: HWItem;
  onClose: () => void;
  onSubmit: (answer: string) => void;
  submitting: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [answer, setAnswer] = useState("");

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={[styles.writingHeader, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onClose} style={styles.writingCloseBtn}>
            <Feather name="x" size={20} color={Colors.navy} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.writingTitle} numberOfLines={2}>{homework.title}</Text>
            <Text style={styles.writingSub}>{homework.subjectName} · {homework.maxMarks ?? "?"} marks</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.writingContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.writingPrompt}>Write your answer below:</Text>
          <TextInput
            style={styles.writingInput}
            placeholder="Type your answer here…"
            placeholderTextColor={Colors.mutedForeground}
            value={answer}
            onChangeText={setAnswer}
            multiline
            textAlignVertical="top"
            autoFocus
          />
        </ScrollView>

        {/* Large submit button fixed at center bottom */}
        <View style={[styles.writingBottom, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.writingCancelBtn]}
            onPress={onClose}
          >
            <Text style={styles.writingCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.writingSubmitBtn, (!answer.trim() || submitting) && { opacity: 0.5 }]}
            onPress={() => {
              if (!answer.trim()) { Alert.alert("Required", "Please write your answer."); return; }
              onSubmit(answer.trim());
            }}
            disabled={!answer.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="send" size={18} color="#fff" />
                <Text style={styles.writingSubmitText}>Submit Answer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HomeworkScreen() {
  const insets = useSafeAreaInsets();
  const { data: rawHW, isLoading, isError, refetch } = useListHomework();
  const { isOnline } = useNetworkStatus();
  const [items, setItems] = useState<HWItem[]>([]);
  const [permGranted, setPermGranted] = useState(true);
  const [activeHw, setActiveHw] = useState<HWItem | null>(null);

  const submitMutation = useSubmitHomework({
    mutation: {
      onSuccess: () => {
        setActiveHw(null);
        Alert.alert("Submitted! 🎉", "Your homework has been submitted.");
        refetch();
      },
      onError: () => Alert.alert("Error", "Could not submit. Please try again."),
    },
  });

  useEffect(() => {
    getNotificationPermissionStatus().then((s) => setPermGranted(s === "granted"));
  }, []);

  useEffect(() => {
    if (!rawHW) return;
    const build = async () => {
      const result: HWItem[] = await Promise.all(
        rawHW.map(async (h: Homework) => {
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
            homeworkType: h.homeworkType,
            questionsJson: h.questionsJson,
            notifEnabled,
            notifPossible,
          };
        })
      );
      setItems(result);
    };
    build();
  }, [rawHW]);

  const toggleNotification = useCallback(async (item: HWItem) => {
    if (Platform.OS !== "web") await Haptics.selectionAsync();
    if (item.notifEnabled) {
      await cancelHomeworkNotification(item.id);
      await addHomeworkOptOut(item.id);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, notifEnabled: false } : i));
    } else {
      const scheduled = await scheduleHomeworkNotification(item.id, item.title, new Date(item.dueDate));
      if (scheduled) {
        await removeHomeworkOptOut(item.id);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, notifEnabled: true } : i));
      } else {
        Alert.alert("Couldn't set reminder", "Please enable notifications for Braintam in your device settings.", [{ text: "OK" }]);
      }
    }
  }, []);

  function handleSubmit(answer: string) {
    if (!activeHw) return;
    submitMutation.mutate({ id: activeHw.id, data: { answer } });
  }

  const renderItem = ({ item }: { item: HWItem }) => {
    const hours = hoursUntilDue(item.dueDate);
    const isMcq = !!(item.questionsJson && parseQuestions(item.questionsJson).length > 0);
    const questionCount = isMcq ? parseQuestions(item.questionsJson).length : 0;
    const isOverdue = item.status === "pending" && hours < 0;

    return (
      <View style={[styles.card, isOverdue && styles.cardOverdue]}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={[styles.subject, isOverdue && styles.textMuted]}>{item.subjectName}</Text>
            <Text style={[styles.hwTitle, isOverdue && styles.textMuted]} numberOfLines={2}>{item.title}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.marks, isOverdue && styles.textMuted]}>
                <Feather name="award" size={12} color={isOverdue ? Colors.border : Colors.muted} /> {item.maxMarks ?? "—"} marks
              </Text>
              {isMcq && !isOverdue && (
                <View style={styles.mcqBadge}>
                  <Feather name="list" size={10} color={Colors.primary} />
                  <Text style={styles.mcqBadgeText}>{questionCount} MCQ</Text>
                </View>
              )}
            </View>
          </View>
          {isOverdue ? (
            <View style={[styles.badge, { backgroundColor: "#F3F4F6" }]}>
              <Feather name="lock" size={10} color={Colors.border} />
              <Text style={[styles.badgeText, { color: Colors.mutedForeground }]}>Closed</Text>
            </View>
          ) : (
            <UrgencyBadge hours={hours} />
          )}
        </View>

        <View style={styles.cardMid}>
          <Feather name="calendar" size={13} color={isOverdue ? Colors.border : Colors.mutedForeground} />
          <Text style={[styles.dueText, isOverdue && styles.textMuted]}>Due: {formatDue(item.dueDate)}</Text>
        </View>

        {item.status === "pending" && !isOverdue && (
          <TouchableOpacity
            style={styles.submitCardBtn}
            onPress={async () => {
              if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveHw(item);
            }}
            activeOpacity={0.85}
          >
            <Feather name={isMcq ? "list" : "edit-3"} size={16} color="#fff" />
            <Text style={styles.submitCardBtnText}>
              {isMcq ? `Start Quiz (${questionCount} questions)` : "Submit Answer"}
            </Text>
          </TouchableOpacity>
        )}

        {isOverdue && (
          <View style={styles.closedRow}>
            <Feather name="lock" size={13} color={Colors.border} />
            <Text style={styles.closedText}>Due date passed — submission closed</Text>
          </View>
        )}

        {item.status !== "pending" && (
          <View style={styles.submittedRow}>
            <Feather name="check-circle" size={14} color={Colors.success} />
            <Text style={styles.submittedText}>Submitted</Text>
          </View>
        )}

        {item.notifPossible ? (
          <View style={styles.notifRow}>
            <Feather name="bell" size={14} color={item.notifEnabled ? Colors.navy : Colors.mutedForeground} />
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

      {isLoading && !items.length ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.navy} size="large" />
          <Text style={styles.loadingText}>Loading homework…</Text>
        </View>
      ) : isError && !items.length ? (
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
          ListHeaderComponent={!isOnline ? <CachedDataBanner onRetry={refetch} /> : null}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && !!items.length}
              onRefresh={refetch}
              tintColor="#FF6B1A"
              colors={["#FF6B1A", "#0B2B6B"]}
              progressBackgroundColor="#fff"
            />
          }
        />
      )}

      {/* MCQ or Writing submission modal */}
      {activeHw && (() => {
        const isMcq = !!(activeHw.questionsJson && parseQuestions(activeHw.questionsJson).length > 0);
        return isMcq ? (
          <McqHomeworkModal
            homework={activeHw}
            onClose={() => setActiveHw(null)}
            onSubmit={handleSubmit}
            submitting={submitMutation.isPending}
          />
        ) : (
          <WritingHomeworkModal
            homework={activeHw}
            onClose={() => setActiveHw(null)}
            onSubmit={handleSubmit}
            submitting={submitMutation.isPending}
          />
        );
      })()}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 },
  headerTitle: { fontSize: 26, fontFamily: "Poppins_700Bold", color: Colors.navy },
  permBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFFBEB", borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 8, marginTop: 8, borderWidth: 1, borderColor: "#FDE68A",
  },
  permText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: Colors.muted, flex: 1 },
  list: { paddingHorizontal: 20, paddingTop: 8 },

  // Card
  card: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 16,
    marginBottom: 14, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  cardInfo: { flex: 1, paddingRight: 10, gap: 3 },
  subject: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: Colors.primary, letterSpacing: 0.5, textTransform: "uppercase" },
  hwTitle: { fontSize: 16, fontFamily: "Poppins_600SemiBold", color: Colors.navy, lineHeight: 22 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  marks: { fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.muted },
  mcqBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF4EE", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  mcqBadgeText: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: Colors.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4 },
  badgeText: { fontSize: 11, fontFamily: "Poppins_600SemiBold" },
  cardMid: { flexDirection: "row", alignItems: "center", gap: 6 },
  dueText: { fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.muted },

  // Submit button on card — large, full-width, center
  submitCardBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 13, gap: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  submitCardBtnText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#fff" },
  submittedRow: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  submittedText: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: Colors.success },
  cardOverdue: { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", opacity: 0.75 },
  textMuted: { color: Colors.mutedForeground },
  closedRow: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 4 },
  closedText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  notifRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  notifLabel: { flex: 1, fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  notifLabelActive: { color: Colors.navy, fontFamily: "Poppins_600SemiBold" },
  notifUnavailable: { flex: 1, fontSize: 12, fontFamily: "Poppins_400Regular", color: Colors.border },

  // MCQ quiz modal
  quizContainer: { flex: 1, backgroundColor: Colors.background },
  quizTopBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.navy,
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  quizBackBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  quizTopTitle: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#fff" },
  quizTopSub: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.65)" },
  quizProgress: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, gap: 6 },
  quizProgressMeta: { flexDirection: "row", justifyContent: "space-between" },
  quizProgressLabel: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: Colors.mutedForeground },
  quizProgressBar: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden" },
  quizProgressFill: { height: "100%", backgroundColor: Colors.primary, borderRadius: 4 },
  quizQuestionArea: { padding: 20, gap: 16, paddingBottom: 12 },
  quizQuestionCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 20, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  quizQuestionNum: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: Colors.primary, textTransform: "uppercase", letterSpacing: 0.5 },
  quizQuestionText: { fontSize: 16, fontFamily: "Poppins_600SemiBold", color: Colors.navy, lineHeight: 24 },
  quizOptionsWrap: { gap: 10 },
  quizOption: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14, gap: 12, borderWidth: 1.5, borderColor: Colors.border,
  },
  quizOptionSelected: { borderColor: Colors.navy, backgroundColor: "#EFF6FF" },
  quizOptionLetter: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  quizOptionLetterSelected: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  quizOptionLetterText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: Colors.navy },
  quizOptionText: { flex: 1, fontSize: 14, fontFamily: "Poppins_400Regular", color: Colors.navy, lineHeight: 20 },
  quizOptionTextSelected: { fontFamily: "Poppins_600SemiBold" },

  // Bottom nav bar
  quizNavBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: 16, paddingTop: 12, gap: 8,
  },
  quizNavBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8 },
  quizNavBtnDisabled: {},
  quizNavBtnText: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  quizNavBtnTextDisabled: { color: Colors.border },
  quizDots: { alignItems: "center", gap: 6, paddingHorizontal: 4 },
  quizDot: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },
  quizDotActive: { borderColor: Colors.navy, backgroundColor: Colors.navy },
  quizDotAnswered: { borderColor: Colors.primary, backgroundColor: "#FFF4EE" },
  quizDotText: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: Colors.mutedForeground },
  quizDotTextActive: { color: "#fff" },
  quizSubmitBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  quizSubmitBtnText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },

  // Confirm dialog
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmCard: { backgroundColor: Colors.surface, borderRadius: 24, padding: 28, alignItems: "center", gap: 14, width: "100%" },
  confirmTitle: { fontSize: 22, fontFamily: "Poppins_700Bold", color: Colors.navy },
  confirmDesc: { fontSize: 14, fontFamily: "Poppins_400Regular", color: Colors.muted, textAlign: "center", lineHeight: 22 },
  confirmRow: { flexDirection: "row", gap: 10, width: "100%" },
  confirmCancel: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  confirmCancelText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: Colors.muted },
  confirmSubmit: { flex: 1, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  confirmSubmitText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#fff" },

  // Writing modal
  writingHeader: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  writingCloseBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background,
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  writingTitle: { fontSize: 17, fontFamily: "Poppins_700Bold", color: Colors.navy, lineHeight: 24 },
  writingSub: { fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground, marginTop: 2 },
  writingContent: { padding: 20, gap: 14, flexGrow: 1 },
  writingPrompt: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  writingInput: {
    backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1.5,
    borderColor: Colors.border, padding: 16, fontSize: 15,
    fontFamily: "Poppins_400Regular", color: Colors.text,
    minHeight: 200, textAlignVertical: "top",
  },
  // Large centered submit at bottom
  writingBottom: {
    paddingHorizontal: 20, paddingTop: 14, gap: 10,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  writingSubmitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, gap: 10,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  writingSubmitText: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#fff" },
  writingCancelBtn: {
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, paddingVertical: 12,
  },
  writingCancelText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: Colors.muted },

  // Misc
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  loadingText: { fontSize: 14, fontFamily: "Poppins_400Regular", color: Colors.muted },
  emptyTitle: { fontSize: 18, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  emptyDesc: { fontSize: 14, fontFamily: "Poppins_400Regular", color: Colors.muted, textAlign: "center" },
  retryBtn: { backgroundColor: Colors.navy, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: "#FFF", fontFamily: "Poppins_600SemiBold", fontSize: 14 },
});
