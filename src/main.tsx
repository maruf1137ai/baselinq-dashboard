import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import * as pdfjsLib from "pdfjs-dist";

// Set PDF.js worker from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

createRoot(document.getElementById("root")!).render(<App />);
