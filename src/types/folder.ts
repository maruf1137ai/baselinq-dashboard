/**
 * Folder type definition for the documents folder structure.
 * Matches the backend Folder model serialization (FolderSerializer).
 */

export type FolderTab = 'contracts' | 'drawings' | 'documents';

export type FolderVisibility = 'all' | 'professional_team' | 'contractor' | 'individual';

export interface Folder {
  _id: string;
  projectId: string;
  tab: FolderTab;
  name: string;
  discipline: string;
  visibility: FolderVisibility;
  visibilityUsers: string[];
  isSystem: boolean;
  parentId: string | null;
  order: number;
  children: Folder[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Flattened folder for form submissions / API requests.
 */
export interface FolderCreateRequest {
  projectId: string;
  tab: FolderTab;
  name: string;
  discipline?: string;
  parentId?: string | null;
  visibility?: FolderVisibility;
  visibilityUsers?: string[];
}
