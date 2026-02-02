import axios from "axios";

// Project types
export interface ProjectData {
  _id?: string;
  name: string;
  project_number: string;
  description?: string;
  location?: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  fx_rate: number;
  contract_type: string;
  retention_rate: number;
  vat_rate: number;
  status?: string;
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

export const updateProject = async (projectData: ProjectData) => {
  const { _id, ...data } = projectData;
  if (!_id) throw new Error("Project ID is required for update");

  try {
    const response = await api.put(`projects/${_id}/`, data);
    return response.data; // { message, project }
  } catch (error) {
    handleError(error);
  }
};

export const deleteProject = async (projectId: string) => {
  if (!projectId) throw new Error("Project ID is required for deletion");

  try {
    const response = await api.delete(`projects/${projectId}/`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

// api.interceptors.response.use(
//   response => response,
//   async error => {
//     const originalRequest = error.config;

//     // If 401 and not retried yet
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;

//       const refresh = localStorage.getItem('refresh');

//       // If no refresh → logout + redirect immediately
//       if (!refresh) {
//         localStorage.removeItem('access');
//         localStorage.removeItem('refresh');
//         window.location.href = '/login';
//         return Promise.reject(error);
//       }

//       try {
//         // Attempt refresh
//         const res = await api.post('/user/refresh/', { refresh });
//         const newAccess = res.data.access;

//         // Save new access token
//         localStorage.setItem('access', newAccess);

//         // Retry original request with new token
//         originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
//         return api(originalRequest);

//       } catch (refreshError) {
//         // Refresh failed → force logout + redirect
//         localStorage.removeItem('access');
//         localStorage.removeItem('refresh');
//         window.location.href = '/login';
//         return Promise.reject(refreshError);
//       }
//     }

//     return Promise.reject(error);
//   }
// );

// api.interceptors.response.use(
//   res => res,
//   async error => {
//     const originalRequest = error.config;

//     // If the request that failed WAS the refresh token request → logout immediately
//     if (originalRequest.url.includes('/user/refresh/')) {
//       localStorage.clear();
//       window.location.href = '/login';
//       return Promise.reject(error);
//     }

//     // Handle expired access → try refresh ONCE
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;

//       const refresh = localStorage.getItem('refresh');
//       if (!refresh) {
//         localStorage.clear();
//         window.location.href = '/login';
//         return Promise.reject(error);
//       }

//       try {
//         const res = await api.post('/user/refresh/', { refresh });
//         const newAccess = res.data.access;

//         localStorage.setItem('access', newAccess);
//         originalRequest.headers['Authorization'] = 'Bearer ' + newAccess;

//         return api(originalRequest);

//       } catch (refreshError) {
//         // If refresh fails → logout gracefully
//         localStorage.clear();
//         window.location.href = '/login';
//         return Promise.reject(refreshError);
//       }
//     }

//     return Promise.reject(error);
//   }
// );
