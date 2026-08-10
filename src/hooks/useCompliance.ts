import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchData, patchData, postData } from "@/lib/Api";

export interface ComplianceObligation {
  _id: string;
  title: string;
  documentId: string;
  documentReference: string;
  documentName: string;
  dueDate: string | null;
  responsibleRole: string;
  status: "Pending" | "In Progress" | "Completed" | "Overdue";
  isOverdue: boolean;
  daysOverdue: number;
  daysUntilDue: number | null;
  evidenceCount: number;
  noticeContent: string;
  noticeGeneratedAt: string | null;
  notes: string;
}

export interface ComplianceCounts {
  overdue: number;
  pending: number;
  completed: number;
  total: number;
}

export function useComplianceObligations(projectId: string | number | null) {
  return useQuery<{ obligations: ComplianceObligation[]; counts: ComplianceCounts }>({
    queryKey: ["compliance-obligations", projectId],
    queryFn: () => fetchData(`documents/obligations/?project_id=${projectId}`),
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

export interface ObligationEvidenceItem {
  _id: string;
  fileName: string;
  fileType: string;
  downloadUrl: string;
  uploadedBy: { userId: string | null; name: string | null };
  createdAt: string;
}

export function useObligationEvidence(obligationId: string | number | null) {
  return useQuery<ObligationEvidenceItem[]>({
    queryKey: ["obligation-evidence", obligationId],
    queryFn: () => fetchData(`documents/obligations/${obligationId}/evidence/`),
    enabled: !!obligationId,
  });
}

export function useAddObligationEvidence(projectId: string | number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ obligationId, s3Key, fileName, fileType }: {
      obligationId: string | number; s3Key: string; fileName: string; fileType?: string;
    }) =>
      postData({
        url: `documents/obligations/${obligationId}/evidence/`,
        data: { s3_key: s3Key, file_name: fileName, file_type: fileType || "" },
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["obligation-evidence", variables.obligationId] });
      qc.invalidateQueries({ queryKey: ["compliance-obligations", projectId] });
    },
  });
}

export function useGenerateObligationNotice(projectId: string | number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (obligationId: string | number) =>
      postData({ url: `documents/obligations/${obligationId}/generate-notice/`, data: {} }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance-obligations", projectId] });
    },
  });
}

export function useUpdateObligationNotes(projectId: string | number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, obligationId, notes }: {
      documentId: string | number; obligationId: string | number; notes: string;
    }) =>
      patchData({ url: `documents/${documentId}/obligations/${obligationId}/`, data: { notes } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance-obligations", projectId] });
    },
  });
}
