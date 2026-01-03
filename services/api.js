import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

//const API_BASE_URL = 'http://192.168.50.107:8000/api';
const API_BASE_URL = 'http://172.20.10.2:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Token management functions
const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    return token || global.authToken;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

const setToken = async (token) => {
  try {
    await AsyncStorage.setItem('authToken', token);
    global.authToken = token;
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

const clearToken = async () => {
  try {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('userName');
    await AsyncStorage.removeItem('userEmail');
    global.authToken = null;
    global.userId = null;
    global.userName = null;
  } catch (error) {
    console.error('Error clearing token:', error);
  }
};

// Request interceptor
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Log request for debugging
  console.log('Request:', {
    url: config.url,
    method: config.method,
    headers: config.headers,
    data: config.data
  });
  
  return config;
}, (error) => {
  console.error('Request error:', error);
  return Promise.reject(error);
});

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log('Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  async (error) => {
    // Log error responses
    if (error.response) {
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config.url
      });
      
      // Handle token expiration (401 Unauthorized)
      if (error.response.status === 401) {
        await clearToken();
        // You might want to redirect to login here
        // navigationRef.navigate('Auth'); // If using navigation ref
      }
    } else {
      console.error('API Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: async (credentials) => {
    const response = await api.post('/login', credentials);
    if (response.data.token) {
      await setToken(response.data.token);
    }
    return response;
  },
  register: async (userData) => {
    const response = await api.post('/register', userData);
    if (response.data.token) {
      await setToken(response.data.token);
    }
    return response;
  },
  logout: async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearToken();
    }
  },
  getUser: () => api.get('/user'),
};

export const workoutAPI = {
  updateExercisePivot: (workoutId, exerciseId, data) => {
    return api.patch(`/workouts/${workoutId}/exercises/${exerciseId}`, data);
  },
  getAllWorkouts: () => api.get('/workouts'),
  createWorkout: (workout) => api.post('/workouts', workout),
  removeExercise: (workoutId, exerciseId) =>
    api.delete(`/workouts/${workoutId}/exercises/${exerciseId}`),
  attachExerciseToWorkout: (workoutId, exerciseId) =>
    api.post(`/workouts/${workoutId}/exercises`, {
      exercise_id: exerciseId,
      achievement: 0,
      is_done: false,
      order: 0,
    }),
  create: (data) => api.post('/workouts', data).then(res => res.data),
  getAll: () => api.get('/workouts').then(res => res.data),
  getById: (id) => api.get(`/workouts/${id}`).then(res => res.data),
  update: (id, data) => api.put(`/workouts/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/workouts/${id}`).then(res => res.data),
  addExercise: (workoutId, exerciseData) => api.post(`/workouts/${workoutId}/exercises`, exerciseData),
};

// Updated and consolidated groupSessionAPI
export const groupSessionAPI = {
  // Get sessions by branch
  getByBranch: (branchId) =>
    api.get(`/branches/${branchId}/sessions`).then(res => res.data.data || res.data),
  
  // Get all sessions
  getAll: () =>
    api.get('/group-sessions').then(res => res.data.data || res.data),
    
  // Get upcoming sessions
  getUpcoming: () =>
    api.get('/group-sessions/upcoming').then(res => res.data.data || res.data),
    
  // Get available sessions
  getAvailable: () =>
    api.get('/group-sessions/available').then(res => res.data.data || res.data),
  
  // Get single session
  getById: (sessionId) =>
    api.get(`/group-sessions/${sessionId}`).then(res => res.data.data || res.data),
  
  // Booking methods
  bookSession: (sessionId) =>
    api.post(`/group-sessions/${sessionId}/book`).then(res => res.data),
    
  cancelBooking: (sessionId) =>
    api.delete(`/group-sessions/${sessionId}/book`).then(res => res.data),
    
  getUserBookings: () =>
    api.get('/user/bookings').then(res => res.data.data || res.data),
    
  getSessionBookings: (sessionId) =>
    api.get(`/group-sessions/${sessionId}/bookings`).then(res => res.data.data || res.data),
    
  checkBookingStatus: (sessionId) =>
    api.get(`/group-sessions/${sessionId}/booking-status`).then(res => res.data),
};

export const branchAPI = {
  getCoaches: (branchId) =>
    api.get(`/branches/${branchId}/coaches`).then(res => res.data.data || res.data),
  getAll: () => api.get('/branches').then(response => ({
    data: response.data.data || response.data
  })),
  getById: (id) => api.get(`/branches/${id}`),
  getAvailabilities: (branchId) => api.get(`/branches/${branchId}/availabilities`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
};

export const programmeAPI = {
  getAll: () => api.get('/programmes').then(res => res.data.data || res.data),
  getById: (id) => api.get(`/programmes/${id}`).then(res => res.data.data || res.data),
  create: (data) => api.post('/programmes', data).then(res => res.data),
  syncWorkouts: (programmeId, workouts) =>
    api.post(`/programmes/${programmeId}/workouts`, { workouts }).then(res => res.data),
  activate: (id) => api.post(`/programmes/${id}/activate`).then(res => res.data),
  delete: (id) => api.delete(`/programmes/${id}`).then(res => res.data),
};

export const attachExerciseToWorkout = (workoutId, exerciseId) => {
  return api.post(`/workouts/${workoutId}/exercises`, {
    exercise_id: exerciseId,
    achievement: 0,
    is_done: false,
    order: 0,
  });
};

export const machineAPI = {
  getByBranch: (branchId) => api.get(`/branches/${branchId}/machines`),
  getAll: () => api.get('/machines').then(res => res.data.data || res.data),
};
// Add this to your existing API service

/* -------- Parameters API -------- */
// In your services/api.js
export const parametersAPI = {
  // Get public parameters
  getPublic: async (groupe = null) => {
    const params = groupe ? { groupe } : {}
    const { data } = await api.get('/parametres/public', { params })
    return data
  },
}
export const exerciseAPI = {
  create: (data) => api.post('/exercises', data).then(res => res.data),
  getAll: () => api.get('/exercises').then(res => res.data),
  getById: (id) => api.get(`/exercises/${id}`).then(res => res.data),
  getChargesForMachine: (machineId) => api.get(`/machines/${machineId}/charges`).then(res => res.data.data || res.data),
  getMovements: () => api.get('/movements').then(res => res.data.data || res.data),
  update: (id, data) => api.put(`/exercises/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/exercises/${id}`).then(res => res.data),
};

export const userProgressAPI = {
  // This will now use the protected route that returns only the authenticated user's progress
  getAll: () => api.get('/user-progresses').then(res => res.data),
  create: (data) => api.post('/user-progresses', data).then(res => res.data),
  getHistory: () => api.get('/user-progresses/history').then(res => res.data),
  update: (id, data) => api.put(`/user-progresses/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/user-progresses/${id}`).then(res => res.data),
};

// Export token management functions
export const tokenService = {
  getToken,
  setToken,
  clearToken
};

export default api;
