import { useMemo } from "react";
import { Play, Link as LinkIcon, ExternalLink, FileAudio, Paperclip } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  attachmentKey,
  collectChannelAttachments,
  getKindMeta,
  formatFileSize,
  videoFrameUrl,
  linkHost,
  faviconUrl,
  type PanelAttachment,
} from "./attachmentUtils";

type PreviewFile = { name: string; url: string; type?: string; streamUrl?: string };

interface ChannelAttachmentsPanelProps {
  messages: any[];
  onPreview: (file: PreviewFile) => void;
}

const AttachmentRow = ({
  file,
  onPreview,
}: {
  file: PanelAttachment;
  onPreview: (file: PreviewFile) => void;
}) => {
  const meta = getKindMeta(file.kind);
  const Icon = meta.Icon;
  return (
    <button
      type="button"
      onClick={() => onPreview({ name: file.name || "", url: file.url || "", type: file.type, streamUrl: file.streamUrl })}
      className="w-full flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
    >
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", meta.badgeClass)}>
        <Icon className={cn("h-4 w-4", meta.iconClass)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-900 truncate">{file.name || "Untitled"}</p>
        <p className="text-xs text-gray-400 truncate">
          {meta.label}
          {formatFileSize(file.size) ? ` · ${formatFileSize(file.size)}` : ""}
        </p>
      </div>
    </button>
  );
};

const MediaTile = ({
  file,
  onPreview,
}: {
  file: PanelAttachment;
  onPreview: (file: PreviewFile) => void;
}) => {
  const open = () => onPreview({ name: file.name || "", url: file.url || "", type: file.type, streamUrl: file.streamUrl });

  if (file.kind === "image") {
    return (
      <button
        type="button"
        onClick={open}
        className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/50 group"
      >
        <img
          src={file.url}
          alt={file.name || "image"}
          loading="lazy"
          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
        />
      </button>
    );
  }

  if (file.kind === "video") {
    return (
      <button
        type="button"
        onClick={open}
        className="relative aspect-square rounded-lg overflow-hidden border border-border bg-black group"
      >
        <video
          src={videoFrameUrl(file.url)}
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-7 w-7 rounded-full bg-black/55 flex items-center justify-center">
            <Play className="h-4 w-4 text-white fill-white" />
          </span>
        </span>
        <span className="absolute bottom-1 left-1 text-xs px-1 rounded bg-black/60 text-white">Video</span>
      </button>
    );
  }

  // audio
  return (
    <button
      type="button"
      onClick={() => file.url && window.open(file.url, "_blank")}
      className="relative aspect-square rounded-lg overflow-hidden border border-border bg-purple-50 flex items-center justify-center group"
      title={file.name}
    >
      <FileAudio className="h-6 w-6 text-purple-500 group-hover:scale-110 transition-transform" />
      <span className="absolute bottom-1 left-1 text-xs px-1 rounded bg-black/50 text-white">Audio</span>
    </button>
  );
};

const LinkRow = ({ href }: { href: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="w-full flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
  >
    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
      <img
        src={faviconUrl(href)}
        alt=""
        className="h-4 w-4"
        onError={(e) => {
          const img = e.currentTarget;
          img.style.display = "none";
          img.nextElementSibling?.classList.remove("hidden");
        }}
      />
      <LinkIcon className="h-4 w-4 text-gray-400 hidden" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm text-gray-900 truncate">{linkHost(href)}</p>
      <p className="text-xs text-gray-400 truncate">{href}</p>
    </div>
    <ExternalLink className="h-4 w-4 text-gray-400 shrink-0" />
  </a>
);

export const ChannelAttachmentsPanel = ({ messages, onPreview }: ChannelAttachmentsPanelProps) => {
  const { attachments, media, links } = useMemo(
    () => collectChannelAttachments(messages),
    [messages],
  );
  const total = attachments.length + media.length + links.length;

  return (
    <div>
      <Accordion type="single" collapsible>
        <AccordionItem value="shared" className="border-none">
          <AccordionTrigger className="py-2 text-sm font-normal text-gray-900 hover:no-underline">
            <span className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-gray-400" />
              Shared Files
              <span className="text-xs font-normal text-gray-500 bg-muted rounded-full px-1.5 py-0.5">
                {total}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-1">
            <Tabs defaultValue="attachments">
              <TabsList className="grid w-full grid-cols-3 h-8 p-0.5">
                <TabsTrigger value="attachments" className="text-xs px-1">
                  Files ({attachments.length})
                </TabsTrigger>
                <TabsTrigger value="media" className="text-xs px-1">
                  Media ({media.length})
                </TabsTrigger>
                <TabsTrigger value="links" className="text-xs px-1">
                  Links ({links.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="attachments">
                {attachments.length === 0 ? (
                  <EmptyState
                    variant="plain"
                    size="sm"
                    title="No files shared yet"
                    description="Files attached to messages in this channel are collected here."
                  />
                ) : (
                  <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
                    {attachments.map((f, i) => (
                      <AttachmentRow key={attachmentKey(f, i)} file={f} onPreview={onPreview} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="media">
                {media.length === 0 ? (
                  <EmptyState
                    variant="plain"
                    size="sm"
                    title="No photos or video shared yet"
                    description="Site photos and video posted to this channel appear here."
                  />
                ) : (
                  <div className="max-h-72 overflow-y-auto pr-1 grid grid-cols-3 gap-2">
                    {media.map((f, i) => (
                      // Keyed by attachment id, never the presigned url: the url
                      // is re-signed on every poll, and a changing key remounts
                      // this tile's <video preload="metadata"> — one abandoned
                      // media request per poll.
                      <MediaTile key={attachmentKey(f, i)} file={f} onPreview={onPreview} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="links">
                {links.length === 0 ? (
                  <EmptyState
                    variant="plain"
                    size="sm"
                    title="No links shared yet"
                    description="Links posted in this channel are gathered here for quick reference."
                  />
                ) : (
                  <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
                    {links.map((href, i) => (
                      <LinkRow key={`${href}-${i}`} href={href} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default ChannelAttachmentsPanel;
