import type { Folder, FolderTab } from '@/types/folder';

/** Human label for each tab. */
export const TAB_LABEL: Record<FolderTab, string> = {
  contracts: 'Contracts',
  drawings: 'Drawings',
  documents: 'Documents',
};

export interface FolderIndex {
  byId: Map<string, Folder>;
}

/**
 * Flatten a (possibly multi-tab) set of nested folder trees into an id→folder
 * map for O(1) lookups. The folders API has no `breadcrumb` field, so callers
 * build the ancestor chain from `parentId` via {@link folderNameChain}.
 */
export function buildFolderIndex(trees: Folder[]): FolderIndex {
  const byId = new Map<string, Folder>();
  const walk = (nodes: Folder[]) => {
    nodes.forEach((f) => {
      byId.set(f._id, f);
      if (f.children?.length) walk(f.children);
    });
  };
  walk(trees ?? []);
  return { byId };
}

/** Ordered ancestor folder-name chain (root → leaf), display-formatted. */
export function folderNameChain(folderId: string, byId: Map<string, Folder>): string[] {
  const chain: string[] = [];
  const seen = new Set<string>();
  let cur: string | null = folderId;
  while (cur && byId.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    const f = byId.get(cur)!;
    chain.unshift(f.name.replace(/_/g, ' '));
    cur = f.parentId ?? null;
  }
  return chain;
}

/** The display tab + folder path for a folder (no document name).
 *  Pass `fallback` so unfiled docs show "Tab / Unfiled" instead of just "Unfiled". */
export function buildFolderPath(
  folderId: string | null,
  byId: Map<string, Folder>,
  fallback?: { tab?: FolderTab | null; discipline?: string },
): string {
  if (!folderId || !byId.has(folderId)) {
    const parts: string[] = [];
    if (fallback?.tab) parts.push(TAB_LABEL[fallback.tab] ?? fallback.tab);
    if (fallback?.discipline) parts.push(fallback.discipline);
    parts.push('Unfiled');
    return parts.join(' / ');
  }
  const folder = byId.get(folderId)!;
  const parts: string[] = [TAB_LABEL[folder.tab] ?? folder.tab];
  if (folder.discipline) parts.push(folder.discipline);
  parts.push(...folderNameChain(folderId, byId));
  return parts.join(' / ');
}

/**
 * Full breadcrumb path for a document:
 *   "Drawings / Architectural / Tender / Floor Plan Rev 2"
 * Unfiled docs fall back to "<Tab> / Unfiled / name" using the doc's own tab
 * hint (folderTab) / discipline when its folder can't be resolved.
 */
export function buildDocPath(args: {
  tab: FolderTab | null;
  folderId: string | null;
  byId: Map<string, Folder>;
  docName: string;
  discipline?: string;
}): string {
  const { tab, folderId, byId, docName, discipline } = args;
  const parts: string[] = [];
  if (folderId && byId.has(folderId)) {
    const folder = byId.get(folderId)!;
    parts.push(TAB_LABEL[folder.tab] ?? folder.tab);
    if (folder.discipline) parts.push(folder.discipline);
    parts.push(...folderNameChain(folderId, byId));
  } else {
    if (tab) parts.push(TAB_LABEL[tab] ?? tab);
    if (discipline) parts.push(discipline);
    parts.push('Unfiled');
  }
  parts.push(docName);
  return parts.join(' / ');
}
