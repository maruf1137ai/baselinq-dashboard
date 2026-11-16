import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
import * as pdfjsLib from "pdfjs-dist";

// Set PDF.js worker from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// The outermost safety net: a crash anywhere, even above the router and the
// providers, shows an error screen instead of a blank page.
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary variant="app">
    <App />
  </ErrorBoundary>,
);
