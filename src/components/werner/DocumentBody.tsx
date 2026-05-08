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
import type { ReactNode } from "react";
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

/**
 * Multi-user field renderer. Werner spec stacks vertically when there
 * are multiple recipients (page 3 shows "Darren Ogden (Architect)\n
 * Grant Mcevoy (project manager)" on separate lines, not comma-joined).
 */
function renderUserList(users?: UserRef[]): ReactNode {
  if (!users || users.length === 0) return <span className="text-gray-400">—</span>;
  return (
    <div className="space-y-0.5">
      {users.map((u) => (
        <div key={u.id}>
          {u.name}
          {u.role && <span className="text-gray-500"> ({u.role})</span>}
        </div>
      ))}
    </div>
  );
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
  const docPrefix = docNumber.split("-")[0];

  return (
    <div className="px-6 py-5 bg-gray-100 text-sm">
      {/* Doc-specific identifier block */}
      <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-1.5">
        {referenceIcNumber && (
          <>
            <dt className="text-gray-700">Reference IC NO:</dt>
            <dd className="text-gray-900 font-medium">{referenceIcNumber}</dd>
          </>
        )}
        <dt className="text-gray-700">{docPrefix} No:</dt>
        <dd className="text-gray-900 font-medium">{docNumber}</dd>

        <dt className="text-gray-700">{docPrefix} Date Issued:</dt>
        <dd className="text-gray-900">{dateIssued}</dd>
      </dl>

      {/* Sender / recipient block */}
      <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 mt-4">
        {discipline && (
          <>
            <dt className="text-gray-700">Discipline:</dt>
            <dd className="text-purple-700">{discipline}</dd>
          </>
        )}

        <dt className="text-gray-700">From:</dt>
        <dd className="text-purple-700">
          {from ? `${from.name}${from.role ? ` (${from.role})` : ""}` : <span className="text-gray-400">—</span>}
        </dd>

        <dt className="text-gray-700">To:</dt>
        <dd className="text-purple-700">{renderUserList(to)}</dd>

        <dt className="text-gray-700">CC:</dt>
        <dd className="text-purple-700">{renderUserList(cc)}</dd>

        <dt className="text-gray-700">Subject:</dt>
        <dd className="text-purple-700">{subject}</dd>

        <dt className="text-gray-700">Date required:</dt>
        <dd className="text-purple-700">
          {dateRequired || <span className="text-gray-400">—</span>}
          {isUrgent && (
            <span className="ml-2 text-red-600 font-medium">(urgent)</span>
          )}
        </dd>
      </dl>

      {/* Horizontal rule separator before description (matches Werner spec) */}
      <div className="border-t border-gray-300 my-4" />

      <div>
        <p className="text-gray-700 mb-1">
          Description{docPrefix === "SI" || docPrefix === "VO" ? ` of ${docPrefix === "SI" ? "Site instruction" : "VARIATION ORDER"}` : " of Request"}:
        </p>
        <p className="text-purple-800 whitespace-pre-wrap">{description}</p>
      </div>

      {(attachments.length > 0 || references.length > 0 || onAddReference || structuredTimeCost) && (
        <>
          <div className="border-t border-gray-300 my-4" />

          <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2">
            {attachments.length > 0 && (
              <>
                <dt className="text-gray-700">Attachment:</dt>
                <dd className="text-purple-700 space-y-0.5">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-1.5">
                      <Paperclip className="h-3 w-3" />
                      {att.url ? (
                        <a href={att.url} className="underline" target="_blank" rel="noopener noreferrer">
                          {att.filename}
                        </a>
                      ) : (
                        <span>{att.filename}</span>
                      )}
                    </div>
                  ))}
                </dd>
              </>
            )}

            {(references.length > 0 || onAddReference) && (
              <>
                <dt className="text-gray-700">Add reference:</dt>
                <dd className="space-y-0.5">
                  {references.map((ref, i) => (
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
                  {onAddReference && (
                    <button
                      type="button"
                      onClick={onAddReference}
                      className="text-purple-600 hover:text-purple-800 inline-flex items-center gap-1 text-xs mt-1"
                    >
                      <Plus className="h-3 w-3" />
                      add more references
                    </button>
                  )}
                </dd>
              </>
            )}
          </dl>

          {structuredTimeCost && (
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-300">
              <div>
                <span className="text-gray-700 block">TIME (days):</span>
                <span className="text-purple-700 font-medium">
                  {structuredTimeCost.timeDays ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-700 block">COST:</span>
                <span className="text-purple-700 font-medium">
                  {structuredTimeCost.costAmount != null
                    ? `${structuredTimeCost.costCurrency || "ZAR"} ${structuredTimeCost.costAmount.toLocaleString()}`
                    : "—"}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
