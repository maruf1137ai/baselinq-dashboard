/**
 * What a drop on the task board may do.
 *
 * The board's columns (Open, Under Review, Resolved) are not contract
 * statuses. Dragging a card to another column used to send a status to
 * `tasks/tasks/<id>/update-entity/`, which could close an RFI, SI, GI, IC or
 * claim with none of the checks its own Close or Sign action makes, and
 * posted a "status_change" message to the record's chat. Now a drop within a
 * column only reorders the cards on screen, and a drop on another column is
 * refused with a pointer to the record's own actions. Nothing is saved
 * either way.
 */
export function boardDrop(from: string, to: string): "reorder" | "refuse" {
  return from === to ? "reorder" : "refuse";
}

export const BOARD_DROP_REFUSED = (code: string) =>
  `Moving a card does not change its status. Open ${code} and use its own actions to reply, close or sign it.`;
