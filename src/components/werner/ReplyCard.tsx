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
    <div className="border-l-2 border-purple-300 bg-gray-50 px-5 py-4 my-3">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-sm font-medium text-gray-900">
          {reply.sender_name || "Unknown"}
          {reply.sender_role && (
            <span className="text-gray-500 font-normal ml-1">({reply.sender_role})</span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {timestampFormatter(reply.created_at)}
        </div>
      </div>

      <div className="text-sm">
        <p className="text-gray-500 mb-1">Reply:</p>
        <p className="text-purple-800 whitespace-pre-wrap">{reply.body}</p>
      </div>

      <dl className="mt-3 grid grid-cols-[120px_1fr] gap-x-3 gap-y-1 text-xs pt-3 border-t border-gray-200">
        <dt className="text-gray-500">Add recipient:</dt>
        <dd className="text-purple-700">{reply.recipient_name || "—"}</dd>

        {reply.sent_to_names.length > 0 && (
          <>
            <dt className="text-gray-500">Sent to:</dt>
            <dd className="text-purple-700">{reply.sent_to_names.join(", ")}</dd>
          </>
        )}

        {reply.cc_names.length > 0 && (
          <>
            <dt className="text-gray-500">CC:</dt>
            <dd className="text-purple-700">{reply.cc_names.join(", ")}</dd>
          </>
        )}

        {reply.attachments && reply.attachments.length > 0 && (
          <>
            <dt className="text-gray-500">Attachment:</dt>
            <dd className="text-purple-700">
              {reply.attachments.map((a) => (
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
              ))}
            </dd>
          </>
        )}

        {reply.references_display.length > 0 && (
          <>
            <dt className="text-gray-500">Add reference:</dt>
            <dd>
              {reply.references_display.map((ref, i) => (
                <span
                  key={i}
                  className={`block ${ref.auto ? "text-red-600" : "text-purple-700"}`}
                >
                  {ref.display}
                  {ref.auto && (
                    <span className="ml-1 text-[10px] text-gray-500">(added automatic)</span>
                  )}
                </span>
              ))}
            </dd>
          </>
        )}

        {showTimeCost && (
          <>
            <dt className="text-gray-500">TIME:</dt>
            <dd>
              <input
                type="checkbox"
                checked={reply.time_impact}
                disabled
                className="h-4 w-4 text-purple-600 rounded"
              />
            </dd>
            <dt className="text-gray-500">COST:</dt>
            <dd>
              <input
                type="checkbox"
                checked={reply.cost_impact}
                disabled
                className="h-4 w-4 text-purple-600 rounded"
              />
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
