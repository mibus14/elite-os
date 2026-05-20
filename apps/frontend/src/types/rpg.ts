export interface RPGCharacter {
  class: string
  level: number
  xp: number
  rank: string
  statStr: number
  statInt: number
  statVit: number
  statDis: number
  statWis: number
  statGol: number
  comboStreak: number
  deathCount: number
  inPenitence: boolean
  debuffs: Debuff[]
  combo: DailyCombo | null
}

export interface Debuff {
  id: string
  type: string
  name: string
  description: string
  icon: string
  xpMultiplier: number
  expiresAt: string
}

export interface DailyCombo {
  gymDone: boolean
  nutritionDone: boolean
  habitsDone: boolean
  cardioDone: boolean
  learningDone: boolean
  financeDone: boolean
  comboActive: boolean
  comboMultiplier: number
}
