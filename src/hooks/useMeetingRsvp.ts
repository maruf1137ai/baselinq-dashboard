import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchData } from "@/lib/Api";

export type RsvpStatus = "invited" | "accepted" | "declined";

/** A reply to a meeting invite. A decline must say why (the server refuses an empty reason). */
export type RsvpReply =
  | { status: "accepted" }
  | { status: "declined"; reason: string };

export function useMeetingRsvp(meetingId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reply: RsvpReply) =>
      patchData({ url: `meetings/${meetingId}/rsvp/`, data: reply }),
    onSuccess: () => {
      const projectId = localStorage.getItem("selectedProjectId");
      if (projectId) {
        qc.invalidateQueries({ queryKey: [`meetings/?project_id=${projectId}`] });
      }
      qc.invalidateQueries({ queryKey: [`meetings/${meetingId}/`] });
    },
  });
}
