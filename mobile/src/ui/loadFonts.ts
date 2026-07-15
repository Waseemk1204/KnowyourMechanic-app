import { Platform } from "react-native";

// Match the web app's typography (Inter). On web we inject the Google Fonts
// stylesheet and force Inter globally so every Text picks it up with the right
// weight — this is the single biggest "feels like the web app" upgrade.
// Native keeps the system font for now (add expo-font/@expo-google-fonts later).
if (Platform.OS === "web" && typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*, input, textarea, button {
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif !important;
  -webkit-font-smoothing: antialiased;
}`;
  document.head.appendChild(style);
}
