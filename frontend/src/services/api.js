import axios from 'axios';

export const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do NOT attempt token refresh for the login endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login')
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { withCredentials: true }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  refresh: (token) => api.post('/auth/refresh', { refreshToken: token }),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

// Employee APIs
export const employeeAPI = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),

  // Self service
  getMyProfile: () => api.get('/employees/profile'),
  updateMyProfile: (data) => api.put('/employees/profile', data),
  uploadProfilePicture: (formData) =>
    api.post('/employees/profile/picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // HR/Admin
  uploadProfilePictureById: (id, formData) =>
    api.post(`/employees/${id}/profile/picture`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
};

// Department APIs
export const departmentAPI = {
  getAll: (params) => api.get('/departments', { params }),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`)
};

// Designation APIs
export const designationAPI = {
  getAll: (params) => api.get('/designations', { params }),
  getById: (id) => api.get(`/designations/${id}`),
  create: (data) => api.post('/designations', data),
  update: (id, data) => api.put(`/designations/${id}`, data),
  delete: (id) => api.delete(`/designations/${id}`)
};

// Attendance APIs
export const attendanceAPI = {
  getOffices: () => api.get('/attendance/offices'),
  checkIn: (data) => api.post('/attendance/check-in', data),
  checkOut: (data) => api.post('/attendance/check-out', data),
  getToday: () => api.get('/attendance/today'),
  getHistory: (params) => api.get('/attendance/history', { params }),
  getSummary: (params) => api.get('/attendance/summary', { params }),
  getAdminSummary: (params) => api.get('/attendance/admin-summary', { params }),
  getAll: (params) => api.get('/attendance', { params }),
  correct: (id, data) => api.put(`/attendance/${id}/correct`, data)
};

// Leave APIs
export const leaveAPI = {
  getTypes: () => api.get('/leaves/types'),
  apply: (data) => api.post('/leaves/apply', data),
  getMy: () => api.get('/leaves/my'),
  getBalance: (params) => api.get('/leaves/balance', { params }),
  getAll: (params) => api.get('/leaves', { params }),
  approve: (id) => api.put(`/leaves/${id}/approve`),
  reject: (id, data) => api.put(`/leaves/${id}/reject`, data)
};

// Payroll APIs
export const payrollAPI = {
  getMy: () => api.get('/payroll/my'),
  getSalaryStructure: () => api.get('/payroll/salary-structure'),
  getComponents: () => api.get('/payroll/components'),
  getEmployeeSalaryStructure: (id) =>
    api.get(`/payroll/employees/${id}/salary-structure`),
  updateSalaryStructure: (id, data) =>
    api.put(`/payroll/employees/${id}/salary-structure`, data),
  downloadPayslip: (id) => api.get(`/payroll/${id}/download`, { responseType: 'blob' }),
  getRuns: () => api.get('/payroll/runs'),
  getEmployees: () => api.get('/payroll/employees'),
  getAllPayslips: () => api.get('/payroll/admin/payslips'),
  updatePayslip: (id, data) => api.put(`/payroll/admin/payslips/${id}`, data),
  deletePayslip: (id) => api.delete(`/payroll/admin/payslips/${id}`),
  deleteRun: (id) => api.delete(`/payroll/runs/${id}`),
  process: (data) => api.post('/payroll/process', data),
  generate: (data) => api.post('/payroll/generate', data)
};

// Holiday APIs
export const holidayAPI = {
  getAll: (params) => api.get('/holidays', { params }),
  create: (data) => api.post('/holidays', data),
  update: (id, data) => api.put(`/holidays/${id}`, data),
  delete: (id) => api.delete(`/holidays/${id}`)
};

// Document APIs
export const documentAPI = {
  getMy: () => api.get('/documents/my'),
  getAll: () => api.get('/documents/all'),
  upload: (formData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  verify: (id) => api.put(`/documents/${id}/verify`),
  reject: (id, data) => api.put(`/documents/${id}/reject`, data),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`)
};

// Notice APIs
export const noticeAPI = {
  create: (data, config) => api.post('/notices', data, config),
  list: () => api.get('/notices'),
  my: () => api.get('/notices/my'),
  delete: (id) => api.delete(`/notices/${id}`)
};

// Notification APIs
export const notificationAPI = {
  getMy: (params) => api.get('/notifications', { params }),
  getCounts: () => api.get('/notifications/counts'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markCategoryRead: (category) =>
    api.put('/notifications/read-category', { category }),
  markAllAsRead: () => api.put('/notifications/read-all')
};

// Settings APIs
export const settingsAPI = {
  get: (params) => api.get('/settings', { params }),
  update: (data) => api.put('/settings', data),
  uploadLogo: (formData) =>
    api.post('/settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
};

