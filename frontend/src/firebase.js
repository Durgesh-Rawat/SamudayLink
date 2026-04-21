import { initializeApp } from "firebase/app";
import { getAnalytics }  from "firebase/analytics";
import { getAuth }       from "firebase/auth";
import { getFirestore }  from "firebase/firestore";

// ── Firebase config (your existing project) ──────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASURMENT_ID,
};

export const app       = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth      = getAuth(app);
export const db        = getFirestore(app);

// ── Removed: Google Maps API key (now using Leaflet/OpenStreetMap)
// ── Removed: Firebase Messaging (now using OneSignal)