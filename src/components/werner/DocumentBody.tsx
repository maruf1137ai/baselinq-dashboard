/**
 * Werner spec rev G — shared document body.
 *
 * Standard field order per Werner pages 3-11:
 *   [Type] No → Date Issued → Discipline → From → To → CC → Subject →
 *   Date required (with urgent tag) → Description → Attachment →
 *   Add reference (auto refs in red) → + add more references.
 *
 * Doc-specific extras (TIME/COST checkboxes on SI reply / Claim, the
 * IC reference on Claim) live in the consuming page, not here — keeps
 * this component a pure layout primitive.
 */
import { Plus, Paperclip } from "lucide-react";

export interface UserRef {
  id: number;
  name: string;
  role?: string;
}

export interface AttachmentRef {
  id: number;
  filename: string;
  url?: string;
}

export interface EntityRefDisplay {
  display: string;
  auto: boolean;
}

interface DocumentBodyProps {
  docNumber: string;
  dateIssued: string;
  discipline?: string;
  from?: UserRef;
  to?: UserRef[];
  cc?: UserRef[];
  subject: string;
  dateRequired?: string;
  isUrgent?: boolean;
  description: string;
  attachments?: AttachmentRef[];
  references?: EntityRefDisplay[];
  /** Optional: shown above the doc number (Claim doc only — references its IC). */
  referenceIcNumber?: string;
  onAddReference?: () => void;
  /** Optional structured time/cost section (Claim entry, VO summary). */
  structuredTimeCost?: {
    timeDays?: number;
    costAmount?: number;
    costCurrency?: string;
  };
}

export function DocumentBody({
  docNumber,
  dateIssued,
  discipline,
  from,
  to,
  cc,
  subject,
  dateRequired,
  isUrgent,
  description,
  attachments = [],
  references = [],
  referenceIcNumber,
  onAddReference,
  structuredTimeCost,
}: DocumentBodyProps) {
  return (
    <div className="px-6 py-4 bg-white">
      <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-sm">
        {referenceIcNumber && (
          <>
            <dt className="text-gray-500">Reference IC NO:</dt>
            <dd className="text-gray-900 font-medium">{referenceIcNumber}</dd>
          </>
        )}
        <dt className="text-gray-500">{docNumber.split("-")[0]} No:</dt>
        <dd className="text-gray-900 font-medium">{docNumber}</dd>

        <dt className="text-gray-500">Date Issued:</dt>
        <dd className="text-gray-900">{dateIssued}</dd>

        {discipline && (
          <>
            <dt className="text-gray-500">Discipline:</dt>
            <dd className="text-purple-700">{discipline}</dd>
          </>
        )}

        <dt className="text-gray-500">From:</dt>
        <dd className="text-purple-700">
          {from ? `${from.name}${from.role ? ` (${from.role})` : ""}` : "—"}
        </dd>

        <dt className="text-gray-500">To:</dt>
        <dd className="text-purple-700">
          {to && to.length > 0
            ? to.map((u) => `${u.name}${u.role ? ` (${u.role})` : ""}`).join(", ")
            : "—"}
        </dd>

        <dt className="text-gray-500">CC:</dt>
        <dd className="text-purple-700">
          {cc && cc.length > 0
            ? cc.map((u) => `${u.name}${u.role ? ` (${u.role})` : ""}`).join(", ")
            : "—"}
        </dd>

        <dt className="text-gray-500">Subject:</dt>
        <dd className="text-purple-700">{subject}</dd>

        <dt className="text-gray-500">Date required:</dt>
        <dd className="text-purple-700">
          {dateRequired || "—"}
          {isUrgent && (
            <span className="ml-2 text-red-600 font-medium">(urgent)</span>
          )}
        </dd>
      </dl>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500 mb-1">Description:</p>
        <p className="text-sm text-purple-800 whitespace-pre-wrap">{description}</p>
      </div>

      {(attachments.length > 0 || references.length > 0 || onAddReference || structuredTimeCost) && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
          {attachments.length > 0 && (
            <div className="flex items-start gap-3 text-sm">
              <span className="text-gray-500 w-32 shrink-0">Attachment:</span>
              <ul className="space-y-1 flex-1">
                {attachments.map((att) => (
                  <li key={att.id} className="text-purple-700 flex items-center gap-1.5">
                    <Paperclip className="h-3 w-3" />
                    {att.url ? (
                      <a href={att.url} className="underline" target="_blank" rel="noopener noreferrer">
                        {att.filename}
                      </a>
                    ) : (
                      <span>{att.filename}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(references.length > 0 || onAddReference) && (
            <div className="flex items-start gap-3 text-sm">
              <span className="text-gray-500 w-32 shrink-0">Add reference:</span>
              <div className="flex-1 space-y-1">
                {references.map((ref, i) => (
                  <div
                    key={i}
                    className={ref.auto ? "text-red-600" : "text-purple-700"}
                  >
                    {ref.display}
                    {ref.auto && (
                      <span className="ml-1 text-xs text-gray-500">(added automatic)</span>
                    )}
                  </div>
                ))}
                {onAddReference && (
                  <button
                    type="button"
                    onClick={onAddReference}
                    className="text-sm text-purple-600 hover:text-purple-800 inline-flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    add more references
                  </button>
                )}
              </div>
            </div>
          )}

          {structuredTimeCost && (
            <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-gray-100">
              <div>
                <span className="text-gray-500 block">TIME (days):</span>
                <span className="text-purple-700 font-medium">
                  {structuredTimeCost.timeDays ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">COST:</span>
                <span className="text-purple-700 font-medium">
                  {structuredTimeCost.costAmount != null
                    ? `${structuredTimeCost.costCurrency || "ZAR"} ${structuredTimeCost.costAmount.toLocaleString()}`
                    : "—"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
