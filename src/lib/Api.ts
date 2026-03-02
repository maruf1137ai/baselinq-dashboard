import axios from "axios";

// Project types
export interface ProjectDocument {
  id?: number | string;
  _id?: number | string;
  file_name?: string;
  fileName?: string;
  file_url?: string;
  fileUrl?: string;
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

export const registerUser = async ({
  email,
  password,
  password_confirm,
  name,
}: {
  email: string;
  password: string;
  password_confirm: string;
  name: string;
}) => {
  const res = await api.post("auth/register/", {
    email,
    password,
    password_confirm,
    name,
  });
  return res.data;
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
    const response = await api.put(`projects/${pId}/`, data);
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
    await api.delete(`projects/${projectId}/documents/`, {
      data: { document_id: documentId }
    });
  } catch (error) {
    handleError(error);
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem("refresh");

      // If no refresh → logout + redirect immediately
      if (!refresh) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        // Attempt refresh
        const res = await api.post("auth/token/refresh/", { refresh });
        const newAccess = res.data.access;

        if (!newAccess) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          window.location.href = "/login";
          return Promise.reject(error);
        }
        // Save new access token
        localStorage.setItem("access", newAccess);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed → force logout + redirect
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
