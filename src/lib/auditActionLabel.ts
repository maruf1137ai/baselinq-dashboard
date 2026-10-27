/**
 * How one task-audit row reads in a timeline.
 *
 * This lived twice, word for word, in `pages/TaskDetails.tsx` and
 * `components/TaskComponents/TaskSidebar.tsx`. Both fell through to a
 * humanised action name for anything they did not list — and the backend
 * writes most of its events (signing, contract amendments, certificate
 * minting…) with `action: "other"` and the real sentence in `description`. So
 * the trail read "Swapnil Other / Signed and issued by Swapnil" — the label
 * was the enum's name and the actual event was demoted to the grey line under
 * it (QA BUG-19).
 *
 * Kept out of the components because it decides what a person is told
 * happened.
 */

export interface AuditLogLike {
  action?: string | null;
  description?: string | null;
  createdByName?: string | null;
  oldValue?: unknown;
  old_value?: unknown;
  newValue?: unknown;
  new_value?: unknown;
  from?: unknown;
  to?: unknown;
  value?: unknown;
}

export interface AuditActionLabel {
  text: string;
  oldStatus?: string;
  newStatus?: string;
  detail?: string;
  hideUserName?: boolean;
  chips?: string[];
}

const ENTITY_LABELS: Record<string, string> = {
  variationorder: "Variation Order",
  requestforinformation: "Request for Information",
  siteinstruction: "Site Instruction",
  delaycertificate: "Delay Certificate",
  criticalpathitem: "Critical Path Item",
  generalinstruction: "General Instruction",
};

export const displayStatus = (status: string): string => {
  if (!status) return "";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const asText = (v: unknown): string =>
  v === null || v === undefined ? "" : typeof v === "string" ? v : String(v);

/** The description, minus a leading "<actor name>" the row already shows. */
const withoutActor = (desc: string, actor: string): string => {
  const name = actor.trim();
  if (name && desc.toLowerCase().startsWith(name.toLowerCase())) return desc.slice(name.length).trim();
  return desc;
};

const humaniseEntities = (text: string): string => {
  let out = text;
  for (const [key, label] of Object.entries(ENTITY_LABELS)) {
    out = out.replace(new RegExp(key, "gi"), label);
  }
  return out;
};

export function getActionLabel(log: AuditLogLike, taskCode?: string): AuditActionLabel {
  const action = (log.action || "").toLowerCase();
  const desc = (log.description || "") as string;

  if (action === "status_updated") {
    // Parse cause if present: "Status changed from X to Y; cause: Z"
    const causeIdx = desc.indexOf("; cause: ");
    const cleanDesc = causeIdx !== -1 ? desc.slice(0, causeIdx) : desc;
    const cause = causeIdx !== -1 ? desc.slice(causeIdx + 9).trim() : "";
    const detail = cause ? `Action: ${cause}` : undefined;

    const descLower = cleanDesc.toLowerCase();
    const fromIdx = descLower.indexOf("from ");
    const toIdx = descLower.lastIndexOf(" to ");
    if (fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx + 4) {
      const oldStatus = cleanDesc.slice(fromIdx + 5, toIdx).trim();
      const newStatus = cleanDesc.slice(toIdx + 4).trim();
      if (oldStatus && newStatus) {
        return { text: "Status changed from", oldStatus: displayStatus(oldStatus), newStatus: displayStatus(newStatus), detail, hideUserName: true };
      }
    }
    const raw = asText(log.newValue ?? log.new_value ?? log.to ?? log.value);
    const oldRaw = asText(log.oldValue ?? log.old_value ?? log.from);
    if (raw || oldRaw) {
      return {
        text: "Status changed from",
        oldStatus: oldRaw ? displayStatus(oldRaw) : undefined,
        newStatus: raw ? displayStatus(raw) : undefined,
        detail,
        hideUserName: true,
      };
    }
    return { text: "Status updated", detail, hideUserName: true };
  }

  const taskRef = taskCode ? ` ${taskCode}` : "";

  if (action === "task_created" || action === "created") return { text: `created this task${taskRef}` };
  if (action === "vo_created") return { text: `created a Variation Order${taskRef}` };
  if (action === "si_created") return { text: `created a Site Instruction${taskRef}` };
  if (action === "rfi_created") return { text: `created a Request for Information${taskRef}` };
  if (action === "dc_created") return { text: `created a Delay Certificate${taskRef}` };
  if (action === "cpi_created") return { text: "created a Critical Path Item" };

  if (action === "task_assigned") {
    const names = desc.startsWith("Assigned to: ") ? desc.slice(13).trim() : desc;
    const chips = names ? names.split(",").map((n) => n.trim()).filter(Boolean) : [];
    return { text: "assigned this task to", chips: chips.length > 0 ? chips : undefined };
  }

  if (action === "request_info") return { text: "requested additional information", detail: desc || undefined };

  if (action === "response_added") {
    // desc = "Maruf submitted a response on VARIATIONORDER — Approved"
    const detail = humaniseEntities(withoutActor(desc, log.createdByName || ""));
    return { text: "submitted a response", detail: detail || undefined };
  }

  if (action === "comment_added") return { text: "added a comment" };
  if (action === "assigned") return { text: "was assigned to this task" };
  if (action === "approved") return { text: "approved this task" };
  if (action === "rejected") return { text: "rejected this task" };

  // "other" is not an event name — it is the backend's catch-all, and the
  // event is in the description. Say what happened.
  if (action === "other" || action === "") {
    const said = humaniseEntities(withoutActor(desc, log.createdByName || ""));
    if (said) {
      // Lower-case an ordinary first word so it reads after the actor's
      // name ("Swapnil signed and issued…"), but never a code like "VO-203".
      const text = /^[A-Z][a-z]/.test(said) ? said.charAt(0).toLowerCase() + said.slice(1) : said;
      return { text };
    }
    return { text: "made a change" };
  }

  // Generic fallback — humanise snake_case
  const humanized = action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { text: humanized, detail: desc || undefined };
}
