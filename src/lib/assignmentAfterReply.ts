/**
 * Werner spec — task reassignment after reply (frontend mirror).
 *
 * The backend is the source of truth (see tasks/assignment.py). This
 * module exposes pure helpers for the UI to predict the new assignee
 * before the network round-trip — so we can:
 *   • Optimistically update the assignee chip
 *   • Decide whether to show "Mark as assigned to me" hints
 *   • Validate that the current user is allowed to reply (the assigned
 *     party)
 *
 * Same rule the backend follows: after a reply, the new assignee is the
 * **original author** of the parent doc — unless they're the one who
 * just replied (in which case keep current).
 */

export type AssignableTask = {
  raisedBy?: { id?: string | number } | null;
  raised_by?: { id?: string | number } | null;
  submittedBy?: { id?: string | number } | null;
  submitted_by?: { id?: string | number } | null;
  issuedBy?: { id?: string | number } | null;
  issued_by?: { id?: string | number } | null;
  createdBy?: { id?: string | number } | null;
  created_by?: { id?: string | number } | null;
};

type IdLike = { id?: string | number } | null | undefined;

/**
 * Predict who the parent doc will be reassigned to after a reply.
 *
 * Returns the new assignee user object, or null if no reassignment
 * should happen (the reply author is the only author candidate).
 */
export function predictNextAssignee(
  task: AssignableTask | null | undefined,
  replyAuthor: IdLike,
): { id: string | number } | null {
  if (!task || !replyAuthor) return null;
  const replyId = String(replyAuthor.id ?? "");
  if (!replyId) return null;

  const candidates: Array<{ id?: string | number } | null | undefined> = [
    task.raisedBy ?? task.raised_by,
    task.submittedBy ?? task.submitted_by,
    task.issuedBy ?? task.issued_by,
    task.createdBy ?? task.created_by,
  ];

  for (const candidate of candidates) {
    if (!candidate || candidate.id == null) continue;
    if (String(candidate.id) === replyId) continue;
    return candidate as { id: string | number };
  }
  return null;
}
