import axios from "axios";

// Project types
export interface ProjectDocument {
  id?: number | string;
  _id?: number | string;
  file_name?: string;
  fileName?: string;
  file_url?: string;
  fileUrl?: string;
  s3_key?: string;
  uploaded_at?: string;
  uploadedAt?: string;
  name?: string;
  metadata?: any;
}

export interface ProjectData {
  id?: number | string;
  _id?: number | string;
  name: string;
  project_number?: string;
  projectNumber?: string;
  user_id?: string;
  userId?: string;
  description?: string;
  location?: string;
  // The API returns decimals; the create form sends them as fixed-decimal
  // strings, which it also accepts.
  latitude?: number | string | null;
  longitude?: number | string | null;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  total_budget?: string | number;
  totalBudget?: string | number;
  fx_rate?: string | number;
  fxRate?: string | number;
  contract_type?: string;
  contractType?: string;
  retention_rate?: string | number;
  retentionRate?: string | number;
  vat_rate?: string | number;
  vatRate?: string | number;
  documents?: ProjectDocument[];
  status?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

/**
 * Endpoints that work signed-out. They must not carry a stored access token:
 * the backend authenticates any Bearer header before the view runs, so a
 * stale one fails sign-in with 401 token_not_valid and the user can never
 * reach the email/password check — and login 401s are never refreshed.
 */
const PUBLIC_AUTH_PATHS = [
  'auth/login/',
  'auth/register/',
  'auth/check-email/',
  'auth/password/reset/',
];

export const isPublicAuthRequest = (url: string = ''): boolean =>
  PUBLIC_AUTH_PATHS.some((path) => url.includes(path));

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access");
    if (token && !config.headers.Authorization && !isPublicAuthRequest(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

const handleError = (error) => {
  // Surface the backend-provided message (e.g. DRF `error`/`detail`) so toasts
  // show the real reason instead of a bare "HTTP error! status: NNN". Only use a
  // string — DRF validation errors can be objects/arrays, which fall back to the
  // status. Still throws an Error (no `.response`), preserving the prior contract.
  const data = error.response?.data;
  const backendMessage = [data?.error, data?.detail, data?.message].find(
    (m) => typeof m === "string" && m.trim().length > 0,
  );
  const err: Error & { status?: number; code?: string } = new Error(
    backendMessage ||
      (error.response
        ? `HTTP error! status: ${error.response.status}`
        : error.message),
  );
  // Additive: the HTTP status (and the server's stable `code`) ride along so
  // a caller can tell "no access" from "server down" — a 403 used to be
  // indistinguishable from an outage by the time it reached a query.
  if (error.response) {
    err.status = error.response.status;
    if (typeof data?.code === "string") err.code = data.code;
  }
  throw err;
};

export const fetchData = async (url) => {
  if (!url) throw new Error("No URL provided");
  try {
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const postData = async ({
  url,
  data,
  config = {},
}: {
  url: string;
  data?: any;
  config?: any;
}) => {
  if (!url) throw new Error("No post URL provided");

  try {
    const response = await api.post(url, data, config);
    return response.data; // + your 201 success body
  } catch (error) {
    // Axios errors carry status here
    throw error;
  }
};

// export const deleteData = async ({ url }) => {
//   if (!url) throw new Error('No URL provided');
//   try {
//     const response = await api.delete(url);
//     return response.data;
//   } catch (error) {
//     handleError(error);
//   }
// };

export const deleteData = async ({ url, data }) => {
  if (!url) throw new Error("No URL provided");

  try {
    const response = await api.delete(url, data ? { data } : undefined);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const putData = async ({ url, data }) => {
  if (!url) throw new Error("No put URL provided");
  try {
    const response = await api.put(url, data);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/** PUT projects/<id>/payment-terms/ — null on a field returns it to the contract form's default. */
export const updatePaymentTerms = (projectId: string | number, data: Record<string, unknown>) =>
  putData({ url: `projects/${projectId}/payment-terms/`, data });

/** PATCH projects/<id>/risk-policy/ — e.g. valuation_basis, pc_gate_mode. */
export const updateRiskPolicy = (projectId: string | number, data: Record<string, unknown>) =>
  patchData({ url: `projects/${projectId}/risk-policy/`, data });

export const patchData = async ({ url, data }) => {
  if (!url) throw new Error("No patch URL provided");
  try {
    const response = await api.patch(url, data);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const loginUser = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  const res = await api.post("auth/login/", { email, password });
  return res.data; // { message, user, tokens: { access, refresh } }
};

export interface RegisterPayload {
  // credentials
  name: string;
  email: string;
  password: string;
  password_confirm: string;
  // profile (optional — filled later via complete-profile flow)
  role?: string;
  account_type?: "organisation" | "individual";
  // organisation
  company_name?: string;
  company_reg_number?: string;
  ck_number?: string;
  vat_number?: string;
  company_size?: string;
  // individual
  id_number?: string;
  // shared
  professional_body?: string;
  professional_reg_number?: string;
  insurance_expiry?: string;
  // address info
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone_number?: string;
  // team invites (organisations only)
  team_invites?: { email: string; position: string }[];
}

export const registerUser = async (payload: RegisterPayload) => {
  const res = await api.post("auth/register/", payload);
  return res.data;
};

export const inviteClient = async (payload: { client_name: string; client_email: string; project_id?: number | string }) => {
  const res = await api.post("auth/invite-client/", payload);
  return res.data;
};

export const inviteUser = async (data: {
  name: string;
  email: string;
  role_code: string;
  project_id?: number | string;
}) => {
  const res = await api.post("auth/invite-personnel/", data);
  return res.data;
};

export const inviteAppointedCompany = async (data: {
  company_name: string;
  company_type?: string;
  contact_name: string;
  contact_email: string;
  project_id: number | string;
  position?: string;
  insurance_s3_key?: string;
  insurance_file_name?: string;
  insurance_expiry?: string;
}) => {
  const res = await api.post("auth/invite-appointed-company/", data);
  return res.data;
};

export const getAssociatedCompanies = async (
  projectId: string | number
): Promise<{ id: number; name: string; role: string; companyType: string }[]> => {
  const res = await api.get(`projects/${projectId}/associated-companies/`);
  return res.data;
};

export const createAssociatedCompany = async (
  projectId: string | number,
  data: { company_name: string; company_type?: string; role?: string; contact_name?: string; contact_email?: string }
): Promise<{ id: number; company_name: string; created: boolean }> => {
  const res = await api.post(`projects/${projectId}/create-associated-company/`, data);
  return res.data;
};

export interface AppointedCompany {
  id: string | number;
  company_name: string;
  company_type?: string;
  role: string;
  status: string;
  contact_name: string;
  email: string;
  admin_user_id: number | null;
  members: {
    id: string | number;
    team_member_id?: number;
    name: string;
    email: string;
    role: string;
    status?: string;
    invitation_id?: number;
    insurance_file_name?: string | null;
    insurance_expiry?: string | null;
    insurance_url?: string | null;
  }[];
  insurance_file_name: string | null;
  insurance_expiry: string | null;
  insurance_url: string | null;
}

export interface AdminOverview {
  users: { total: number; active: number; superusers: number; newLast30Days: number };
  organizations: { total: number };
  projects: { total: number; byStatus: Record<string, number>; newLast30Days: number };
  documents: { total: number };
  tasks: { total: number };
  meetings: { total: number };
  recentUsers: {
    id: number;
    name: string;
    email: string;
    organization: string | null;
    isActive: boolean;
    isSuperuser: boolean;
    dateJoined: string;
    lastLogin: string | null;
  }[];
  recentProjects: {
    id: number;
    name: string;
    status: string;
    createdBy: string | null;
    createdAt: string;
  }[];
}

/** Platform-wide overview for the admin panel. Superusers only (403 otherwise). */
export const getAdminOverview = async () => {
  const res = await api.get("auth/admin-panel/overview/");
  return res.data as AdminOverview;
};

export type AdminStatsRange = "7d" | "30d" | "90d" | "12m";

/** A figure for the chosen range beside the same-length range before it. */
export interface AdminKpi<T = number> {
  total?: number | null;
  current: T;
  previous: T;
}

/** One chart bucket — a day, a week (Monday) or a month, starting `start`. Money is a string. */
export interface AdminStatsBucket {
  start: string;
  newUsers: number;
  activeUsers: number;
  newProjects: number;
  feesEarned: string;
  feesPaid: string;
  certificates: number;
  variations: number;
  tasks: number;
  documents: number;
  meetings: number;
  aiCalls: number;
  aiCostUsd: string;
}

export interface AdminAttentionItem {
  key: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  count: number;
  link: string | null;
}

export interface AdminStats {
  range: AdminStatsRange;
  bucket: "day" | "week" | "month";
  start: string;
  end: string;
  kpis: {
    users: AdminKpi;
    activeUsers: AdminKpi;
    projects: AdminKpi;
    companies: AdminKpi;
    feesEarned: AdminKpi<string>;
    feesPaid: AdminKpi<string>;
  };
  series: AdminStatsBucket[];
  attention: AdminAttentionItem[];
  recentAdminActions: { id: number; actor: string | null; action: string; targetLabel: string; createdAt: string }[];
}

/** Dashboard charts, trends and what needs attention. Superusers only. */
export const getAdminStats = async (range: AdminStatsRange) => {
  const res = await api.get("auth/admin-panel/stats/", { params: { range } });
  return res.data as AdminStats;
};

/** Admin list pages return the full match `count` and at most 200 `results`. */
export interface AdminList<T> {
  count: number;
  results: T[];
}

/** A paged admin list: `count` matches across `pages` pages of `pageSize`. */
export interface AdminPage<T> extends AdminList<T> {
  page: number;
  pageSize: number;
  pages: number;
}

/** Filters, sort and page for an admin list — empty values are left out. */
export type AdminListParams = Record<string, string | number | undefined>;

const cleanParams = (params: AdminListParams) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""));

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  organization: string | null;
  organizationId: number | null;
  role: string | null;
  accountType: string;
  projectCount: number;
  isActive: boolean;
  isStaff: boolean;
  isSuperuser: boolean;
  isLocked: boolean;
  dateJoined: string;
  lastLogin: string | null;
  lastActiveOn: string | null;
}

export interface AdminHistoryEntry {
  action: string;
  actor: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserRow {
  isEmailVerified: boolean;
  failedLoginAttempts: number;
  loginLockedUntil: string | null;
  signingPinSet: boolean;
  signingPinLockedUntil: string | null;
  activeDaysLast30: number;
  invitationsSent: number;
  projects: { id: number; name: string; number: string; status: string; role: string; isActive: boolean; owner: boolean }[];
  recentActivity: { action: string; description: string; project: string | null; createdAt: string }[];
  adminHistory: AdminHistoryEntry[];
}

export type AdminUserAction =
  | "deactivate" | "reactivate" | "unlock" | "clear_pin"
  | "grant_staff" | "revoke_staff" | "grant_superuser" | "revoke_superuser";

export interface AdminInvitationRow {
  id: number;
  email: string;
  name: string;
  position: string;
  type: string;
  status: "pending" | "expired" | "accepted";
  invitedBy: string | null;
  organization: string | null;
  project: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface AdminProjectRow {
  id: number;
  name: string;
  projectNumber: string;
  status: string;
  location: string | null;
  company: string | null;
  createdBy: string | null;
  userCount: number;
  billing: "on" | "off" | "not_configured";
  lastActivity: string | null;
  inactive: boolean;
  createdAt: string;
}

export interface AdminProjectDetail extends AdminProjectRow {
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  contractValue: string | null;
  currency: string | null;
  statusChoices: string[];
  team: { userId: number; name: string; email: string; role: string; company: string | null; isActive: boolean; joined: string }[];
  associatedCompanies: { name: string; role: string; type: string; contact: string }[];
  counts: {
    tasks: number; openTasks: number; overdueTasks: number;
    variations: number; approvedVariations: number;
    certificates: number; postedCertificates: number; certifiedValue: string;
    documents: number; meetings: number; openRiskSignals: number;
  };
  billingSummary: {
    state: "on" | "off" | "not_configured";
    feeRatePct: number | null;
    billingContactEmail: string;
    unbilledTotal: string;
    outstandingTotal: string;
  };
  adminHistory: AdminHistoryEntry[];
}

export const getAdminUsers = async (params: AdminListParams = {}) => {
  const res = await api.get("auth/admin-panel/users/", { params: cleanParams(params) });
  return res.data as AdminPage<AdminUserRow>;
};

export const getAdminUser = async (id: number) => {
  const res = await api.get(`auth/admin-panel/users/${id}/`);
  return res.data as AdminUserDetail;
};

/** Returns the user as they are after the action. */
export const postAdminUserAction = async (id: number, action: AdminUserAction, reason = "") => {
  const res = await api.post(`auth/admin-panel/users/${id}/${action}/`, { reason });
  return res.data as AdminUserDetail;
};

export const getAdminInvitations = async (params: AdminListParams = {}) => {
  const res = await api.get("auth/admin-panel/invitations/", { params: cleanParams(params) });
  return res.data as AdminPage<AdminInvitationRow>;
};

export const postAdminInvitationAction = async (id: number, action: "resend" | "cancel") => {
  const res = await api.post(`auth/admin-panel/invitations/${id}/${action}/`, {});
  return res.data as { resent?: boolean; emailSent?: boolean; cancelled?: boolean };
};

export const getAdminProjects = async (params: AdminListParams = {}) => {
  const res = await api.get("auth/admin-panel/projects/", { params: cleanParams(params) });
  return res.data as AdminPage<AdminProjectRow>;
};

export const getAdminProject = async (id: number) => {
  const res = await api.get(`auth/admin-panel/projects/${id}/`);
  return res.data as AdminProjectDetail;
};

export const postAdminProjectStatus = async (id: number, status: string, reason: string) => {
  const res = await api.post(`auth/admin-panel/projects/${id}/status/`, { status, reason });
  return res.data as AdminProjectDetail;
};

/**
 * Download an admin CSV export with the current filters. Goes through the
 * authenticated client (the export needs the bearer token), then hands the
 * file to the browser.
 */
export const downloadAdminExport = async (path: "users" | "projects", params: AdminListParams = {}) => {
  const res = await api.get(`auth/admin-panel/${path}/export/`, {
    params: cleanParams({ ...params, page: undefined, pageSize: undefined }),
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `baselinq-${path}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export interface AdminCompanyRow {
  id: number;
  name: string;
  status: "active" | "inactive" | "suspended";
  vatNumber: string | null;
  registrationNumber: string | null;
  companySize: string | null;
  userCount: number;
  projectCount: number;
  createdAt: string;
}

export interface AdminCompanyDetail extends AdminCompanyRow {
  description: string | null;
  ckNumber: string | null;
  users: { id: number; name: string; email: string; isActive: boolean; role: string | null; lastActiveOn: string | null }[];
  projects: { id: number; name: string; number: string; status: string }[];
  money: { certifiedValue: string; feesCharged: string; invoicedUnpaid: string; paid: string };
  statusChoices: string[];
  adminHistory: AdminHistoryEntry[];
}

export const getAdminCompanies = async (params: AdminListParams = {}) => {
  const res = await api.get("auth/admin-panel/companies/", { params: cleanParams(params) });
  return res.data as AdminPage<AdminCompanyRow>;
};

export const getAdminCompany = async (id: number) => {
  const res = await api.get(`auth/admin-panel/companies/${id}/`);
  return res.data as AdminCompanyDetail;
};

export const patchAdminCompany = async (id: number, data: Partial<Record<"name" | "description" | "vatNumber" | "registrationNumber" | "ckNumber" | "companySize", string>>) => {
  const res = await api.patch(`auth/admin-panel/companies/${id}/`, data);
  return res.data as AdminCompanyDetail;
};

/** Suspended companies' users cannot sign in (server-enforced). */
export const postAdminCompanyStatus = async (id: number, status: string, reason: string) => {
  const res = await api.post(`auth/admin-panel/companies/${id}/status/`, { status, reason });
  return res.data as AdminCompanyDetail;
};

export const postAdminUserCompany = async (userId: number, organizationId: number | null, reason: string) => {
  const res = await api.post(`auth/admin-panel/users/${userId}/company/`, { organizationId, reason });
  return res.data as { id: number; organization: string | null; organizationId: number | null };
};

export interface AdminStaffMember {
  id: number;
  name: string;
  email: string;
  isSuperuser: boolean;
  isActive: boolean;
  lastLogin: string | null;
  lastActiveOn: string | null;
  actionsLast30Days: number;
  lastActionAt: string | null;
}

export interface AdminAuditEntry {
  id: number;
  actor: string | null;
  actorId: number | null;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export const getAdminStaff = async () => {
  const res = await api.get("auth/admin-panel/staff/");
  return res.data as { results: AdminStaffMember[] };
};

export const getAdminAudit = async (params: AdminListParams = {}) => {
  const res = await api.get("auth/admin-panel/audit/", { params: cleanParams(params) });
  return res.data as AdminPage<AdminAuditEntry>;
};

export interface AdminHealthCheck {
  key: string;
  title: string;
  state: "ok" | "warning" | "critical";
  summary: string;
  detail: string[];
}

export interface AdminHealth {
  checkedAt: string;
  checks: AdminHealthCheck[];
  recentDeliveryFailures: { channel: string; target: string; error: string; at: string }[];
  recentJobFailures: { kind: string; error: string; at: string }[];
  aiByFeature: { feature: string; calls: number; errors: number; costUsd: string }[];
  aiTopProjects: { projectId: number; project: string; calls: number; costUsd: string }[];
  activeUsersToday: number;
}

export const getAdminHealth = async () => {
  const res = await api.get("auth/admin-panel/health/");
  return res.data as AdminHealth;
};

export const getAppointedCompanies = async (projectId: string | number) => {
  const res = await api.get(`projects/${projectId}/appointed-companies/`);
  return res.data as AppointedCompany[];
};

export const removeAppointedCompany = async (projectId: string | number, companyId: string | number) => {
  const res = await api.delete(`projects/${projectId}/appointed-companies/${companyId}/remove/`);
  return res.data;
};

export const updateAppointedCompany = async (
  projectId: string | number,
  companyId: string | number,
  data: { name?: string; company_type?: string; role?: string; contact_name?: string; contact_email?: string }
) => {
  const res = await api.patch(`projects/${projectId}/appointed-companies/${companyId}/update/`, data);
  return res.data;
};

export const inviteCompanyMember = async (
  projectId: string | number,
  companyId: string | number,
  data: { contact_email: string; contact_name?: string; position?: string }
) => {
  const res = await api.post(`projects/${projectId}/appointed-companies/${companyId}/invite-member/`, data);
  return res.data;
};

export const revokeCompanyInvite = async (
  projectId: string | number,
  companyId: string | number,
  invitationId: string | number
) => {
  const res = await api.delete(`projects/${projectId}/appointed-companies/${companyId}/revoke-invite/${invitationId}/`);
  return res.data;
};

export const updateCompanyMemberRole = async (
  projectId: string | number,
  teamMemberId: string | number,
  role: string
) => {
  const res = await api.patch(`projects/${projectId}/team-members/${teamMemberId}/`, { role_name: role });
  return res.data;
};

export const removeCompanyMember = async (
  projectId: string | number,
  teamMemberId: string | number
) => {
  const res = await api.delete(`projects/${projectId}/team-members/${teamMemberId}/`);
  return res.data;
};

export const getProfile = async () => {
  const res = await api.get("auth/profile/");
  return res.data;
};

export const updateProfile = async (data: any) => {
  const res = await api.put("auth/profile/update/", data);
  return res.data;
};

export const getOrgMembers = async () => {
  const res = await api.get("auth/organization/members/");
  return res.data as {
    members: { id: number; name: string; email: string; role: string | null; role_code: string | null }[];
    pending_invitations: { id: number; email: string; name: string; position: string; invited_at: string; expires_at: string }[];
  };
};

export const orgInviteMember = async (data: { name: string; email: string; position: string }) => {
  const res = await api.post("auth/organization/members/invite/", data);
  return res.data;
};

export const orgRemoveMember = async (userId: number) => {
  const res = await api.delete(`auth/organization/members/${userId}/`);
  return res.data;
};

export const orgCancelInvitation = async (invitationId: number) => {
  const res = await api.delete(`auth/organization/invitations/${invitationId}/`);
  return res.data;
};

export const fetchInvitation = async (token: string) => {
  const res = await api.get(`auth/invitations/${token}/`);
  return res.data as {
    email: string;
    position: string;
    contact_name: string;
    invited_by: string;
    organization: string | null;
    expires_at: string;
    user_exists: boolean;
  };
};

export interface AcceptInvitationPayload {
  name: string;
  password: string;
  password_confirm: string;
  id_number?: string;
  professional_body?: string;
  professional_reg_number?: string;
  // Address
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  // Banking
  bank_name?: string;
  branch_name?: string;
  branch_code?: string;
  account_number?: string;
  account_type?: string;
  swift_code?: string;
  // Insurance
  insurance_expiry?: string;
  insurance_s3_key?: string;
  insurance_file_name?: string;
}

// `tokens` comes back only for a NEW account, which set its password in this
// request. An existing account must already be signed in as the invitee (the
// backend refuses with 403 `sign_in_required` / `wrong_account` otherwise) and
// keeps the session it has.
export const acceptInvitation = async (token: string, payload: AcceptInvitationPayload) => {
  const res = await api.post(`auth/invitations/${token}/accept/`, payload);
  return res.data as { message: string; user: object; tokens?: { access: string; refresh: string } };
};

// Accept an associated-company invitation as the signed-in invitee (an
// existing account). New accounts post from the invitation page without a
// session; see AcceptAppointedInvitation.
export const acceptAppointedInvitation = async (token: string, payload: Record<string, unknown>) => {
  const res = await api.post(`auth/accept-appointed-invitation/${token}/`, payload);
  return res.data as { message: string; user: object; tokens?: { access: string; refresh: string } };
};

export const logoutUser = async () => {
  try {
    const res = await api.post("auth/logout/");
    return res.data;
  } catch (error) {
    // Even if API call fails, we should still clear local data
    console.error("Logout API error:", error);
    throw error;
  }
};

export const changePassword = async ({
  old_password,
  new_password,
  new_password_confirm,
}: {
  old_password: string;
  new_password: string;
  new_password_confirm: string;
}) => {
  const res = await api.post("auth/change-password/", {
    old_password,
    new_password,
    new_password_confirm,
  });
  return res.data;
};

// Project Management APIs
export const getProjects = async () => {
  try {
    const response = await api.get("projects/");
    return response.data; // Should return array of projects
  } catch (error) {
    handleError(error);
  }
};

export const createProject = async (projectData: ProjectData) => {
  try {
    const response = await api.post("projects/", projectData);
    return response.data; // { message, project }
  } catch (error) {
    handleError(error);
  }
};

export const getProject = async (projectId: string | number) => {
  if (!projectId) throw new Error("Project ID is required");
  try {
    const response = await api.get(`projects/${projectId}/`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateProject = async (projectData: ProjectData) => {
  const pId = projectData.id || projectData._id;
  if (!pId) throw new Error("Project ID is required for update");

  const { id, _id, ...data } = projectData;

  try {
    const response = await api.patch(`projects/${pId}/`, data);
    return response.data; // { message, project }
  } catch (error) {
    handleError(error);
  }
};

export const deleteProject = async (projectId: string | number) => {
  if (!projectId) throw new Error("Project ID is required for deletion");

  try {
    const response = await api.delete(`projects/${projectId}/`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

// AI weather-risk analysis for a project's site. Returns today + forecast
// weather plus AI narrative; backend caches by location + date range (24h TTL).
export const analyzeWeather = async (body: {
  project_id: string | number;
  range_start?: string;
  range_end?: string;
  force_refresh?: boolean;
}) => {
  try {
    const response = await api.post("ai_analysis/weather/", body);
    return response.data;
  } catch (error: any) {
    const msg =
      error?.response?.data?.error || error?.message || "Weather analysis failed";
    throw new Error(msg);
  }
};

export const lookupCompany = async (regNumber: string) => {
  if (!regNumber) throw new Error("Registration number is required");
  const response = await api.get(`projects/company-lookup/?reg_number=${encodeURIComponent(regNumber)}`);
  return response.data;
};

// Document Upload Constants
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
];

export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.xlsx', '.xls'];
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes

// Validate file before upload
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds 20MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB` };
  }

  // Check file type
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isValidType = ALLOWED_FILE_TYPES.includes(file.type) || ALLOWED_FILE_EXTENSIONS.includes(fileExtension);

  if (!isValidType) {
    return { valid: false, error: `Invalid file type. Allowed: ${ALLOWED_FILE_EXTENSIONS.join(', ')}` };
  }

  return { valid: true };
};

// Upload document to project
export const uploadProjectDocument = async (
  projectId: string | number,
  file: File,
  onProgress?: (progress: number) => void
): Promise<ProjectDocument> => {
  if (!projectId) throw new Error("Project ID is required");
  if (!file) throw new Error("File is required");

  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post(`projects/${projectId}/upload_document/`, formData, {
      headers: {
        // Don't set Content-Type - axios/browser sets it automatically with boundary
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

// ── AI MVP — Primary contract surface ────────────────────────────────
// Backed by the new endpoints on ProjectViewSet:
//   GET   /api/projects/<id>/primary-contract/
//   PATCH /api/projects/<id>/documents/<doc_id>/role/

export type ProjectDocumentRole =
  | "primary_contract"
  | "addendum"
  | "bill_of_quantities"
  | "specification"
  | "drawing"
  | "correspondence"
  | "other";

export interface PrimaryContractInfo {
  primary_contract: null | {
    id: number;
    file_name: string;
    name: string;
    document_role: ProjectDocumentRole;
    uploaded_at: string | null;
    s3_key: string | null;
  };
  reason?: string;
  message?: string;
  candidate_count?: number;
  supporting_documents?: Array<{
    id: number;
    file_name: string;
    document_role: ProjectDocumentRole;
  }>;
}

export const getPrimaryContract = async (
  projectId: string | number
): Promise<PrimaryContractInfo> => {
  if (!projectId) throw new Error("Project ID is required");
  const response = await api.get<PrimaryContractInfo>(`projects/${projectId}/primary-contract/`);
  return response.data;
};

export const setProjectDocumentRole = async (
  projectId: string | number,
  documentId: string | number,
  documentRole: ProjectDocumentRole
): Promise<{ id: number; file_name: string; document_role: ProjectDocumentRole; demoted_previous_primary_ids: number[]; message: string }> => {
  if (!projectId) throw new Error("Project ID is required");
  if (!documentId) throw new Error("Document ID is required");
  try {
    const response = await api.patch(
      `projects/${projectId}/documents/${documentId}/role/`,
      { document_role: documentRole }
    );
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

// Delete document from project
export const deleteProjectDocument = async (
  projectId: string | number,
  documentId: string | number
): Promise<void> => {
  if (!projectId) throw new Error("Project ID is required");
  if (!documentId) throw new Error("Document ID is required");

  try {
    await api.delete(`projects/${projectId}/documents/${documentId}/`);
  } catch (error) {
    handleError(error);
  }
};

// ==============================================================================
// Document move / copy (folder reorganization)
// ==============================================================================

/**
 * Move a document into another folder (same tab only). Folder is pure
 * metadata — the file and document id never change, so AI analysis / RAG keep
 * resolving the contract by its stable `doc-{id}` key. `postData` rethrows the
 * raw axios error so callers can read `err.response.data.error`.
 */
export const moveDocument = (
  projectId: string | number,
  docId: string | number,
  folderId: string | number | null,
) =>
  postData({
    url: `documents/${docId}/move/?project_id=${projectId}`,
    data: { folderId },
  });

/**
 * Duplicate a document into a folder as a new, independent document (own
 * reference, own copy of the file in storage, its own AI indexing). The
 * project contract cannot be copied — the backend returns 400.
 */
export const duplicateDocument = (
  projectId: string | number,
  docId: string | number,
  folderId: string | number | null,
) =>
  postData({
    url: `documents/${docId}/duplicate/?project_id=${projectId}`,
    data: { folderId },
  });

// ==============================================================================
// Task attachments (VO, SI, RFI, DC, CPI) – upload via backend (S3 when configured)
// ==============================================================================

export type TaskAttachmentSegment =
  | "variation-orders"
  | "site-instructions"
  | "requests-for-information"
  | "delay-claims"
  | "critical-path-items"
  | "payment-certificates"
  // GI and IC carry register_s3_attachment too (tasks/views_werner.py), and
  // their forms already register uploads under these segments.
  | "general-instructions"
  | "intentions-to-claim";

export interface TaskAttachmentResponse {
  id: string;
  fileName: string;
  fileType?: string;
  url: string;
  file_url?: string;
  s3Key?: string;
  uploadedAt?: string;
}

/** Upload a file to a task entity (VO, SI, RFI, DC, CPI). Uses backend proxy to S3 when configured. */
export const uploadTaskAttachment = async (
  segment: TaskAttachmentSegment,
  entityId: string | number,
  file: File,
  onProgress?: (percent: number) => void
): Promise<TaskAttachmentResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<TaskAttachmentResponse>(
    `tasks/${segment}/${entityId}/attachments/`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      ...(onProgress && {
        onUploadProgress(progressEvent: { loaded: number; total?: number }) {
          if (progressEvent.total) {
            onProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
          }
        },
      }),
    }
  );
  const data = response.data;
  return {
    ...data,
    url: data.url ?? data.file_url ?? "",
  };
};

// ==============================================================================
// S3 Presigned URL (asset uploads)
// ==============================================================================

export interface PresignedUrlResponse {
  upload_url: string;
  key: string;
  expires_in: number;
  download_url?: string;
}

export interface PresignedUrlParams {
  filename: string;
  content_type?: string;
  folder?: string;
  /** Declared file size — the backend rejects anything over MAX_UPLOAD_BYTES. */
  size_bytes?: number;
}

/** Request a presigned URL from the backend for uploading a file to S3. */
export const getPresignedUrl = async (
  params: PresignedUrlParams
): Promise<PresignedUrlResponse> => {
  try {
    const response = await api.post<PresignedUrlResponse>(
      "storage/presigned-url/",
      {
        filename: params.filename,
        content_type: params.content_type ?? "application/octet-stream",
        folder: params.folder ?? "uploads",
        size_bytes: params.size_bytes,
      }
    );
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

/** Register an S3-uploaded file as a task entity attachment (VO, SI, RFI, DC, CPI, GI, IC). */
export const registerS3TaskAttachment = async (
  segment: TaskAttachmentSegment,
  entityId: string | number,
  params: { file_name: string; s3_key: string }
): Promise<TaskAttachmentResponse> => {
  const response = await api.post<TaskAttachmentResponse>(
    `tasks/${segment}/${entityId}/register_s3_attachment/`,
    { file_name: params.file_name, s3_key: params.s3_key }
  );
  return response.data;
};

/** Register a document that was uploaded to S3 so it appears in project overview. */
export const registerS3Document = async (
  projectId: string | number,
  params: { file_name: string; s3_key: string; name?: string; file_size?: number }
): Promise<ProjectDocument> => {
  try {
    const response = await api.post<ProjectDocument>(
      `projects/${projectId}/register_s3_document/`,
      { file_name: params.file_name, s3_key: params.s3_key, name: params.name, file_size: params.file_size ?? 0 }
    );
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

/**
 * Sanitize filename for HTTP headers (Content-Disposition). XHR only allows ISO-8859-1.
 * Must match backend _safe_header_filename so presigned URL signature validates.
 */
export function toSafeHeaderFilename(name: string): string {
  return name.replace(/[^\x00-\xFF]/g, "_");
}

/**
 * No-progress window after which we give up on an upload.
 *
 * NOT a total-duration cap (xhr.timeout would be that, and a legitimate
 * 250 MB upload can easily run longer). A half-open TCP connection fires
 * neither `load` nor `error`, so without this watchdog the promise never
 * settles and the caller's optimistic "Sending…" state hangs forever.
 */
const UPLOAD_STALL_TIMEOUT_MS = 60000;

/** Upload a file to S3 using a presigned PUT URL. Does not go through our API. */
export const uploadFileToPresignedUrl = async (
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void,
  contentDisposition?: string,
  signal?: AbortSignal
): Promise<void> => {
  const xhr = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    let stalled = false;
    let settled = false;

    const cleanup = () => {
      if (stallTimer) clearTimeout(stallTimer);
      signal?.removeEventListener("abort", onAbortSignal);
    };
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };
    const armStallTimer = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        stalled = true;
        xhr.abort();
      }, UPLOAD_STALL_TIMEOUT_MS);
    };
    function onAbortSignal() {
      xhr.abort();
    }

    xhr.upload.addEventListener("progress", (e) => {
      // Any forward movement resets the watchdog — a slow upload is fine,
      // a silent one is not.
      armStallTimer();
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener("load", () =>
      finish(() => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      })
    );
    xhr.addEventListener("error", () => finish(() => reject(new Error("Upload failed"))));
    xhr.addEventListener("timeout", () =>
      finish(() => reject(new Error("Upload timed out")))
    );
    xhr.addEventListener("abort", () =>
      finish(() =>
        reject(
          new Error(
            stalled
              ? "Upload stalled — check your connection and try again."
              : "Upload cancelled"
          )
        )
      )
    );

    if (signal?.aborted) {
      finish(() => reject(new Error("Upload cancelled")));
      return;
    }
    signal?.addEventListener("abort", onAbortSignal);

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    if (contentDisposition) {
      xhr.setRequestHeader("Content-Disposition", contentDisposition);
    }
    armStallTimer();
    xhr.send(file);
  });
};

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  if (refreshPromise) return refreshPromise;

  const refresh = localStorage.getItem('refresh');
  if (!refresh) {
    localStorage.clear();
    window.location.href = '/login';
    return Promise.reject(new Error('No refresh token available'));
  }

  refreshPromise = api
    .post('auth/token/refresh/', { refresh })
    .then(res => {
      const newAccess = res.data.access;
      localStorage.setItem('access', newAccess);
      if (res.data.refresh) {
        localStorage.setItem('refresh', res.data.refresh);
      }
      return newAccess;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

/**
 * Whether a failed request is an expired session worth one token refresh and
 * replay. Only a 401 qualifies, and not every 401: a business refusal carries
 * `{error: "..."}` (SimpleJWT/DRF auth failures carry `detail`/`code`
 * instead), and a caller can opt out with `skipAuthRefresh`. Replaying a
 * business refusal repeats the failed attempt — a wrong signing PIN was
 * tried twice per click, and the refresh rotated the session underneath.
 */
export const shouldRefreshOn401 = (error: any): boolean => {
  const config = error?.config || {};
  const url: string = config.url || '';
  if (error?.response?.status !== 401) return false;
  if (config._retry || config.skipAuthRefresh) return false;
  if (url.includes('/user/login/') || url.includes('auth/login/')) return false;
  return typeof error?.response?.data?.error !== 'string';
};

api.interceptors.response.use(
  res => res,
  async error => {
    const originalRequest = error.config;

    // If the request that failed WAS the refresh token request → logout immediately
    if (originalRequest.url.includes('auth/token/refresh/')) {
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Handle expired access → try refresh ONCE
    // Skip for login endpoint - 401 there means wrong credentials, not expired token
    if (shouldRefreshOn401(error)) {
      originalRequest._retry = true;

      try {
        const newAccess = await refreshAccessToken();
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccess;

        return api(originalRequest);

      } catch (refreshError) {
        // If refresh fails → logout gracefully
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
