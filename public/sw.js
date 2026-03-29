/* eslint-disable no-restricted-globals */

// Listen for push events from the server
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const { title, body, link, data, notificationId } = payload;

  const options = {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { link, notificationId },
    tag: notificationId,
  };

  // Show the browser notification
  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Notify all open app tabs so they can refresh in-app UI
      return self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: "NEW_NOTIFICATION" })
        );
      });
    })
  );
});

// Handle notification click — open/focus the app at the link URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const link = event.notification.data?.link;
  if (!link) return;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If an app window is already open, focus it and navigate
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.postMessage({
              type: "NOTIFICATION_CLICK",
              link,
            });
            return;
          }
        }
        // Otherwise open a new window
        return self.clients.openWindow(link);
      })
  );
});
