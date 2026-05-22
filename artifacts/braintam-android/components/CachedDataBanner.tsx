import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

export function CachedDataBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <View style={styles.banner}>
      <Feather name="clock" size={12} color={Colors.navy} />
      <Text style={styles.text}>Showing cached data</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryBtn} activeOpacity={0.8}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: Colors.navy,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.navy,
  },
  retryText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },
});
