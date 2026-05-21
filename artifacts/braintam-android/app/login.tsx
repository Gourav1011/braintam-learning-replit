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
import { useLogin, useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import { Colors } from "@/constants/colors";

type Tab = "email" | "otp";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [tab, setTab] = useState<Tab>("email");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (data) => {
        await login(data.token, data.student);
        router.replace("/(tabs)");
      },
      onError: (err: any) => {
        Alert.alert("Login Failed", err?.data?.message ?? err?.message ?? "Invalid credentials.");
      },
    },
  });

  const sendOtpMutation = useSendOtp({
    mutation: {
      onSuccess: () => setOtpSent(true),
      onError: (err: any) => {
        Alert.alert("Error", err?.data?.message ?? "Failed to send OTP.");
      },
    },
  });

  const verifyOtpMutation = useVerifyOtp({
    mutation: {
      onSuccess: async (data) => {
        await login(data.token, data.student);
        router.replace("/(tabs)");
      },
      onError: (err: any) => {
        Alert.alert("Error", err?.data?.message ?? "Invalid OTP.");
      },
    },
  });

  const handleEmailLogin = async () => {
    if (Platform.OS !== "web") await Haptics.selectionAsync();
    if (!email.trim() || !password.trim()) {
      Alert.alert("Required", "Please enter email and password.");
      return;
    }
    loginMutation.mutate({ data: { email: email.trim(), password } });
  };

  const handleSendOtp = async () => {
    if (Platform.OS !== "web") await Haptics.selectionAsync();
    if (!phone.trim()) {
      Alert.alert("Required", "Please enter your phone number.");
      return;
    }
    sendOtpMutation.mutate({ data: { phone: phone.trim() } });
  };

  const handleVerifyOtp = async () => {
    if (Platform.OS !== "web") await Haptics.selectionAsync();
    if (!otp.trim()) {
      Alert.alert("Required", "Please enter the OTP.");
      return;
    }
    verifyOtpMutation.mutate({ data: { phone: phone.trim(), otp: otp.trim() } });
  };

  const isLoading =
    loginMutation.isPending || sendOtpMutation.isPending || verifyOtpMutation.isPending;

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
          <Text style={styles.heading}>Welcome Back!</Text>
          <Text style={styles.subheading}>Sign in to continue learning</Text>

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === "email" && styles.tabBtnActive]}
              onPress={() => setTab("email")}
            >
              <Text style={[styles.tabLabel, tab === "email" && styles.tabLabelActive]}>
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === "otp" && styles.tabBtnActive]}
              onPress={() => setTab("otp")}
            >
              <Text style={[styles.tabLabel, tab === "otp" && styles.tabLabelActive]}>
                Phone OTP
              </Text>
            </TouchableOpacity>
          </View>

          {tab === "email" ? (
            <View style={styles.form}>
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
                  placeholder="••••••••"
                  placeholderTextColor={Colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                onPress={handleEmailLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={Colors.mutedForeground}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
              {!otpSent ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                  onPress={handleSendOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Enter OTP</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="6-digit OTP"
                      placeholderTextColor={Colors.mutedForeground}
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                    onPress={handleVerifyOtp}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Verify OTP</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() => { setOtpSent(false); setOtp(""); }}
                  >
                    <Text style={styles.linkBtnText}>Resend OTP</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.secondaryBtnText}>Create New Account</Text>
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
    gap: 12,
    marginBottom: 6,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: { fontSize: 26, fontFamily: "Poppins_700Bold", color: "#fff" },
  brand: { fontSize: 32, fontFamily: "Poppins_700Bold", color: "#fff" },
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
  heading: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: Colors.navy,
    textAlign: "center",
  },
  subheading: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: Colors.mutedForeground,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: Colors.navy },
  tabLabel: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.mutedForeground,
  },
  tabLabelActive: { color: "#fff" },
  form: { gap: 16 },
  field: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.navy,
  },
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
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
  linkBtn: { alignItems: "center", paddingVertical: 4 },
  linkBtnText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.primary,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    marginBottom: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: Colors.mutedForeground,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: Colors.navy,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: Colors.navy,
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
  },
});
