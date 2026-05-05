import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchData } from "@/lib/Api";

export type RsvpStatus = "invited" | "accepted" | "declined";

export function useMeetingRsvp(meetingId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rsvpStatus: "accepted" | "declined") =>
      patchData({ url: `meetings/${meetingId}/rsvp/`, data: { status: rsvpStatus } }),
    onSuccess: () => {
      const projectId = localStorage.getItem("selectedProjectId");
      if (projectId) {
        qc.invalidateQueries({ queryKey: [`meetings/?project_id=${projectId}`] });
      }
      qc.invalidateQueries({ queryKey: [`meetings/${meetingId}/`] });
    },
  });
}
