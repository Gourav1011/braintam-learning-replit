import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORE_KEY = "braintam_notif_ids";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

type NotifStore = Record<string, string>;

async function readStore(): Promise<NotifStore> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as NotifStore) : {};
  } catch {
    return {};
  }
}

async function writeStore(store: NotifStore): Promise<void> {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {}
}

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("classes", {
    name: "Live Classes",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF6B1A",
    description: "Reminders 15 minutes before a live class starts",
  });
  await Notifications.setNotificationChannelAsync("homework", {
    name: "Homework Deadlines",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0B2B6B",
    description: "Reminders 24 hours before homework is due",
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function scheduleClassNotification(
  classId: number,
  title: string,
  scheduledAt: Date
): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const triggerDate = new Date(scheduledAt.getTime() - 15 * 60 * 1000);
  if (triggerDate <= new Date()) return false;

  const store = await readStore();
  const key = `class_${classId}`;

  if (store[key]) {
    await Notifications.cancelScheduledNotificationAsync(store[key]).catch(() => {});
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Class Starting Soon",
      body: `"${title}" starts in 15 minutes. Get ready!`,
      sound: true,
      data: { type: "class", id: classId },
      ...(Platform.OS === "android" ? { channelId: "classes" } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  store[key] = id;
  await writeStore(store);
  return true;
}

export async function cancelClassNotification(classId: number): Promise<void> {
  const store = await readStore();
  const key = `class_${classId}`;
  if (store[key]) {
    await Notifications.cancelScheduledNotificationAsync(store[key]).catch(() => {});
    delete store[key];
    await writeStore(store);
  }
}

export async function scheduleHomeworkNotification(
  homeworkId: number,
  title: string,
  dueDate: Date
): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const triggerDate = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
  if (triggerDate <= new Date()) return false;

  const store = await readStore();
  const key = `homework_${homeworkId}`;

  if (store[key]) {
    await Notifications.cancelScheduledNotificationAsync(store[key]).catch(() => {});
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Homework Due Tomorrow",
      body: `"${title}" is due in 24 hours. Don't forget to submit!`,
      sound: true,
      data: { type: "homework", id: homeworkId },
      ...(Platform.OS === "android" ? { channelId: "homework" } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  store[key] = id;
  await writeStore(store);
  return true;
}

export async function cancelHomeworkNotification(homeworkId: number): Promise<void> {
  const store = await readStore();
  const key = `homework_${homeworkId}`;
  if (store[key]) {
    await Notifications.cancelScheduledNotificationAsync(store[key]).catch(() => {});
    delete store[key];
    await writeStore(store);
  }
}

export async function isClassNotificationScheduled(classId: number): Promise<boolean> {
  const store = await readStore();
  const key = `class_${classId}`;
  if (!store[key]) return false;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((n) => n.identifier === store[key]);
}

export async function isHomeworkNotificationScheduled(homeworkId: number): Promise<boolean> {
  const store = await readStore();
  const key = `homework_${homeworkId}`;
  if (!store[key]) return false;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((n) => n.identifier === store[key]);
}
