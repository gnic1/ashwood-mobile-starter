// src/lib/sessions.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "ashwood.sessionId";

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function createSession(): Promise<string> {
  const id = uuid();
  await AsyncStorage.setItem(KEY, id);
  return id;
}

export async function getSessionId(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function clearSession() {
  await AsyncStorage.removeItem(KEY);
}
