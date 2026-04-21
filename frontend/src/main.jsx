import { StrictMode }   from "react";
import { createRoot }   from "react-dom/client";
import "./index.css";
import App              from "./App.jsx";
import { AuthProvider } from "./Context/AuthContext.jsx";
import { initOneSignal } from "./services/notificationService.js";

// ── Initialize OneSignal once before the app renders ─────────────
// This loads the react-onesignal SDK and registers the service worker.
// It does NOT ask for notification permission yet — that happens
// later when the volunteer clicks "Enable notifications" on their profile.
initOneSignal().catch(console.error);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/*
      AuthProvider is the only global provider.
      NGOProvider and CoordinatorProvider live inside their own pages
      so Firestore listeners only fire when those pages are open.
    */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);