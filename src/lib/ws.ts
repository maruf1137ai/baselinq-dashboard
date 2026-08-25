// Derives the WebSocket origin (ws:// or wss://) from VITE_API_BASE_URL,
// matching whatever scheme/host the REST API is actually reachable at.
export function getWsBase(): string {
  try {
    const apiUrl = new URL(
      import.meta.env.VITE_API_BASE_URL || "/",
      window.location.origin
    );
    return `${apiUrl.protocol === "https:" ? "wss:" : "ws:"}//${apiUrl.host}`;
  } catch {
    return `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
  }
}
