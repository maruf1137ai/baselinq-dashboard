import { useEffect, useRef } from "react";
import { getVapidPublicKey, subscribeToPush } from "@/lib/notificationApi";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const token = localStorage.getItem("access");
    if (!token) return;

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    (async () => {
      // 1. Get VAPID public key
      let publicKey: string;
      try {
        const res = await getVapidPublicKey();
        publicKey = res.publicKey;
      } catch {
        // 503 or unavailable — skip push, in-app notifications still work
        return;
      }

      // 2. Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      // 3. Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");

      // 4. Subscribe via Push API
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // 5. Send subscription to backend
      const json = subscription.toJSON();
      if (json.endpoint && json.keys) {
        await subscribeToPush({
          endpoint: json.endpoint,
          keys: json.keys as { p256dh: string; auth: string },
          user_agent: navigator.userAgent,
        });
      }
    })();
  }, []);
}
