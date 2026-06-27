import {
  File as FileIconLucide,
  FileText,
  FileSpreadsheet,
  FileAudio,
  FileVideo,
  FileImage,
  type LucideIcon,
} from "lucide-react";

// Shared, framework-agnostic helpers for classifying chat attachments and
// extracting links. Kept pure (no React) so both the message bubbles and the
// channel "Shared Files" panel classify files identically.

export type AttachmentKind =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "doc"
  | "sheet"
  | "file";

export type SegmentKind = "attachments" | "media";

export interface ChatFile {
  name?: string;
  type?: string;
  url?: string;
  size?: number;
  // Same-origin inline preview URL served by the backend proxy. Preferred for
  // preview to avoid S3 CORS / Content-Disposition: attachment.
  streamUrl?: string;
}

export interface PanelAttachment extends ChatFile {
  kind: AttachmentKind;
}

// Image/audio/video keep `webm` out of the audio list on purpose: a bare
// `.webm` extension is ambiguous, so we let MIME (`audio/webm`) decide audio
// and fall through to video for an extension-only `.webm`.
const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "heic", "avif"];
const VIDEO_EXT = ["mp4", "mov", "avi", "mkv", "webm", "m4v", "wmv", "flv"];
const AUDIO_EXT = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus"];
const PDF_EXT = ["pdf"];
const DOC_EXT = ["doc", "docx", "odt", "rtf", "txt", "md"];
const SHEET_EXT = ["xls", "xlsx", "csv", "ods"];

// Presigned S3 urls carry a `?X-Amz-...` query and sometimes a `#` fragment,
// so strip those before reading the extension.
const extFromString = (s = ""): string => {
  const clean = s.split("?")[0].split("#")[0];
  const dot = clean.lastIndexOf(".");
  return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : "";
};

export const getExtension = (f: ChatFile): string =>
  extFromString(f.name) || extFromString(f.url);

// Classify by BOTH MIME (`type`) and extension because the backend's
// `fileType` is inconsistent (sometimes a MIME type, sometimes a bare
// extension, sometimes empty). Audio is checked first so `audio/webm` voice
// notes are never mistaken for video.
export const getAttachmentKind = (f: ChatFile): AttachmentKind => {
  const mime = (f.type || "").toLowerCase();
  const ext = getExtension(f);

  if (mime.startsWith("audio/") || AUDIO_EXT.includes(ext)) return "audio";
  if (mime.startsWith("image/") || IMAGE_EXT.includes(ext)) return "image";
  if (mime.startsWith("video/") || VIDEO_EXT.includes(ext)) return "video";
  if (mime === "application/pdf" || PDF_EXT.includes(ext)) return "pdf";
  if (mime.includes("spreadsheet") || mime.includes("excel") || SHEET_EXT.includes(ext)) return "sheet";
  if (mime.startsWith("text/") || mime.includes("word") || mime.includes("document") || DOC_EXT.includes(ext)) return "doc";
  return "file";
};

export const categorizeForSegment = (kind: AttachmentKind): SegmentKind =>
  kind === "image" || kind === "video" || kind === "audio" ? "media" : "attachments";

export interface KindMeta {
  Icon: LucideIcon;
  badgeClass: string;
  iconClass: string;
  label: string;
}

export const getKindMeta = (kind: AttachmentKind): KindMeta => {
  switch (kind) {
    case "pdf":
      return { Icon: FileText, badgeClass: "bg-red-50", iconClass: "text-red-500", label: "PDF" };
    case "sheet":
      return { Icon: FileSpreadsheet, badgeClass: "bg-green-50", iconClass: "text-green-600", label: "Spreadsheet" };
    case "doc":
      return { Icon: FileText, badgeClass: "bg-blue-50", iconClass: "text-blue-600", label: "Document" };
    case "audio":
      return { Icon: FileAudio, badgeClass: "bg-purple-50", iconClass: "text-purple-600", label: "Audio" };
    case "video":
      return { Icon: FileVideo, badgeClass: "bg-pink-50", iconClass: "text-pink-600", label: "Video" };
    case "image":
      return { Icon: FileImage, badgeClass: "bg-amber-50", iconClass: "text-amber-600", label: "Image" };
    default:
      return { Icon: FileIconLucide, badgeClass: "bg-gray-100", iconClass: "text-gray-500", label: "File" };
  }
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

// Append a tiny time fragment so a `<video preload="metadata">` element seeks
// past a black first frame and renders a usable poster.
export const videoFrameUrl = (url = ""): string =>
  !url || url.includes("#t=") ? url : `${url}#t=0.1`;

// Pull bare/`http`/`www.` urls out of free text. Trailing sentence punctuation
// is stripped and bare `www.` gets an https:// prefix so links open correctly.
export const extractLinks = (text = ""): string[] => {
  if (!text) return [];
  const re = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
  const matches = text.match(re) || [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (let raw of matches) {
    raw = raw.replace(/[.,;:!?)\]}'"]+$/, "");
    if (!raw) continue;
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const key = href.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(href);
  }
  return out;
};

export const linkHost = (href: string): string => {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
};

export const faviconUrl = (href: string): string => {
  const host = linkHost(href);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
};

export interface CollectedAttachments {
  attachments: PanelAttachment[];
  media: PanelAttachment[];
  links: string[];
}

// Aggregate every attachment + link shared across a channel's messages.
// Files are deduped by url and `blob:` previews (optimistic temp messages) are
// skipped so in-flight sends never leak into the panel.
export const collectChannelAttachments = (messages: any[]): CollectedAttachments => {
  const attachments: PanelAttachment[] = [];
  const media: PanelAttachment[] = [];
  const links: string[] = [];
  const seenUrl = new Set<string>();
  const seenLink = new Set<string>();

  for (const msg of messages || []) {
    for (const link of extractLinks(msg?.content || "")) {
      const key = link.toLowerCase();
      if (!seenLink.has(key)) {
        seenLink.add(key);
        links.push(link);
      }
    }
    for (const f of msg?.files || []) {
      if (!f?.url || f.url.startsWith("blob:")) continue;
      if (seenUrl.has(f.url)) continue;
      seenUrl.add(f.url);
      const kind = getAttachmentKind(f);
      const item: PanelAttachment = { ...f, kind };
      (categorizeForSegment(kind) === "media" ? media : attachments).push(item);
    }
  }

  return { attachments, media, links };
};
