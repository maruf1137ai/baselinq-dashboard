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
  latitude?: number | null;
  longitude?: number | null;
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

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

const handleError = (error) => {
  throw new Error(
    error.response
      ? `HTTP error! status: ${error.response.status}`
      : error.message,
  );
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

export const invitePersonnel = async (data: {
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

export const getAppointedCompanies = async (projectId: string | number) => {
  const res = await api.get(`projects/${projectId}/appointed-companies/`);
  return res.data as {
    id: string | number;
    company_name: string;
    role: string;
    status: string;
    contact_name: string;
    email: string;
    members: {
      id: string | number;
      name: string;
      email: string;
      role: string;
      status?: string;
      insurance_file_name?: string | null;
      insurance_expiry?: string | null;
      insurance_url?: string | null;
    }[];
    insurance_file_name: string | null;
    insurance_expiry: string | null;
    insurance_url: string | null;
  }[];
};

export const removeAppointedCompany = async (projectId: string | number, companyId: string | number) => {
  const res = await api.delete(`projects/${projectId}/appointed-companies/${companyId}/remove/`);
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

export const acceptInvitation = async (token: string, payload: AcceptInvitationPayload) => {
  const res = await api.post(`auth/invitations/${token}/accept/`, payload);
  return res.data as { message: string; user: object; tokens: { access: string; refresh: string } };
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
// Task attachments (VO, SI, RFI, DC, CPI) – upload via backend (S3 when configured)
// ==============================================================================

export type TaskAttachmentSegment =
  | "variation-orders"
  | "site-instructions"
  | "requests-for-information"
  | "delay-claims"
  | "critical-path-items";

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
      }
    );
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

/** Register an S3-uploaded file as a task entity attachment (VO, SI, RFI, DC, CPI). */
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

/** Upload a file to S3 using a presigned PUT URL. Does not go through our API. */
export const uploadFileToPresignedUrl = async (
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void,
  contentDisposition?: string
): Promise<void> => {
  const xhr = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    if (contentDisposition) {
      xhr.setRequestHeader("Content-Disposition", contentDisposition);
    }
    xhr.send(file);
  });
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
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/user/login/')) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem('refresh');
      if (!refresh) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await api.post('auth/token/refresh/', { refresh });
        const newAccess = res.data.access;

        localStorage.setItem('access', newAccess);
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
