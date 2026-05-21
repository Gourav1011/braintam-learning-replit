import { Platform, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Tabs, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

function TabIcon({ name, color, focused }: { name: any; color: string; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Feather name={name} size={22} color={color} />
      {focused && <View style={styles.dot} />}
    </View>
  );
}

function AppHeader() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerBrand}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>B</Text>
        </View>
        <Text style={styles.logoText}>
          <Text style={styles.logoNavy}>Brain</Text>
          <Text style={styles.logoOrange}>tam</Text>
        </Text>
      </View>
      <TouchableOpacity
        style={styles.bellBtn}
        activeOpacity={0.7}
        onPress={() => router.push("/me")}
        accessibilityLabel="Notifications"
      >
        <Feather name="bell" size={20} color={Colors.navy} />
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        tabBarActiveTintColor: Colors.navy,
        tabBarInactiveTintColor: Colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Poppins_600SemiBold",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: "Courses",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="book-open" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="zap" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Me",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="user" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="classes" options={{ href: null }} />
      <Tabs.Screen name="homework" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: "center", justifyContent: "center", width: 32 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  logoMarkText: { color: "#fff", fontSize: 16, fontFamily: "Poppins_700Bold" },
  logoText: { fontSize: 18 },
  logoNavy: { color: Colors.navy, fontFamily: "Poppins_700Bold" },
  logoOrange: { color: Colors.primary, fontFamily: "Poppins_700Bold" },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
});
