import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const stokvelApi = {
  list: () => api.get('/stokvels'),
  get: (id: number) => api.get(`/stokvels/${id}`),
  create: (data: any) => api.post('/stokvels', data),
  update: (id: number, data: any) => api.put(`/stokvels/${id}`, data),
  delete: (id: number) => api.delete(`/stokvels/${id}`),
  stats: (id: number) => api.get(`/stokvels/${id}/stats`),
  updatePayoutOrder: (id: number, order: number[]) => api.put(`/stokvels/${id}/payout-order`, { order }),
};

export const memberApi = {
  list: (stokvelId: number) => api.get(`/stokvels/${stokvelId}/members`),
  get: (stokvelId: number, id: number) => api.get(`/stokvels/${stokvelId}/members/${id}`),
  create: (stokvelId: number, data: any) => api.post(`/stokvels/${stokvelId}/members`, data),
  update: (stokvelId: number, id: number, data: any) => api.put(`/stokvels/${stokvelId}/members/${id}`, data),
  delete: (stokvelId: number, id: number) => api.delete(`/stokvels/${stokvelId}/members/${id}`),
};

export const contributionApi = {
  list: (stokvelId: number, params?: { month?: number; year?: number }) =>
    api.get(`/stokvels/${stokvelId}/contributions`, { params }),
  create: (stokvelId: number, data: any) => api.post(`/stokvels/${stokvelId}/contributions`, data),
  update: (stokvelId: number, id: number, data: any) => api.put(`/stokvels/${stokvelId}/contributions/${id}`, data),
  delete: (stokvelId: number, id: number) => api.delete(`/stokvels/${stokvelId}/contributions/${id}`),
  status: (stokvelId: number, year: number, month: number) =>
    api.get(`/stokvels/${stokvelId}/contributions/status/${year}/${month}`),
};

export const payoutApi = {
  list: (stokvelId: number) => api.get(`/stokvels/${stokvelId}/payouts`),
  create: (stokvelId: number, data: any) => api.post(`/stokvels/${stokvelId}/payouts`, data),
  delete: (stokvelId: number, id: number) => api.delete(`/stokvels/${stokvelId}/payouts/${id}`),
  rotation: (stokvelId: number) => api.get(`/stokvels/${stokvelId}/payouts/rotation`),
};

export const fineApi = {
  list: (stokvelId: number) => api.get(`/stokvels/${stokvelId}/fines`),
  summary: (stokvelId: number) => api.get(`/stokvels/${stokvelId}/fines/summary`),
  create: (stokvelId: number, data: any) => api.post(`/stokvels/${stokvelId}/fines`, data),
  update: (stokvelId: number, id: number, data: any) => api.put(`/stokvels/${stokvelId}/fines/${id}`, data),
  updateStatus: (stokvelId: number, id: number, status: string) =>
    api.patch(`/stokvels/${stokvelId}/fines/${id}/status`, { status }),
  delete: (stokvelId: number, id: number) => api.delete(`/stokvels/${stokvelId}/fines/${id}`),
};

export const meetingApi = {
  list: (stokvelId: number) => api.get(`/stokvels/${stokvelId}/meetings`),
  get: (stokvelId: number, id: number) => api.get(`/stokvels/${stokvelId}/meetings/${id}`),
  create: (stokvelId: number, data: any) => api.post(`/stokvels/${stokvelId}/meetings`, data),
  update: (stokvelId: number, id: number, data: any) => api.put(`/stokvels/${stokvelId}/meetings/${id}`, data),
  delete: (stokvelId: number, id: number) => api.delete(`/stokvels/${stokvelId}/meetings/${id}`),
  updateAttendance: (stokvelId: number, id: number, attendance: any[]) =>
    api.put(`/stokvels/${stokvelId}/meetings/${id}/attendance`, { attendance }),
};

export const reminderApi = {
  list: (stokvelId: number) => api.get(`/stokvels/${stokvelId}/reminders`),
  create: (stokvelId: number, data: any) => api.post(`/stokvels/${stokvelId}/reminders`, data),
  markRead: (stokvelId: number, id: number) => api.put(`/stokvels/${stokvelId}/reminders/${id}/read`),
  markUnread: (stokvelId: number, id: number) => api.put(`/stokvels/${stokvelId}/reminders/${id}/unread`),
  delete: (stokvelId: number, id: number) => api.delete(`/stokvels/${stokvelId}/reminders/${id}`),
  generatePayment: (stokvelId: number) => api.post(`/stokvels/${stokvelId}/reminders/generate-payment`),
  sendNotifications: (stokvelId: number) => api.post(`/stokvels/${stokvelId}/reminders/send-notifications`),
};

export const reportApi = {
  monthly: (stokvelId: number, year: number, month: number) =>
    api.get(`/stokvels/${stokvelId}/reports/monthly/${year}/${month}`),
  annual: (stokvelId: number, year: number) =>
    api.get(`/stokvels/${stokvelId}/reports/annual/${year}`),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: Record<string, string>) => api.put('/settings', data),
  deleteTwilio: () => api.delete('/settings/twilio'),
  testNotification: (phone: string) => api.post('/settings/test-notification', { phone }),
};
