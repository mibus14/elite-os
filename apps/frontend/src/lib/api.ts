import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('elite_token') : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('elite_token')
      localStorage.removeItem('elite_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── Auth ─────────────────────────────────────────────────────────
export const authApi = {
  login:    (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: { username: string; email: string; password: string; avatar?: string }) => api.post('/auth/register', data),
  me:       () => api.get('/auth/me'),
  refresh:  () => api.post('/auth/refresh'),
}

// ─── Dashboard ───────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
}

// ─── Habits ──────────────────────────────────────────────────────
export const habitsApi = {
  list:        () => api.get('/habits'),
  create:      (data: object) => api.post('/habits', data),
  update:      (id: string, data: object) => api.put(`/habits/${id}`, data),
  remove:      (id: string) => api.delete(`/habits/${id}`),
  log:         (id: string) => api.post(`/habits/${id}/log`),
  heatmap:     () => api.get('/habits/logs/heatmap'),
}

// ─── Gym ─────────────────────────────────────────────────────────
export const gymApi = {
  sessions:      () => api.get('/gym/sessions'),
  session:       (id: string) => api.get(`/gym/sessions/${id}`),
  createSession: (data: object) => api.post('/gym/sessions', data),
  updateSession: (id: string, data: object) => api.put(`/gym/sessions/${id}`, data),
  exercises:     () => api.get('/gym/exercises'),
  createExercise:(data: object) => api.post('/gym/exercises', data),
  records:       () => api.get('/gym/records'),
  createRecord:  (data: object) => api.post('/gym/records', data),
  stats:         () => api.get('/gym/stats'),
}

// ─── Nutrition ───────────────────────────────────────────────────
export const nutritionApi = {
  today:         () => api.get('/nutrition/today'),
  addMeal:       (data: object) => api.post('/nutrition/meals', data),
  removeMeal:    (id: string) => api.delete(`/nutrition/meals/${id}`),
  weeklyStats:   () => api.get('/nutrition/stats/weekly'),
  goals:         () => api.get('/nutrition/goals'),
}

// ─── Cardio ──────────────────────────────────────────────────────
export const cardioApi = {
  sessions:      () => api.get('/cardio/sessions'),
  create:        (data: object) => api.post('/cardio/sessions', data),
  remove:        (id: string) => api.delete(`/cardio/sessions/${id}`),
  stats:         () => api.get('/cardio/stats'),
}

// ─── Goals ───────────────────────────────────────────────────────
export const goalsApi = {
  list:          () => api.get('/goals'),
  create:        (data: object) => api.post('/goals', data),
  update:        (id: string, data: object) => api.put(`/goals/${id}`, data),
  remove:        (id: string) => api.delete(`/goals/${id}`),
  progress:      (id: string, value: number) => api.post(`/goals/${id}/progress`, { value }),
}

// ─── Learning ─────────────────────────────────────────────────────
export const learningApi = {
  sessions:      () => api.get('/learning/sessions'),
  create:        (data: object) => api.post('/learning/sessions', data),
  stats:         () => api.get('/learning/stats'),
}

// ─── Finance ─────────────────────────────────────────────────────
export const financeApi = {
  entries:       () => api.get('/finance/entries'),
  create:        (data: object) => api.post('/finance/entries', data),
  remove:        (id: string) => api.delete(`/finance/entries/${id}`),
  summary:       () => api.get('/finance/summary'),
}

// ─── Leaderboard ─────────────────────────────────────────────────
export const leaderboardApi = {
  rankings:      () => api.get('/leaderboard'),
  stats:         () => api.get('/leaderboard/stats'),
}

// ─── Messages ────────────────────────────────────────────────────
export const messagesApi = {
  conversation:  (userId: string) => api.get(`/messages/${userId}`),
  send:          (data: object) => api.post('/messages', data),
  markRead:      (id: string) => api.put(`/messages/${id}/read`),
  unreadCount:   () => api.get('/messages/unread/count'),
}

// ─── Users ───────────────────────────────────────────────────────
export const usersApi = {
  all:           () => api.get('/users'),
  profile:       (id: string) => api.get(`/users/${id}/profile`),
  updateProfile: (data: object) => api.put('/users/profile', data),
}

// ─── RPG ─────────────────────────────────────────────────────────
export const rpgApi = {
  character:  () => api.get('/rpg/character'),
  penitence:  () => api.post('/rpg/penitence/accept'),
}
