export type DocCategory = "Drawings" | "Documents" | "Contracts";

// Map from backend type field → frontend category
export const TYPE_TO_CATEGORY: Record<string, DocCategory> = {
  "Drawing": "Drawings",
  "Contract": "Contracts",
  "Contract Agreement": "Contracts",
  "Specification": "Documents",
  "Report": "Documents",
  "Certificate": "Documents",
};

// Map from a folder's backend tab → frontend category. A filed document's
// category follows the folder it lives in — this is authoritative over the
// type→category guess below.
export const TAB_TO_CATEGORY: Record<string, DocCategory> = {
  contracts: "Contracts",
  drawings: "Drawings",
  documents: "Documents",
};

/**
 * Which tab a document belongs to in the Documents file browser.
 *
 * When the doc is FILED (has a folder), route by the folder's tab — that's
 * where the user put it, and it's the only correct answer when a type maps to
 * a different category than its folder (e.g. a signed VO certificate has
 * type "Certificate" → would map to "Documents", but it's filed in the
 * Contracts tree, so it must show under Contracts). Fall back to the
 * type→category map only for unfiled docs (no folder tab available).
 */
export function getCategoryForDoc(doc: { type?: string; folderTab?: string | null }): DocCategory {
  const byTab = doc.folderTab ? TAB_TO_CATEGORY[doc.folderTab] : undefined;
  if (byTab) return byTab;
  return TYPE_TO_CATEGORY[doc.type ?? ""] ?? "Documents";
}

export const CATEGORY_COLORS: Record<DocCategory, { bg: string; fg: string; border: string }> = {
  Drawings: { bg: "bg-blue-50", fg: "text-blue-700", border: "border-blue-200" },
  Documents: { bg: "bg-slate-50", fg: "text-slate-700", border: "border-slate-200" },
  Contracts: { bg: "bg-amber-50", fg: "text-amber-700", border: "border-amber-200" },
};

export const CATEGORIES: DocCategory[] = ["Drawings", "Documents", "Contracts"];

// Map category → allowed document types
export const CATEGORY_TO_TYPES: Record<DocCategory, string[]> = {
  Drawings: ["Drawing"],
  Documents: ["Specification", "Report", "Certificate"],
  Contracts: ["Contract", "Contract Agreement"],
};

// Issue-register statuses (shared by the upload wizard and the cross-tab
// move dialog — single source of truth).
export const ISSUE_STATUSES = [
  "For Information",
  "For Approval",
  "For Construction",
  "For Tender",
  "For Construction Issue",
] as const;

// Expanded fixed discipline list (from client meeting, see proposal §4).
export const DISCIPLINES = [
  "Architectural",
  "Structural",
  "Civil",
  "Mechanical (MEP)",
  "Electrical (MEP)",
  "Plumbing (MEP)",
  "Quantity Surveying",
  "Project Management",
  "Fire Safety",
  "Landscape",
  "Interior Design",
  "Environmental",
  "Geotechnical",
  "Health & Safety",
  "Traffic",
  "Acoustic",
  "Sustainability (ESD)",
  "Building Surveyor",
  "Planner",
  "Legal",
  "Other",
] as const;

export const DOCUMENT_TYPES = [
  "Drawing",
  "Contract",
  "Contract Agreement",
  "Specification",
  "Report",
  "Certificate",
] as const;

// ----------------------------------------------------------------------------
// Sub-category display names — what each backend `type` value means to a user
// in the context of its category. Used for nicer labels in the UI without
// needing a backend migration.
// ----------------------------------------------------------------------------
export const SUBCATEGORY_LABEL: Record<string, string> = {
  // Drawings
  "Drawing": "Drawing",
  // Contracts
  "Contract": "Signed Contract",
  "Contract Agreement": "Contract Agreement",
  // Documents
  "Specification": "Specification",
  "Report": "Report",
  "Certificate": "Certificate",
};

// ----------------------------------------------------------------------------
// TARGET sub-category lists from the 23 Apr client meeting.
// These are what the UX should EVENTUALLY offer once the backend subfolder
// model lands (see docs/DOCUMENTS_BACKEND_CHANGES_NEEDED.md §2).
//
// Until then, use these ONLY as reference / hints in the UI — don't submit
// them as `type` values because the backend enum doesn't accept them.
// ----------------------------------------------------------------------------
export const TARGET_SUBCATEGORIES_BY_CATEGORY: Record<DocCategory, string[]> = {
  Drawings: [
    "Concepts",
    "Design Development",
    "Tender",
    "Council Drawings",
    "Construction Drawings",
    "As-Built",
  ],
  Documents: [
    "Reports",
    "Specifications",
    "Schedules",
    "Bill of Quantities",
    "Compliance Certificates",
    "Insurance Certificates",
    "Test Certificates",
  ],
  Contracts: [
    "Appointment Letter",
    "Pre-Proposal / Free Proposal",
    "Signed Contract",
    "Payment Certificates",
    "Tender",
    "Contract Documentation",
    "Variations",
  ],
};
