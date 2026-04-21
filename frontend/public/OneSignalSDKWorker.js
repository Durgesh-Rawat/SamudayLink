// firebase-messaging-sw.js
// Place this file in: public/firebase-messaging-sw.js
// This service worker handles FCM push notifications when the app is in the background.

importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

// ✅ Must match your firebase.js config exactly
firebase.initializeApp({
  apiKey:            "AIzaSyAYdQkMbiIMMJn5SDa4PqbuqJe6jxO4N9k",
  authDomain:        "hackathon-8c24e.firebaseapp.com",
  projectId:         "hackathon-8c24e",
  storageBucket:     "hackathon-8c24e.firebasestorage.app",
  messagingSenderId: "31539195101",
  appId:             "1:31539195101:web:98f5ced5307af102e77f34",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message:", payload);

  const { title, body } = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(title || "SamudayLink", {
    body:    body || "You have a new task match.",
    icon:    "/icon-192.png",
    badge:   "/badge.png",
    tag:     data.needId || "samudaylink",
    data:    { url: "/volunteer", ...data },
    actions: [
      { action: "view",    title: "View task" },
      { action: "dismiss", title: "Dismiss"   },
    ],
  });
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/volunteer";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});