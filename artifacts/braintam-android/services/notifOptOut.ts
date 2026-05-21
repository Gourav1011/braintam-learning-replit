/**
 * Persists explicit per-item opt-outs so the orchestrator never re-schedules
 * a reminder the student has manually disabled.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "braintam_notif_optouts";

type OptOuts = { classes: number[]; homework: number[] };

async function load(): Promise<OptOuts> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { classes: [], homework: [] };
    return JSON.parse(raw) as OptOuts;
  } catch {
    return { classes: [], homework: [] };
  }
}

async function save(data: OptOuts): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
}

export async function addClassOptOut(id: number): Promise<void> {
  const d = await load();
  if (!d.classes.includes(id)) {
    d.classes.push(id);
    await save(d);
  }
}

export async function removeClassOptOut(id: number): Promise<void> {
  const d = await load();
  d.classes = d.classes.filter((x) => x !== id);
  await save(d);
}

export async function isClassOptedOut(id: number): Promise<boolean> {
  const d = await load();
  return d.classes.includes(id);
}

export async function addHomeworkOptOut(id: number): Promise<void> {
  const d = await load();
  if (!d.homework.includes(id)) {
    d.homework.push(id);
    await save(d);
  }
}

export async function removeHomeworkOptOut(id: number): Promise<void> {
  const d = await load();
  d.homework = d.homework.filter((x) => x !== id);
  await save(d);
}

export async function isHomeworkOptedOut(id: number): Promise<boolean> {
  const d = await load();
  return d.homework.includes(id);
}
