/**
 * Werner spec rev G — reply card.
 *
 * One per Reply row. Werner pages 3-11 show the same pattern: sender +
 * role + timestamp on top, "Reply:" body, then meta rows for
 * Add recipient / Attachment / Add reference, optionally TIME/COST
 * checkboxes (SI reply, Claim), and Analyze-with-AI / Reply at the
 * bottom.
 *
 * This is presentation only — fetching, sending, and validation live
 * in the consuming page.
 */
import { Paperclip } from "lucide-react";
import type { EntityRefDisplay } from "./DocumentBody";

export interface ReplyData {
  id: number;
  sender_name: string | null;
  sender_role?: string;
  body: string;
  recipient_name: string | null;
  sent_to_names: string[];
  cc_names: string[];
  attachments?: Array<{ id: number; filename: string; url?: string }>;
  references_display: EntityRefDisplay[];
  time_impact: boolean;
  cost_impact: boolean;
  created_at: string;
}

interface ReplyCardProps {
  reply: ReplyData;
  showTimeCost?: boolean;
  /** Format e.g. "2026-05-06 9:00 (UTC+02:00)". */
  timestampFormatter?: (iso: string) => string;
}

const defaultFormatter = (iso: string): string => {
  try {
    const d = new Date(iso);
    const date = d.toISOString().slice(0, 10);
    const time = d.toTimeString().slice(0, 5);
    const tz = -d.getTimezoneOffset() / 60;
    const tzStr = `(UTC${tz >= 0 ? "+" : ""}${tz.toString().padStart(2, "0")}:00)`;
    return `${date} ${time} ${tzStr}`;
  } catch {
    return iso;
  }
};

export function ReplyCard({
  reply,
  showTimeCost = false,
  timestampFormatter = defaultFormatter,
}: ReplyCardProps) {
  return (
    <div className="bg-gray-100 border border-gray-300 rounded-md px-5 py-4 text-sm">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-gray-900">
          {reply.sender_name || "Unknown"}
          {reply.sender_role && (
            <span className="text-gray-700 ml-1">({reply.sender_role})</span>
          )}
        </div>
        <div className="text-xs text-gray-600">
          {timestampFormatter(reply.created_at)}
        </div>
      </div>

      <div>
        <p className="text-gray-700 mb-1">Reply:</p>
        <p className="text-purple-800 whitespace-pre-wrap">{reply.body}</p>
      </div>

      <dl className="mt-4 grid grid-cols-[140px_1fr] gap-x-4 gap-y-2">
        <dt className="text-gray-700">Add recipient:</dt>
        <dd className="text-purple-700">{reply.recipient_name || "none"}</dd>

        {reply.cc_names.length > 0 && (
          <>
            <dt className="text-gray-700">CC:</dt>
            <dd className="text-purple-700 space-y-0.5">
              {reply.cc_names.map((n, i) => (
                <div key={i}>{n}</div>
              ))}
            </dd>
          </>
        )}

        <dt className="text-gray-700">Attachment:</dt>
        <dd className="text-purple-700">
          {reply.attachments && reply.attachments.length > 0 ? (
            reply.attachments.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1 mr-2">
                <Paperclip className="h-3 w-3" />
                {a.url ? (
                  <a href={a.url} className="underline" target="_blank" rel="noopener noreferrer">
                    {a.filename}
                  </a>
                ) : (
                  a.filename
                )}
              </span>
            ))
          ) : (
            <span>none</span>
          )}
        </dd>

        {reply.references_display.length > 0 && (
          <>
            <dt className="text-gray-700">Add reference:</dt>
            <dd className="space-y-0.5">
              {reply.references_display.map((ref, i) => (
                <div
                  key={i}
                  className={ref.auto ? "text-red-600" : "text-purple-700"}
                >
                  {ref.display}
                  {ref.auto && (
                    <span className="ml-1 text-xs">(added automatic)</span>
                  )}
                </div>
              ))}
            </dd>
          </>
        )}

        {showTimeCost && (
          <>
            <dt className="text-gray-700">TIME:</dt>
            <dd>
              <input
                type="checkbox"
                checked={reply.time_impact}
                disabled
                className="h-4 w-4 text-purple-600 rounded border-gray-400"
              />
            </dd>
            <dt className="text-gray-700">COST:</dt>
            <dd>
              <input
                type="checkbox"
                checked={reply.cost_impact}
                disabled
                className="h-4 w-4 text-purple-600 rounded border-gray-400"
              />
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
