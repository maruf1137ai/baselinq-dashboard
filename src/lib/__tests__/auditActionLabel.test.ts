/**
 * QA BUG-19: the task timeline read "Swapnil Other — Signed and issued by
 * Swapnil". `other` is the backend's catch-all action; the event itself is in
 * the description.
 */
import { describe, expect, it } from "vitest";

import { getActionLabel } from "@/lib/auditActionLabel";

describe("getActionLabel", () => {
  it("says what happened for an 'other' row, not 'Other'", () => {
    const l = getActionLabel({ action: "other", description: "Signed and issued by Swapnil", createdByName: "Swapnil" });
    expect(l.text).toBe("signed and issued by Swapnil");
    expect(l.text).not.toMatch(/^Other$/i);
    expect(l.detail).toBeUndefined();
  });

  it("drops a leading actor name the row already shows", () => {
    const l = getActionLabel({ action: "other", description: "Swapnil escalated RFI-006 to SI-009", createdByName: "Swapnil" });
    expect(l.text).toBe("escalated RFI-006 to SI-009");
  });

  it("keeps a code at the start intact", () => {
    expect(getActionLabel({ action: "other", description: "VO-203: value amended" }).text).toBe("VO-203: value amended");
  });

  it("has something to say when an 'other' row has no description", () => {
    expect(getActionLabel({ action: "other", description: "" }).text).toBe("made a change");
  });

  it("reads a status change from the description", () => {
    const l = getActionLabel({ action: "status_updated", description: "Status changed from Priced to Recommended" });
    expect(l).toMatchObject({ text: "Status changed from", oldStatus: "Priced", newStatus: "Recommended", hideUserName: true });
  });

  it("reads a status change from oldValue / newValue, which the API now sends", () => {
    const l = getActionLabel({ action: "status_updated", description: "", oldValue: "draft", newValue: "issued" });
    expect(l).toMatchObject({ oldStatus: "Draft", newStatus: "Issued" });
  });

  it("copes with audit values that are not strings", () => {
    // Values are JSON: numbers and objects (a contract amendment) as well as
    // status strings. The task page crashed on them once the API sent them.
    expect(() => getActionLabel({ action: "other", description: "Contract amended", oldValue: { value: 1 }, newValue: 2 })).not.toThrow();
    expect(getActionLabel({ action: "status_updated", description: "", oldValue: 1, newValue: 2 })).toMatchObject({ oldStatus: "1", newStatus: "2" });
  });

  it("humanises the entity in a response row", () => {
    const l = getActionLabel({ action: "response_added", description: "Maruf submitted a response on VARIATIONORDER", createdByName: "Maruf" });
    expect(l.text).toBe("submitted a response");
    expect(l.detail).toContain("Variation Order");
  });
});
