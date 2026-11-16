import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
import * as pdfjsLib from "pdfjs-dist";
import { bootstrapSession } from "./lib/Api";

// Set PDF.js worker from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Cookie mode: resume the session from the refresh cookie before the first
// render (src/lib/authSession.ts). Immediate in the default mode.
// The ErrorBoundary is the outermost safety net: a crash anywhere, even above
// the router and the providers, shows an error screen instead of a blank page.
bootstrapSession().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary variant="app">
      <App />
    </ErrorBoundary>,
  );
});
