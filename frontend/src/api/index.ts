import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const stokvelApi = {
  list: () => api.get('/stokvels'),
  get: (id: number) => api.get(`/stokvels/${id}`),
  create: (data: any) => api.post('/stokvels', data),
  update: (id: number, data: any) => api.put(`/stokvels/${id}`, data),
  delete: (id: number) => api.delete(`/stokvels/${id}`),
  stats: (id: number) => api.get(`/stokvels/${id}/stats`),
};

export const memberApi = {
  list: (stokvelId: number) => api.get(`/stokvels/${stokvelId}/members`),
  get: (stokvelId: number, id: number) => api.get(`/stokvels/${stokvelId}/members/${id}`),
  create: (stokvelId: number, data: any) => api.post(`/stokvels/${stokvelId}/members`, data),
  update: (stokvelId: number, id: number, data: any) => api.put(`/stokvels/${stokvelId}/members/${id}`, data),
  delete: (stokvelId: number, id: number) => api.delete(`/stokvels/${stokvelId}/members/${id}`),
  contributions: (stokvelId: number, id: number) => api.get(`/stokvels/${stokvelId}/members/${id}/contributions`),
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
};
