/**
 * notificationService.js
 *
 * Uses: npm install react-onesignal
 *
 * How this works WITHOUT any backend / Cloud Functions:
 *
 *  1. App starts → OneSignal.init() is called once in main.jsx
 *  2. Volunteer logs in → OneSignal.login(user.uid) links their device
 *     to their Firebase UID (called "external_id" in OneSignal)
 *  3. Volunteer clicks "Allow" → browser registers, OneSignal saves
 *     their device subscription automatically
 *  4. Coordinator runs matching → client-side code calls OneSignal
 *     REST API with the list of matched volunteer UIDs
 *  5. OneSignal delivers the push to every matched volunteer's device
 *     even when the tab is closed (via browser push)
 *
 * Setup (free, 5 minutes):
 *  1. https://onesignal.com → Create free account → New App → Web
 *  2. Copy App ID  → paste as VITE_ONESIGNAL_APP_ID in your .env
 *  3. Copy REST API Key → paste as VITE_ONESIGNAL_REST_KEY in your .env
 *  4. That's it — no credit card, no backend, no service worker to write
 */

import OneSignal from "react-onesignal";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// ── Read from .env (Vite exposes VITE_* variables to the browser) ──
// Create a file called .env in your frontend folder:
//   VITE_ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
//   VITE_ONESIGNAL_REST_KEY=os_v2_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
export const ONESIGNAL_APP_ID  = import.meta.env.VITE_ONESIGNAL_APP_ID  || "";
export const ONESIGNAL_REST_KEY = import.meta.env.VITE_ONESIGNAL_REST_KEY || "";

let _initialized = false;

// ─────────────────────────────────────────────────────────────────
// STEP 1 — init (call once in main.jsx before rendering)
// ─────────────────────────────────────────────────────────────────
export async function initOneSignal() {
  if (_initialized || !ONESIGNAL_APP_ID) {
    if (!ONESIGNAL_APP_ID) {
      console.warn(
        "[OneSignal] VITE_ONESIGNAL_APP_ID not set in .env — notifications disabled.\n" +
        "Create frontend/.env and add:\n" +
        "  VITE_ONESIGNAL_APP_ID=your-app-id\n" +
        "  VITE_ONESIGNAL_REST_KEY=your-rest-api-key"
      );
    }
    return;
  }

  try {
    await OneSignal.init({
      appId:                        ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,   // ← required for localhost dev
      notifyButton:                 { enable: false }, // we use our own UI
      serviceWorkerParam:           { scope: "/" },
    });
    _initialized = true;
    console.log("[OneSignal] Initialized ✓");
  } catch (err) {
    console.error("[OneSignal] Init failed:", err.message);
  }
}

// ─────────────────────────────────────────────────────────────────
// STEP 2 — loginUser (call after Firebase auth on volunteer pages)
//          Links this browser/device to the user's Firebase UID
// ─────────────────────────────────────────────────────────────────
export async function loginUser(uid) {
  if (!_initialized || !uid) return;
  try {
    await OneSignal.login(uid);  // sets external_id = Firebase UID
    console.log("[OneSignal] Logged in as:", uid);
  } catch (err) {
    console.error("[OneSignal] login error:", err.message);
  }
}

// ─────────────────────────────────────────────────────────────────
// STEP 3 — requestPermission (call on profile page with a button)
//          Asks browser for notification permission — MUST be
//          triggered by a user gesture (button click)
// ─────────────────────────────────────────────────────────────────
export async function requestPermission(userId) {
  if (!_initialized) return false;

  try {
    await OneSignal.Notifications.requestPermission();
    const granted = OneSignal.Notifications.permission;

    if (granted && userId) {
      // Save subscription ID to Firestore so the coordinator context
      // can use it in the matching log (informational only — we send
      // via external_id not subscription ID)
      const subId = OneSignal.User.PushSubscription.id;
      if (subId) {
        await updateDoc(doc(db, "users", userId), {
          oneSignalSubId:       subId,
          notificationsEnabled: true,
          notifUpdatedAt:       new Date(),
        }).catch(() => {});
      }
    }

    return granted;
  } catch (err) {
    console.error("[OneSignal] requestPermission error:", err.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// STEP 4 — sendPushToVolunteers (call from CoordinatorContext
//          after matching runs — no backend needed)
//
//  volunteerUids  = array of Firebase UIDs (["uid1", "uid2", ...])
//  title          = notification title string
//  body           = notification body string
//  data           = extra payload object (optional)
// ─────────────────────────────────────────────────────────────────
export async function sendPushToVolunteers(volunteerUids, title, body, data = {}) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_KEY) {
    console.warn("[OneSignal] App ID or REST Key missing — skipping push send");
    return { skipped: true };
  }

  if (!volunteerUids || volunteerUids.length === 0) {
    console.warn("[OneSignal] No volunteer UIDs to notify");
    return { skipped: true };
  }

  try {
    const payload = {
      app_id:           ONESIGNAL_APP_ID,
      // target by external_id = Firebase UID — set via OneSignal.login(uid)
      include_aliases:  { external_id: volunteerUids },
      target_channel:   "push",
      headings:         { en: title },
      contents:         { en: body },
      data,
      // Web push extras
      web_push_topic:   "samudaylink-task",
      priority:         10,
      // Show action buttons on the notification
      web_buttons: [
        { id: "view", text: "View task", url: `${window.location.origin}/volunteer` },
      ],
    };

    const res  = await fetch("https://onesignal.com/api/v1/notifications", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (json.errors) {
      console.error("[OneSignal] Send error:", json.errors);
    } else {
      console.log(`[OneSignal] Sent to ${json.recipients || "?"} recipient(s) ✓`);
    }

    return json;
  } catch (err) {
    console.error("[OneSignal] sendPush failed:", err.message);
    return { error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/** Is this user's browser currently subscribed? */
export function isSubscribed() {
  return _initialized && OneSignal.Notifications.permission;
}

/** Listen for notification clicks (tab open) */
export function onNotificationClick(callback) {
  if (!_initialized) return () => {};
  OneSignal.Notifications.addEventListener("click", callback);
  return () => OneSignal.Notifications.removeEventListener("click", callback);
}

/** Show a quick in-app toast notification (no server needed) */
export function showInAppNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/icon-192.png" });
  }
}

/** Logout — clears OneSignal external_id when user signs out */
export async function logoutOneSignal() {
  if (!_initialized) return;
  try {
    await OneSignal.logout();
  } catch (_) {}
}