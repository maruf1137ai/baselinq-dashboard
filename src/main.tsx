import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerSrc from "pdfjs-dist/build/pdf.worker.min.js?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

createRoot(document.getElementById("root")!).render(<App />);
