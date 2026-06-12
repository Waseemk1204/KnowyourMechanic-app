import { Platform } from "react-native";

const memoryStorage = new Map<string, string>();

function getWebStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

export const platformStorage = {
  async getItem(key: string) {
    if (Platform.OS === "web") {
      return getWebStorage()?.getItem(key) ?? null;
    }

    return memoryStorage.get(key) ?? null;
  },

  async setItem(key: string, value: string) {
    if (Platform.OS === "web") {
      getWebStorage()?.setItem(key, value);
      return;
    }

    memoryStorage.set(key, value);
  },

  async removeItem(key: string) {
    if (Platform.OS === "web") {
      getWebStorage()?.removeItem(key);
      return;
    }

    memoryStorage.delete(key);
  }
};
