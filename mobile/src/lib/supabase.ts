import "react-native-url-polyfill/auto";

import { createClient, processLock } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import { isSupabaseConfigured, supabaseConfig } from "../config/env";
import { platformStorage } from "./platformStorage";
import type { Database } from "../../../supabase/types/database.types";

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseConfig.url, supabaseConfig.publishableKey, {
      auth: {
        storage: platformStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock
      }
    })
  : null;

if (supabase && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
