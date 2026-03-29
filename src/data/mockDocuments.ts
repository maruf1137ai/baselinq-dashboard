export type DocType = 'Contract' | 'Report' | 'Certificate' | 'Specification' | 'Drawing';

export interface MockDocument {
  id: number;
  name: string;
  type: DocType;
  reference: string;
  linkedCount: number;
  aiFlags: number;
  aiSeverity: 'high' | 'medium' | 'low' | 'none';
  aiStatus: 'complete' | 'running' | 'pending';
  version: string;
  revision?: string;         // Letter revision for drawings (A, B, C, P1...)
  revisionHistory?: string[]; // All revisions in order
  updatedAt: string;
  discipline: string;
  isGated?: boolean;
  isNew?: boolean;
}

export interface DrawingIssue {
  id: number;
  documentId: number;
  revision: string;
  issueType: 'site_copy' | 'office_copy' | 'for_construction' | 'for_review';
  issuedAt: string;
  issuedBy: string;
  notes?: string;
}

export const mockDocuments: MockDocument[] = [
  {
    id: 1,
    name: 'JBCC Principal Building Agreement',
    type: 'Contract',
    reference: 'CONT-001',
    linkedCount: 5,
    aiFlags: 4,
    aiSeverity: 'high',
    aiStatus: 'complete',
    version: 'v3',
    updatedAt: '2025-10-20T14:30:00Z',
    discipline: 'Legal',
    isNew: true,
  },
  {
    id: 2,
    name: 'Structural Engineering Report - Block A',
    type: 'Report',
    reference: 'RPT-002',
    linkedCount: 2,
    aiFlags: 1,
    aiSeverity: 'low',
    aiStatus: 'complete',
    version: 'v2',
    updatedAt: '2025-10-18T09:15:00Z',
    discipline: 'Structural',
  },
  {
    id: 3,
    name: 'Fire Safety Certificate Application',
    type: 'Certificate',
    reference: 'CERT-003',
    linkedCount: 3,
    aiFlags: 2,
    aiSeverity: 'medium',
    aiStatus: 'complete',
    version: 'v1',
    updatedAt: '2025-10-15T16:45:00Z',
    discipline: 'Environmental',
  },
  {
    id: 4,
    name: 'HVAC System Technical Specifications',
    type: 'Specification',
    reference: 'SPEC-004',
    linkedCount: 2,
    aiFlags: 0,
    aiSeverity: 'none',
    aiStatus: 'pending',
    version: 'v4',
    updatedAt: '2025-10-22T11:20:00Z',
    discipline: 'MEP',
    isGated: true,
  },
  {
    id: 5,
    name: 'Site Layout Plan',
    type: 'Drawing',
    reference: 'DWG-005',
    linkedCount: 2,
    aiFlags: 1,
    aiSeverity: 'low',
    aiStatus: 'complete',
    version: 'v5',
    revision: 'C',
    revisionHistory: ['P1', 'A', 'B', 'C'],
    updatedAt: '2025-12-01T15:00:00Z',
    discipline: 'Architectural',
  },
  {
    id: 6,
    name: 'Block A Foundation Plan',
    type: 'Drawing',
    reference: 'DWG-006',
    linkedCount: 1,
    aiFlags: 0,
    aiSeverity: 'none',
    aiStatus: 'complete',
    version: 'v2',
    revision: 'B',
    revisionHistory: ['A', 'B'],
    updatedAt: '2025-11-20T10:00:00Z',
    discipline: 'Structural',
  },
  {
    id: 7,
    name: 'Electrical Distribution Layout',
    type: 'Drawing',
    reference: 'DWG-007',
    linkedCount: 0,
    aiFlags: 0,
    aiSeverity: 'none',
    aiStatus: 'pending',
    version: 'v1',
    revision: 'A',
    revisionHistory: ['A'],
    updatedAt: '2025-11-10T08:00:00Z',
    discipline: 'MEP',
  },
  {
    id: 8,
    name: 'Roof Plan & Drainage Layout',
    type: 'Drawing',
    reference: 'DWG-008',
    linkedCount: 3,
    aiFlags: 0,
    aiSeverity: 'none',
    aiStatus: 'complete',
    version: 'v4',
    revision: 'D',
    revisionHistory: ['A', 'B', 'C', 'D'],
    updatedAt: '2025-12-10T09:30:00Z',
    discipline: 'Architectural',
  },
];

// Drawing issue records — tracks each time a drawing was issued to site or as office copy
export const mockDrawingIssues: DrawingIssue[] = [
  // DWG-005 — Site Layout Plan
  {
    id: 1,
    documentId: 5,
    revision: 'P1',
    issueType: 'for_review',
    issuedAt: '2025-10-01T09:00:00Z',
    issuedBy: 'Maruf M.',
    notes: 'Preliminary issue for architect review',
  },
  {
    id: 2,
    documentId: 5,
    revision: 'A',
    issueType: 'office_copy',
    issuedAt: '2025-10-15T14:00:00Z',
    issuedBy: 'Maruf M.',
  },
  {
    id: 3,
    documentId: 5,
    revision: 'A',
    issueType: 'site_copy',
    issuedAt: '2025-10-20T08:00:00Z',
    issuedBy: 'Warner B.',
    notes: 'Issued to site for excavation set-out',
  },
  {
    id: 4,
    documentId: 5,
    revision: 'B',
    issueType: 'office_copy',
    issuedAt: '2025-11-05T10:00:00Z',
    issuedBy: 'Maruf M.',
    notes: 'Updated setback dimensions per surveyor',
  },
  {
    id: 5,
    documentId: 5,
    revision: 'B',
    issueType: 'site_copy',
    issuedAt: '2025-11-10T08:30:00Z',
    issuedBy: 'Warner B.',
  },
  {
    id: 6,
    documentId: 5,
    revision: 'C',
    issueType: 'office_copy',
    issuedAt: '2025-12-01T15:00:00Z',
    issuedBy: 'Maruf M.',
    notes: 'Revised after structural coordination meeting',
  },
  // Rev C not yet issued to site — this is the actionable gap

  // DWG-006 — Block A Foundation Plan
  {
    id: 7,
    documentId: 6,
    revision: 'A',
    issueType: 'for_review',
    issuedAt: '2025-11-01T09:00:00Z',
    issuedBy: 'Maruf M.',
  },
  {
    id: 8,
    documentId: 6,
    revision: 'A',
    issueType: 'site_copy',
    issuedAt: '2025-11-08T08:00:00Z',
    issuedBy: 'Warner B.',
    notes: 'Issued for piling works',
  },
  {
    id: 9,
    documentId: 6,
    revision: 'B',
    issueType: 'office_copy',
    issuedAt: '2025-11-20T10:00:00Z',
    issuedBy: 'Maruf M.',
    notes: 'Revised pile cap layout',
  },

  // DWG-007 — Electrical Distribution Layout
  {
    id: 10,
    documentId: 7,
    revision: 'A',
    issueType: 'for_review',
    issuedAt: '2025-11-10T08:00:00Z',
    issuedBy: 'Maruf M.',
    notes: 'First issue for MEP coordination',
  },

  // DWG-008 — Roof Plan
  {
    id: 11,
    documentId: 8,
    revision: 'A',
    issueType: 'for_review',
    issuedAt: '2025-10-05T09:00:00Z',
    issuedBy: 'Maruf M.',
  },
  {
    id: 12,
    documentId: 8,
    revision: 'B',
    issueType: 'site_copy',
    issuedAt: '2025-10-20T08:00:00Z',
    issuedBy: 'Warner B.',
  },
  {
    id: 13,
    documentId: 8,
    revision: 'C',
    issueType: 'site_copy',
    issuedAt: '2025-11-15T08:00:00Z',
    issuedBy: 'Warner B.',
    notes: 'Issued for roof structure works',
  },
  {
    id: 14,
    documentId: 8,
    revision: 'D',
    issueType: 'office_copy',
    issuedAt: '2025-12-10T09:30:00Z',
    issuedBy: 'Maruf M.',
    notes: 'Final drainage layout update',
  },
];
