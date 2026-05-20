export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  level: number;
  xp: number;
  totalXP: number;
  rank: string;
  bio?: string;
  createdAt: string;
}

export interface DashboardStats {
  todayXP: number;
  yesterdayXP: number;
  currentStreak: number;
  habitsCompleted: number;
  habitsTotal: number;
  caloriesConsumed: number;
  caloriesGoal: number;
  activityHeatmap: HeatmapData[];
  radarData: RadarDataPoint[];
  weeklyXP: WeeklyXPData[];
  topGoals: Goal[];
  recentActivity: ActivityItem[];
  macros: MacroData;
  waterCups: number;
  waterGoal: number;
  sleepHours: number;
}

export interface HeatmapData {
  date: string;
  count: number;
}

export interface RadarDataPoint {
  subject: string;
  value: number;
  fullMark: number;
}

export interface WeeklyXPData {
  day: string;
  xp: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'fitness' | 'learning' | 'finance' | 'personal';
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  completed: boolean;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: 'gym' | 'nutrition' | 'cardio' | 'habit' | 'goal';
  description: string;
  timestamp: string;
  xpGained?: number;
}

export interface MacroData {
  protein: number;
  carbs: number;
  fat: number;
  totalCalories: number;
}

export interface GymSession {
  id: string;
  name: string;
  date: string;
  duration: number;
  totalVolume: number;
  exercises: ExerciseSet[];
  notes?: string;
}

export interface ExerciseSet {
  exerciseId: string;
  exerciseName: string;
  sets: SetData[];
  muscleGroups: string[];
}

export interface SetData {
  weight: number;
  reps: number;
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];
  lastPerformed?: string;
  lastWeight?: number;
  personalRecord?: number;
  recentWeights?: number[];
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
  isNew?: boolean;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  frequency: 'daily' | 'weekly';
  xpReward: number;
  currentStreak: number;
  longestStreak: number;
  completedToday: boolean;
  completionRate: number;
  heatmapData: HeatmapData[];
}

export interface LeaderboardUser {
  id: string;
  username: string;
  avatar?: string;
  level: number;
  rank: string;
  totalXP: number;
  gymSessions: number;
  cardioSessions: number;
  habitStreak: number;
  goalsCompleted: number;
  badges: string[];
  position: number;
}

export interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: FoodEntry[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  loggedAt: string;
}

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
}

export interface CardioSession {
  id: string;
  type: string;
  date: string;
  duration: number;
  distance?: number;
  calories: number;
  avgHeartRate?: number;
  notes?: string;
}

export interface LearningSubject {
  id: string;
  name: string;
  icon: string;
  color: string;
  totalXP: number;
  totalHours: number;
  level: number;
  levelProgress: number;
  recentSessions: StudySession[];
}

export interface StudySession {
  id: string;
  subjectId: string;
  subjectName: string;
  duration: number;
  xpGained: number;
  date: string;
  notes?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
}

export interface FinanceSummary {
  monthIncome: number;
  monthExpenses: number;
  monthNet: number;
  categoryBreakdown: { category: string; amount: number; color: string }[];
  transactions: Transaction[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface ChatUser {
  id: string;
  username: string;
  avatar?: string;
  online: boolean;
  lastSeen?: string;
}
