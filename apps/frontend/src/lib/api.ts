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
    const url: string = err.config?.url || ''
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register')
    if (err.response?.status === 401 && typeof window !== 'undefined' && !isAuthRoute) {
      localStorage.removeItem('elite_token')
      localStorage.removeItem('elite_user')
      localStorage.removeItem('elite-auth')
      document.cookie = 'elite_token=; Max-Age=0; path=/'
      window.location.replace('/login')
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
  estimate:      (description: string) => api.post('/nutrition/estimate', { description }),
  addMeal:       (data: object) => api.post('/nutrition/meals', data),
  removeMeal:    (id: string) => api.delete(`/nutrition/meals/${id}`),
  weeklyStats:   () => api.get('/nutrition/stats/weekly'),
  goals:         () => api.get('/nutrition/goals'),
  setGoals:      (data: object) => api.put('/nutrition/goals', data),
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
  list:              () => api.get('/goals'),
  create:            (data: object) => api.post('/goals', data),
  update:            (id: string, data: object) => api.put(`/goals/${id}`, data),
  remove:            (id: string) => api.delete(`/goals/${id}`),
  progress:          (id: string, value: number) => api.post(`/goals/${id}/progress`, { value }),
  suggestMilestones: (id: string, data: object) => api.post(`/goals/${id}/milestones/suggest`, data),
  toggleMilestone:   (goalId: string, mid: string) => api.patch(`/goals/${goalId}/milestones/${mid}`, {}),
  addMilestone:      (goalId: string, data: object) => api.post(`/goals/${goalId}/milestones`, data),
  reactivate:        (id: string) => api.patch(`/goals/${id}/reactivate`, {}),
}

// ─── Learning ─────────────────────────────────────────────────────
export const learningApi = {
  interests:       () => api.get('/learning/interests'),
  addInterest:     (name: string) => api.post('/learning/interests', { name }),
  removeInterest:  (id: string) => api.delete(`/learning/interests/${id}`),
  items:           () => api.get('/learning/items'),
  toggleItem:      (id: string) => api.patch(`/learning/items/${id}`, {}),
  generate:        (interests: string[]) => api.post('/learning/generate', { interests }),
  addItems:        (items: { tag: string; title: string }[]) => api.post('/learning/items/bulk', { items }),
  deleteItem:      (id: string) => api.delete(`/learning/items/${id}`),
}

// ─── Finance ─────────────────────────────────────────────────────
export const financeApi = {
  entries:       () => api.get('/finance/entries'),
  create:        (data: object) => api.post('/finance/entries', data),
  remove:        (id: string) => api.delete(`/finance/entries/${id}`),
  summary:       () => api.get('/finance/summary'),
}

// ─── Bets ─────────────────────────────────────────────────────────
export const betsApi = {
  list:    () => api.get('/bets'),
  my:      () => api.get('/bets/my'),
  create:  (data: object) => api.post('/bets', data),
  accept:  (id: string, amount: number) => api.post(`/bets/${id}/accept`, { amount }),
  settle:  (id: string) => api.post(`/bets/${id}/settle`),
}

// ─── Savings ─────────────────────────────────────────────────────
export const savingsApi = {
  config:      () => api.get('/savings/config'),
  setConfig:   (data: object) => api.post('/savings/config', data),
  summary:     () => api.get('/savings/summary'),
  processWeek: () => api.post('/savings/process-week'),
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
  combo:      () => api.get('/rpg/combo'),
  debuffs:    () => api.get('/rpg/debuffs'),
  missions:   () => api.get('/rpg/missions'),
  leaderboard:() => api.get('/rpg/leaderboard'),
  setClass:             (cls: string) => api.post('/rpg/class', { class: cls }),
  penitence:            () => api.post('/rpg/penitence', { task: 'completed' }),
  quickMissions:        () => api.get('/rpg/quick-missions'),
  completeQuickMission: (id: string) => api.post(`/rpg/quick-missions/${id}/complete`, {}),
}

// ─── Rewards ─────────────────────────────────────────────────────
export const rewardsApi = {
  list:   () => api.get('/rewards'),
  sync:   () => api.post('/rewards/sync'),
  redeem: (id: string) => api.post(`/rewards/${id}/redeem`),
}

// ─── Daily Log (sleep, mood, energy, water) ───────────────────────
export const dailyLogApi = {
  today: ()            => api.get('/daily-log/today'),
  save:  (data: object) => api.post('/daily-log', data),
  week:  ()            => api.get('/daily-log/week'),
}

// ─── Report ───────────────────────────────────────────────────────
export const reportApi = {
  summary: () => api.get('/report/summary'),
}

// ─── Seasons ─────────────────────────────────────────────────────
export const seasonsApi = {
  current: () => api.get('/seasons/current'),
  history: () => api.get('/seasons/history'),
}
