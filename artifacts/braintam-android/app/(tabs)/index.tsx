import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

const FEATURES = [
  { icon: "video" as const, label: "Live Classes", desc: "Get notified 15 min before class starts" },
  { icon: "book-open" as const, label: "Homework", desc: "Reminders 24 hrs before due date" },
  { icon: "bell" as const, label: "Smart Alerts", desc: "Never miss a deadline again" },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome to</Text>
        <Text style={styles.brand}>Braintam</Text>
        <Text style={styles.subtitle}>India's premium learning platform</Text>
      </View>

      <View style={styles.banner}>
        <Feather name="bell" size={28} color={Colors.primary} />
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Notifications Enabled</Text>
          <Text style={styles.bannerDesc}>
            You'll be alerted before live classes and homework deadlines.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>What we'll remind you about</Text>

      {FEATURES.map((f) => (
        <View key={f.label} style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name={f.icon} size={22} color={Colors.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{f.label}</Text>
            <Text style={styles.cardDesc}>{f.desc}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  header: { marginBottom: 28 },
  greeting: { fontSize: 16, color: Colors.muted, fontFamily: "Poppins_400Regular" },
  brand: {
    fontSize: 36,
    color: Colors.navy,
    fontFamily: "Poppins_700Bold",
    lineHeight: 42,
  },
  subtitle: { fontSize: 14, color: Colors.mutedForeground, fontFamily: "Poppins_400Regular", marginTop: 4 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4EE",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#FFD4B8",
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  bannerDesc: { fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.muted, marginTop: 2 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Poppins_700Bold",
    color: Colors.navy,
    marginBottom: 14,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF4EE",
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: Colors.navy },
  cardDesc: { fontSize: 13, fontFamily: "Poppins_400Regular", color: Colors.muted, marginTop: 2 },
});
