import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useGetTest, useSubmitTest, getGetTestQueryKey } from "@workspace/api-client-react";
import type { TestResult } from "@workspace/api-client-react";
import { Colors } from "@/constants/colors";

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TestTakingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const testId = Number(id);

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  // Keep a stable ref to answers so timer callbacks always read current values
  const answersRef = useRef<Record<number, number>>({});
  // Guard against double auto-submit (e.g. multiple ticks at t=0)
  const hasAutoSubmittedRef = useRef(false);

  const { data: test, isLoading, isError, refetch } = useGetTest(testId, {
    query: { enabled: !!testId, queryKey: getGetTestQueryKey(testId) },
  });

  const submitMutation = useSubmitTest({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
        setShowConfirm(false);
      },
      onError: () => {
        // Reset the guard so the user can retry after a transient failure
        hasAutoSubmittedRef.current = false;
        Alert.alert("Error", "Could not submit. Try again.");
      },
    },
  });

  // Sync state → ref on every render so the timer callback sees current answers
  answersRef.current = answers;

  useEffect(() => {
    if (test?.duration) {
      hasAutoSubmittedRef.current = false;
      setTimeLeft(test.duration * 60);
    }
  }, [test]);

  // One setTimeout per tick — natural cleanup, no interval spam.
  // When timeLeft hits 0 auto-submit fires exactly once via the ref guard.
  useEffect(() => {
    if (timeLeft === null || result) return;

    if (timeLeft <= 0) {
      if (!hasAutoSubmittedRef.current && !submitMutation.isPending) {
        hasAutoSubmittedRef.current = true;
        const answerList = Object.entries(answersRef.current).map(([qId, opt]) => ({
          questionId: Number(qId),
          selectedOption: opt as number,
        }));
        submitMutation.mutate({ id: testId, data: { answers: answerList } });
      }
      return;
    }

    const id = setTimeout(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, !!result]);

  const handleSubmit = () => {
    if (submitMutation.isPending || hasAutoSubmittedRef.current) return;
    hasAutoSubmittedRef.current = true;
    const answerList = Object.entries(answersRef.current).map(([qId, opt]) => ({
      questionId: Number(qId),
      selectedOption: opt as number,
    }));
    submitMutation.mutate({ id: testId, data: { answers: answerList } });
  };

  const selectAnswer = async (qId: number, optIdx: number) => {
    if (Platform.OS !== "web") await Haptics.selectionAsync();
    setAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Loading Test…</Text>
        </View>
        <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>
      </View>
    );
  }

  if (isError || !test) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Feather name="wifi-off" size={36} color={Colors.border} />
          <Text style={styles.emptyTitle}>Couldn't load test</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (result) {
    const passed = result.passed;
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={[styles.resultContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.resultHeader}>
            <View style={[styles.resultCircle, { backgroundColor: passed ? "#DCFCE7" : "#FEE2E2" }]}>
              <Feather name={passed ? "check-circle" : "x-circle"} size={48} color={passed ? Colors.success : Colors.error} />
            </View>
            <Text style={styles.resultTitle}>{passed ? "Congratulations! 🎉" : "Keep Practicing!"}</Text>
            <Text style={styles.resultSubtitle}>{test.title}</Text>
          </View>

          <View style={styles.scoreCard}>
            <Text style={styles.scorePercent}>{result.percentage}%</Text>
            <Text style={styles.scoreRaw}>Score: {result.score} / {result.maxScore}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${result.percentage}%` as any, backgroundColor: passed ? Colors.success : Colors.error }]} />
            </View>
          </View>

          <View style={styles.resultStatsRow}>
            <View style={[styles.resultStat, { backgroundColor: "#DCFCE7" }]}>
              <Feather name="check-circle" size={24} color={Colors.success} />
              <Text style={[styles.resultStatNum, { color: Colors.success }]}>{result.correctAnswers ?? 0}</Text>
              <Text style={styles.resultStatLabel}>Correct</Text>
            </View>
            <View style={[styles.resultStat, { backgroundColor: "#FEE2E2" }]}>
              <Feather name="x-circle" size={24} color={Colors.error} />
              <Text style={[styles.resultStatNum, { color: Colors.error }]}>{result.wrongAnswers ?? 0}</Text>
              <Text style={styles.resultStatLabel}>Wrong</Text>
            </View>
          </View>

          {passed && (
            <View style={styles.passedBanner}>
              <Text style={styles.passedBannerText}>🌟 You earned {Math.round(result.score)} points!</Text>
            </View>
          )}

          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Back to Tests</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const questions = test.questions ?? [];
  const question = questions[currentQ];
  const answered = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answered / questions.length) * 100 : 0;
  const isUrgent = timeLeft !== null && timeLeft < 60;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => {
          Alert.alert("Leave Test?", "Your progress will be lost.", [
            { text: "Stay", style: "cancel" },
            { text: "Leave", style: "destructive", onPress: () => router.back() },
          ]);
        }}>
          <Feather name="x" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>{test.title}</Text>
        </View>
        {timeLeft !== null && (
          <View style={[styles.timerChip, isUrgent && styles.timerUrgent]}>
            <Feather name="clock" size={13} color={isUrgent ? Colors.error : Colors.navy} />
            <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>{formatTime(timeLeft)}</Text>
          </View>
        )}
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressMeta}>
          <Text style={styles.progressLabel}>Q {currentQ + 1} / {questions.length}</Text>
          <Text style={styles.progressLabel}>{answered} answered</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
        </View>
      </View>

      {question && (
        <ScrollView style={styles.questionArea} showsVerticalScrollIndicator={false} contentContainerStyle={styles.questionContent}>
          <View style={styles.questionCard}>
            <Text style={styles.questionNum}>Question {currentQ + 1}</Text>
            <Text style={styles.questionText}>{question.text}</Text>
          </View>

          <View style={styles.optionsWrap}>
            {(question.options ?? []).map((opt, idx) => {
              const selected = answers[question.id] === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.optionBtn, selected && styles.optionBtnSelected]}
                  onPress={() => selectAnswer(question.id, idx)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.optionLetter, selected && styles.optionLetterSelected]}>
                    <Text style={[styles.optionLetterText, selected && styles.optionLetterTextSelected]}>
                      {String.fromCharCode(65 + idx)}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{opt}</Text>
                  {selected && <Feather name="check-circle" size={18} color={Colors.navy} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      <View style={[styles.navBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.navBtn, currentQ === 0 && styles.navBtnDisabled]}
          onPress={() => setCurrentQ((q) => Math.max(0, q - 1))}
          disabled={currentQ === 0}
        >
          <Feather name="chevron-left" size={20} color={currentQ === 0 ? Colors.border : Colors.navy} />
          <Text style={[styles.navBtnText, currentQ === 0 && styles.navBtnTextDisabled]}>Prev</Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dotsWrap}>
          {questions.map((q, i) => (
            <TouchableOpacity
              key={q.id}
              style={[
                styles.dot,
                i === currentQ && styles.dotActive,
                answers[q.id] !== undefined && styles.dotAnswered,
              ]}
              onPress={() => setCurrentQ(i)}
            >
              <Text style={[styles.dotText, i === currentQ && styles.dotTextActive]}>
                {i + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {currentQ < questions.length - 1 ? (
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCurrentQ((q) => Math.min(questions.length - 1, q + 1))}
          >
            <Text style={styles.navBtnText}>Next</Text>
            <Feather name="chevron-right" size={20} color={Colors.navy} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.submitNavBtn} onPress={() => setShowConfirm(true)}>
            <Text style={styles.submitNavText}>Submit</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showConfirm} transparent animationType="slide" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Feather name="help-circle" size={36} color={Colors.navy} />
            <Text style={styles.confirmTitle}>Submit Test?</Text>
            <Text style={styles.confirmDesc}>
              You've answered {answered} of {questions.length} questions.
              {answered < questions.length ? ` ${questions.length - answered} unanswered.` : " All answered!"}
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowConfirm(false)}>
                <Text style={styles.confirmCancelText}>Review</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmSubmit, submitMutation.isPending && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmSubmitText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  topBarCenter: { flex: 1 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: { fontSize: 16, fontFamily: "Poppins_600SemiBold", color: "#fff" },
  timerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  timerUrgent: { backgroundColor: "#FEE2E2" },
  timerText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: Colors.navy },
  timerTextUrgent: { color: Colors.error },
  progressSection: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, gap: 6 },
  progressMeta: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: Colors.mutedForeground },
  progressBar: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: Colors.primary, borderRadius: 4 },
  questionArea: { flex: 1 },
  questionContent: { padding: 20, gap: 16, paddingBottom: 8 },
  questionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  questionNum: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: Colors.primary, textTransform: "uppercase", letterSpacing: 0.5 },
  questionText: { fontSize: 16, fontFamily: "Poppins_600SemiBold", color: Colors.navy, lineHeight: 24 },
  optionsWrap: { gap: 10 },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  optionBtnSelected: { borderColor: Colors.navy, backgroundColor: "#EFF6FF" },
  optionLetter: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionLetterSelected: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  optionLetterText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: Colors.navy },
  optionLetterTextSelected: { color: "#fff" },
  optionText: { flex: 1, fontSize: 14, fontFamily: "Poppins_400Regular", color: Colors.navy, lineHeight: 20 },
  optionTextSelected: { fontFamily: "Poppins_600SemiBold" },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  navBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8 },
  navBtnDisabled: {},
  navBtnText: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  navBtnTextDisabled: { color: Colors.border },
  dotsWrap: { alignItems: "center", gap: 6, paddingHorizontal: 4 },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: { borderColor: Colors.navy, backgroundColor: Colors.navy },
  dotAnswered: { borderColor: Colors.primary, backgroundColor: "#FFF4EE" },
  dotText: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: Colors.mutedForeground },
  dotTextActive: { color: "#fff" },
  submitNavBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitNavText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 14,
    width: "100%",
  },
  confirmTitle: { fontSize: 22, fontFamily: "Poppins_700Bold", color: Colors.navy },
  confirmDesc: { fontSize: 14, fontFamily: "Poppins_400Regular", color: Colors.muted, textAlign: "center", lineHeight: 22 },
  confirmBtns: { flexDirection: "row", gap: 10, width: "100%" },
  confirmCancel: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  confirmCancelText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: Colors.muted },
  confirmSubmit: { flex: 1, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  confirmSubmitText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#fff" },
  btnDisabled: { opacity: 0.7 },
  resultContent: { padding: 24, gap: 20 },
  resultHeader: { alignItems: "center", gap: 12 },
  resultCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  resultTitle: { fontSize: 26, fontFamily: "Poppins_700Bold", color: Colors.navy, textAlign: "center" },
  resultSubtitle: { fontSize: 14, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground, textAlign: "center" },
  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  scorePercent: { fontSize: 52, fontFamily: "Poppins_700Bold", color: Colors.primary },
  scoreRaw: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: Colors.mutedForeground },
  resultStatsRow: { flexDirection: "row", gap: 14 },
  resultStat: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 6,
  },
  resultStatNum: { fontSize: 28, fontFamily: "Poppins_700Bold" },
  resultStatLabel: { fontSize: 12, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  passedBanner: {
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
  },
  passedBannerText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#92400E" },
  doneBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  doneBtnText: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  emptyTitle: { fontSize: 18, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: "#fff", fontFamily: "Poppins_600SemiBold", fontSize: 14 },
});
