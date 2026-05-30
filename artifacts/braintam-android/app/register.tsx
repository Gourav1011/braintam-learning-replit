import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import { Colors } from "@/constants/colors";

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState<number>(6);

  const registerMutation = useRegister({
    mutation: {
      onSuccess: async (data) => {
        await login(data.token, data.student);
        router.replace("/(tabs)");
      },
      onError: (err: any) => {
        Alert.alert("Registration Failed", err?.data?.message ?? err?.message ?? "Something went wrong.");
      },
    },
  });

  const handleRegister = async () => {
    if (Platform.OS !== "web") await Haptics.selectionAsync();
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Required", "Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters.");
      return;
    }
    registerMutation.mutate({ data: { name: name.trim(), email: email.trim(), password, grade } });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>B</Text>
          </View>
          <Text style={styles.brand}>Braintam</Text>
        </View>
        <Text style={styles.tagline}>India's Premium Learning Platform</Text>

        <View style={styles.card}>
          <Text style={styles.heading}>Create Account</Text>
          <Text style={styles.subheading}>Join thousands of students</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Arjun Sharma"
                placeholderTextColor={Colors.mutedForeground}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="arjun@example.com"
                placeholderTextColor={Colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimum 8 characters"
                placeholderTextColor={Colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Grade</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.gradeScroll}
              >
                {GRADES.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.gradeChip, grade === g && styles.gradeChipActive]}
                    onPress={() => setGrade(g)}
                  >
                    <Text style={[styles.gradeChipText, grade === g && styles.gradeChipTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, registerMutation.isPending && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>already have an account?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.navy },
  container: { flex: 1, backgroundColor: Colors.navy },
  content: { paddingHorizontal: 24 },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 10,
    marginTop: 16,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: { fontSize: 44, fontFamily: "Poppins_700Bold", color: "#fff" },
  brand: { fontSize: 44, fontFamily: "Poppins_700Bold", color: "#fff" },
  tagline: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 28,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  heading: { fontSize: 24, fontFamily: "Poppins_700Bold", color: Colors.navy, textAlign: "center" },
  subheading: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: Colors.mutedForeground,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
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
  gradeScroll: { gap: 8, paddingVertical: 2 },
  gradeChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeChipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  gradeChipText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: Colors.mutedForeground },
  gradeChipTextActive: { color: "#fff" },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Poppins_700Bold" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    marginBottom: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: Colors.mutedForeground },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: Colors.navy,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { color: Colors.navy, fontSize: 15, fontFamily: "Poppins_600SemiBold" },
});
