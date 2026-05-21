import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetStudentProfile,
  useGetStudentProgress,
  useUpdateStudentProfile,
  getGetStudentProfileQueryKey,
  getGetStudentProgressQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import { Colors } from "@/constants/colors";

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { student, logout, updateStudent } = useAuth();

  const { data: profile, isLoading: profileLoading } = useGetStudentProfile();
  const { data: progress, isLoading: progressLoading } = useGetStudentProgress();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSchool, setEditSchool] = useState("");

  const updateMutation = useUpdateStudentProfile({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetStudentProfileQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStudentProgressQueryKey() });
        if (data) updateStudent(data as any);
        setEditing(false);
        Alert.alert("Saved!", "Profile updated successfully.");
      },
      onError: () => Alert.alert("Error", "Could not update profile. Try again."),
    },
  });

  const openEdit = () => {
    setEditName(profile?.name ?? student?.name ?? "");
    setEditSchool(profile?.school ?? "");
    setEditing(true);
  };

  const handleUpdate = () => {
    if (!editName.trim()) { Alert.alert("Required", "Name cannot be empty."); return; }
    updateMutation.mutate({ data: { name: editName.trim(), school: editSchool.trim() || undefined } });
  };

  const handleLogout = async () => {
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          queryClient.clear();
          router.replace("/login");
        },
      },
    ]);
  };

  const displayProfile = profile ?? student;
  const initials = ((displayProfile?.name ?? "S"))
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const statsCards = [
    { icon: "star", label: "Points", value: progress?.totalPoints ?? displayProfile?.points ?? 0, color: "#F59E0B", bg: "#FFFBEB" },
    { icon: "award", label: "Rank", value: `#${progress?.rank ?? displayProfile?.rank ?? "—"}`, color: Colors.primary, bg: "#FFF4EE" },
    { icon: "book-open", label: "Courses Done", value: progress?.coursesCompleted ?? 0, color: Colors.success, bg: "#ECFDF5" },
    { icon: "check-square", label: "Tests Done", value: progress?.testsAttempted ?? 0, color: "#8B5CF6", bg: "#F5F3FF" },
  ];

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerBand, { paddingTop: insets.top + 16 }]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{displayProfile?.name ?? "Student"}</Text>
          <Text style={styles.profileGrade}>Grade {displayProfile?.grade ?? "—"}</Text>
          {displayProfile?.school ? (
            <View style={styles.schoolRow}>
              <Feather name="home" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.schoolText}>{displayProfile.school}</Text>
            </View>
          ) : null}
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
              <Feather name="edit-2" size={14} color={Colors.navy} />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {statsCards.map((s) => (
            <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
              <View style={[styles.statIconWrap, { backgroundColor: s.bg }]}>
                <Feather name={s.icon as any} size={18} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {(progress?.subjectWise ?? []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subject Progress</Text>
            <View style={styles.card}>
              {(progress?.subjectWise ?? []).map((sp) => (
                <View key={sp.subjectId} style={styles.progressRow}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressSubject}>{sp.subjectName}</Text>
                    <Text style={styles.progressPct}>{Math.round(sp.progress)}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, sp.progress)}%` as any,
                          backgroundColor: sp.color || Colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {displayProfile?.email || displayProfile?.phone ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Info</Text>
            <View style={styles.card}>
              {displayProfile.email ? (
                <View style={styles.infoRow}>
                  <View style={[styles.infoIcon, { backgroundColor: "#EFF6FF" }]}>
                    <Feather name="mail" size={16} color={Colors.navy} />
                  </View>
                  <Text style={styles.infoText}>{displayProfile.email}</Text>
                </View>
              ) : null}
              {displayProfile.phone ? (
                <View style={styles.infoRow}>
                  <View style={[styles.infoIcon, { backgroundColor: "#ECFDF5" }]}>
                    <Feather name="phone" size={16} color={Colors.success} />
                  </View>
                  <Text style={styles.infoText}>{displayProfile.phone}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Feather name="log-out" size={18} color="#fff" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditing(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor={Colors.mutedForeground}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>School</Text>
              <TextInput
                style={styles.input}
                value={editSchool}
                onChangeText={setEditSchool}
                placeholder="Your school name"
                placeholderTextColor={Colors.mutedForeground}
              />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditing(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, updateMutation.isPending && styles.btnDisabled]}
                onPress={handleUpdate}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  headerBand: {
    backgroundColor: Colors.navy,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    marginBottom: 20,
    alignItems: "center",
    gap: 8,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#fff" },
  profileName: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#fff" },
  profileGrade: { fontSize: 14, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.7)" },
  schoolRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  schoolText: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.7)" },
  headerActions: { marginTop: 4 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editBtnText: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderTopWidth: 3,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontFamily: "Poppins_700Bold", color: Colors.navy },
  statLabel: { fontSize: 11, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground, textAlign: "center" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontFamily: "Poppins_700Bold", color: Colors.navy, marginBottom: 12 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  progressRow: { gap: 6 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressSubject: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  progressPct: { fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  progressBar: { height: 8, backgroundColor: Colors.background, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoText: { fontSize: 14, fontFamily: "Poppins_400Regular", color: Colors.navy, flex: 1 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EF4444",
    borderRadius: 16,
    paddingVertical: 15,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#fff" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalWrap: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalCard: { padding: 24, gap: 16 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: Colors.navy },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: Colors.text,
  },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  modalCancelText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: Colors.muted },
  modalSave: { flex: 1, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  modalSaveText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#fff" },
  btnDisabled: { opacity: 0.7 },
});
