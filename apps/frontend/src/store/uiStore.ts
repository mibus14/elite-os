import { create } from 'zustand'

interface Notification {
  id: string
  type: 'success' | 'info' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  createdAt: Date
}

interface UIState {
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  activeModule: string
  notifications: Notification[]
  onlineUsers: string[]
  toggleSidebar: () => void
  setSidebarCollapsed: (val: boolean) => void
  toggleMobileSidebar: () => void
  setMobileSidebarOpen: (val: boolean) => void
  setActiveModule: (module: string) => void
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markNotificationRead: (id: string) => void
  clearNotifications: () => void
  setOnlineUsers: (users: string[]) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  activeModule: 'dashboard',
  notifications: [],
  onlineUsers: [],

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  setMobileSidebarOpen: (val) => set({ mobileSidebarOpen: val }),
  setActiveModule: (module) => set({ activeModule: module }),

  addNotification: (n) =>
    set((s) => ({
      notifications: [
        {
          ...n,
          id: Math.random().toString(36).slice(2),
          read: false,
          createdAt: new Date(),
        },
        ...s.notifications,
      ].slice(0, 50),
    })),

  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),

  clearNotifications: () => set({ notifications: [] }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
}))
