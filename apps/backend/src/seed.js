require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRank(xp) {
  if (xp >= 10001) return 'Diamond';
  if (xp >= 5001) return 'Platinum';
  if (xp >= 2001) return 'Gold';
  if (xp >= 501) return 'Silver';
  return 'Bronze';
}

function getLevel(xp) {
  return Math.floor(xp / 500) + 1;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
const EXERCISES_BY_USER = {
  diego: [
    { name: 'Bench Press', muscleGroups: ['chest', 'triceps', 'shoulders'], equipment: 'Barbell' },
    { name: 'Squat', muscleGroups: ['quads', 'glutes', 'hamstrings'], equipment: 'Barbell' },
    { name: 'Deadlift', muscleGroups: ['back', 'glutes', 'hamstrings'], equipment: 'Barbell' },
    { name: 'Pull-Up', muscleGroups: ['back', 'biceps'], equipment: 'Pull-up bar' },
    { name: 'Overhead Press', muscleGroups: ['shoulders', 'triceps'], equipment: 'Barbell' },
    { name: 'Barbell Row', muscleGroups: ['back', 'biceps'], equipment: 'Barbell' },
    { name: 'Incline Dumbbell Press', muscleGroups: ['chest', 'shoulders'], equipment: 'Dumbbell' },
    { name: 'Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes'], equipment: 'Barbell' },
    { name: 'Tricep Dips', muscleGroups: ['triceps', 'chest'], equipment: 'Parallel bars' },
    { name: 'Face Pull', muscleGroups: ['shoulders', 'rear delts'], equipment: 'Cable' },
  ],
  pedro: [
    { name: 'Dumbbell Curl', muscleGroups: ['biceps'], equipment: 'Dumbbell' },
    { name: 'Lat Pulldown', muscleGroups: ['back', 'biceps'], equipment: 'Cable' },
    { name: 'Leg Press', muscleGroups: ['quads', 'glutes'], equipment: 'Machine' },
    { name: 'Cable Fly', muscleGroups: ['chest'], equipment: 'Cable' },
    { name: 'Seated Row', muscleGroups: ['back', 'biceps'], equipment: 'Cable' },
    { name: 'Leg Curl', muscleGroups: ['hamstrings'], equipment: 'Machine' },
    { name: 'Lateral Raise', muscleGroups: ['shoulders'], equipment: 'Dumbbell' },
    { name: 'Chest Press Machine', muscleGroups: ['chest', 'triceps'], equipment: 'Machine' },
    { name: 'Calf Raise', muscleGroups: ['calves'], equipment: 'Machine' },
    { name: 'Preacher Curl', muscleGroups: ['biceps'], equipment: 'Barbell' },
  ],
  cristopher: [
    { name: 'Power Clean', muscleGroups: ['full body', 'back', 'legs'], equipment: 'Barbell' },
    { name: 'Front Squat', muscleGroups: ['quads', 'core'], equipment: 'Barbell' },
    { name: 'Push Press', muscleGroups: ['shoulders', 'triceps', 'legs'], equipment: 'Barbell' },
    { name: 'Kettlebell Swing', muscleGroups: ['glutes', 'hamstrings', 'core'], equipment: 'Kettlebell' },
    { name: 'Box Jump', muscleGroups: ['quads', 'glutes', 'calves'], equipment: 'Box' },
    { name: 'Turkish Get-Up', muscleGroups: ['full body', 'core'], equipment: 'Kettlebell' },
    { name: 'Muscle-Up', muscleGroups: ['back', 'chest', 'triceps'], equipment: 'Pull-up bar' },
    { name: 'Pistol Squat', muscleGroups: ['quads', 'glutes'], equipment: 'Bodyweight' },
    { name: 'Rope Climb', muscleGroups: ['back', 'biceps', 'core'], equipment: 'Rope' },
    { name: 'Atlas Stone Lift', muscleGroups: ['full body'], equipment: 'Atlas stone' },
  ],
};

const GYM_SESSION_NAMES = [
  'Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body',
  'Full Body', 'Chest & Triceps', 'Back & Biceps', 'Shoulders & Arms',
  'Strength Training', 'Hypertrophy Session', 'Power Session',
  'Chest Day', 'Arm Day', 'Back Day', 'Glute Day',
];

const CARDIO_TYPES = ['Running', 'Cycling', 'Swimming', 'Jump Rope', 'Rowing', 'HIIT', 'Walking', 'Elliptical'];

const MEAL_NAMES = {
  breakfast: [
    'Oatmeal with Berries', 'Scrambled Eggs & Toast', 'Greek Yogurt Parfait',
    'Protein Pancakes', 'Avocado Toast with Eggs', 'Smoothie Bowl',
    'Whole Wheat Waffles', 'Egg White Omelette',
  ],
  lunch: [
    'Grilled Chicken & Rice', 'Tuna Salad Wrap', 'Turkey Sandwich',
    'Quinoa Bowl with Veggies', 'Salmon & Sweet Potato', 'Chicken Caesar Salad',
    'Brown Rice & Beans', 'Steak & Salad', 'Pasta with Meat Sauce',
  ],
  dinner: [
    'Grilled Salmon & Broccoli', 'Chicken Stir Fry', 'Beef Tacos',
    'Spaghetti Bolognese', 'Baked Chicken & Asparagus', 'Pork Loin & Veggies',
    'Shrimp Fried Rice', 'Turkey Meatballs & Pasta', 'Lamb Chops & Quinoa',
  ],
  snack: [
    'Protein Shake', 'Apple & Peanut Butter', 'Cottage Cheese',
    'Mixed Nuts', 'Banana & Almond Butter', 'Rice Cakes',
    'Beef Jerky', 'Hard Boiled Eggs', 'Protein Bar',
  ],
};

const SUBJECTS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python',
  'Machine Learning', 'Data Structures', 'System Design', 'SQL',
  'Docker', 'Kubernetes', 'AWS', 'GraphQL', 'Computer Science',
];

const GOAL_TEMPLATES = [
  { title: 'Bench Press 100kg', category: 'fitness', targetValue: 100, unit: 'kg', priority: 'high' },
  { title: 'Run 5K under 25 minutes', category: 'cardio', targetValue: 25, unit: 'min', priority: 'high' },
  { title: 'Lose 5kg body fat', category: 'fitness', targetValue: 5, unit: 'kg', priority: 'high' },
  { title: 'Read 12 books this year', category: 'learning', targetValue: 12, unit: 'books', priority: 'medium' },
  { title: 'Learn TypeScript', category: 'learning', targetValue: 40, unit: 'hours', priority: 'high' },
  { title: 'Save $5000 emergency fund', category: 'finance', targetValue: 5000, unit: 'USD', priority: 'high' },
  { title: 'Meditate 30 days streak', category: 'wellness', targetValue: 30, unit: 'days', priority: 'medium' },
  { title: 'Squat 140kg', category: 'fitness', targetValue: 140, unit: 'kg', priority: 'high' },
  { title: 'Complete 100 pull-ups total', category: 'fitness', targetValue: 100, unit: 'reps', priority: 'medium' },
  { title: 'Drink 3L water daily for 30 days', category: 'wellness', targetValue: 30, unit: 'days', priority: 'medium' },
  { title: 'Complete AWS certification', category: 'learning', targetValue: 1, unit: 'cert', priority: 'high' },
  { title: 'Run 100km total this month', category: 'cardio', targetValue: 100, unit: 'km', priority: 'medium' },
  { title: 'Pay off credit card', category: 'finance', targetValue: 2000, unit: 'USD', priority: 'high' },
  { title: 'Sleep 8h per night for 30 days', category: 'wellness', targetValue: 30, unit: 'days', priority: 'medium' },
  { title: 'Cook at home 5 days/week', category: 'wellness', targetValue: 20, unit: 'meals', priority: 'low' },
];

const FINANCE_CATEGORIES_INCOME = ['Salary', 'Freelance', 'Investments', 'Side Project', 'Bonus'];
const FINANCE_CATEGORIES_EXPENSE = ['Food', 'Rent', 'Gym', 'Transport', 'Entertainment', 'Clothing', 'Health', 'Education', 'Utilities', 'Subscriptions'];

const HABIT_TEMPLATES = [
  { name: 'Morning Workout', icon: '💪', color: '#ef4444', xpReward: 15 },
  { name: 'Read 30 minutes', icon: '📚', color: '#3b82f6', xpReward: 10 },
  { name: 'Drink 3L water', icon: '💧', color: '#06b6d4', xpReward: 10 },
  { name: 'Meditate 10 minutes', icon: '🧘', color: '#8b5cf6', xpReward: 10 },
  { name: 'No junk food', icon: '🥗', color: '#22c55e', xpReward: 15 },
  { name: 'Cold shower', icon: '🚿', color: '#0ea5e9', xpReward: 10 },
  { name: 'Sleep by 11pm', icon: '😴', color: '#6366f1', xpReward: 10 },
  { name: 'Code 1 hour', icon: '💻', color: '#f59e0b', xpReward: 15 },
];

// ─── Main Seed Function ────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding ELITE OS database...\n');

  // Clean up
  await prisma.message.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.financeEntry.deleteMany();
  await prisma.learningSession.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.cardioSession.deleteMany();
  await prisma.meal.deleteMany();
  await prisma.personalRecord.deleteMany();
  await prisma.sessionExercise.deleteMany();
  await prisma.gymSession.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.habitLog.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.dailyLog.deleteMany();
  await prisma.user.deleteMany();
  console.log('✓ Cleaned existing data\n');

  const hashedPassword = await bcrypt.hash('Elite2024!', 12);

  // ─── Users ─────────────────────────────────────────────────────────────────
  const usersData = [
    {
      username: 'diego',
      email: 'diego@eliteos.app',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=diego',
      baseXP: 8200,
    },
    {
      username: 'pedro',
      email: 'pedro@eliteos.app',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pedro',
      baseXP: 5700,
    },
    {
      username: 'cristopher',
      email: 'cristopher@eliteos.app',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cristopher',
      baseXP: 11500,
    },
  ];

  const createdUsers = [];

  for (const u of usersData) {
    const xp = u.baseXP;
    const user = await prisma.user.create({
      data: {
        username: u.username,
        email: u.email,
        password: hashedPassword,
        avatar: u.avatar,
        xp,
        level: getLevel(xp),
        rank: getRank(xp),
        streak: randomInt(5, 28),
        longestStreak: randomInt(30, 90),
      },
    });
    createdUsers.push(user);
    console.log(`✓ Created user: ${user.username} (${user.rank}, Level ${user.level})`);
  }

  const [diego, pedro, cristopher] = createdUsers;

  // ─── Exercises ────────────────────────────────────────────────────────────
  const exerciseMap = {};

  for (const user of createdUsers) {
    const userKey = user.username;
    exerciseMap[user.id] = [];
    for (const ex of EXERCISES_BY_USER[userKey]) {
      const created = await prisma.exercise.create({
        data: { userId: user.id, name: ex.name, muscleGroups: ex.muscleGroups, equipment: ex.equipment },
      });
      exerciseMap[user.id].push(created);
    }
    console.log(`✓ Created ${exerciseMap[user.id].length} exercises for ${user.username}`);
  }

  // ─── Habits ───────────────────────────────────────────────────────────────
  const habitMap = {};
  for (const user of createdUsers) {
    habitMap[user.id] = [];
    for (const ht of HABIT_TEMPLATES) {
      const habit = await prisma.habit.create({
        data: { userId: user.id, ...ht, frequency: 'daily', targetCount: 1 },
      });
      habitMap[user.id].push(habit);
    }
    console.log(`✓ Created ${habitMap[user.id].length} habits for ${user.username}`);
  }

  // ─── Daily Logs + Habit Logs (60 days) ───────────────────────────────────
  for (const user of createdUsers) {
    for (let i = 59; i >= 0; i--) {
      const date = daysAgo(i);

      // Daily log
      await prisma.dailyLog.create({
        data: {
          userId: user.id,
          date,
          energyLevel: randomInt(5, 9),
          mood: randomInt(5, 9),
          sleepHours: randomFloat(6.5, 9, 1),
          waterGlasses: randomInt(6, 12),
          notes: i % 7 === 0 ? 'Great week overall, feeling strong!' : null,
        },
      });

      // Habit logs (70% completion rate)
      for (const habit of habitMap[user.id]) {
        const completed = Math.random() > 0.3;
        await prisma.habitLog.create({
          data: {
            habitId: habit.id,
            userId: user.id,
            date,
            completed,
            count: completed ? 1 : 0,
          },
        });
      }
    }
    console.log(`✓ Created 60 days of logs for ${user.username}`);
  }

  // ─── Gym Sessions (30 per user) ───────────────────────────────────────────
  for (const user of createdUsers) {
    const exercises = exerciseMap[user.id];

    for (let i = 0; i < 30; i++) {
      const date = daysAgo(randomInt(0, 59));
      const name = pickRandom(GYM_SESSION_NAMES);
      const numExercises = randomInt(3, 6);
      const selectedExercises = [...exercises].sort(() => 0.5 - Math.random()).slice(0, numExercises);

      let totalVolume = 0;
      const sessionExercises = selectedExercises.map((ex) => {
        const sets = Array.from({ length: randomInt(3, 5) }, () => {
          const weight = randomFloat(40, 140, 1);
          const reps = randomInt(5, 12);
          totalVolume += weight * reps;
          return { weight, reps, completed: true };
        });
        return { exerciseId: ex.id, sets };
      });

      const session = await prisma.gymSession.create({
        data: {
          userId: user.id,
          date,
          name,
          duration: randomInt(45, 90),
          notes: Math.random() > 0.6 ? 'Good session, hit a new PR!' : null,
          totalVolume,
          sessionExercises: {
            create: sessionExercises,
          },
        },
      });
    }
    console.log(`✓ Created 30 gym sessions for ${user.username}`);
  }

  // ─── Personal Records ─────────────────────────────────────────────────────
  for (const user of createdUsers) {
    const exercises = exerciseMap[user.id];
    for (const ex of exercises.slice(0, 5)) {
      await prisma.personalRecord.create({
        data: {
          userId: user.id,
          exerciseId: ex.id,
          weight: randomFloat(80, 180, 1),
          reps: randomInt(1, 5),
          date: daysAgo(randomInt(5, 30)),
        },
      });
    }
    console.log(`✓ Created personal records for ${user.username}`);
  }

  // ─── Nutrition (30 days per user) ────────────────────────────────────────
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

  for (const user of createdUsers) {
    for (let i = 29; i >= 0; i--) {
      const date = daysAgo(i);
      const numMeals = randomInt(3, 5);
      const mealsForDay = [...mealTypes].slice(0, numMeals);

      for (const mealType of mealsForDay) {
        const name = pickRandom(MEAL_NAMES[mealType]);
        const calories = randomInt(
          mealType === 'snack' ? 150 : 400,
          mealType === 'snack' ? 400 : 800
        );

        await prisma.meal.create({
          data: {
            userId: user.id,
            date,
            mealType,
            name,
            calories,
            protein: randomFloat(15, 55, 1),
            carbs: randomFloat(20, 80, 1),
            fat: randomFloat(5, 30, 1),
            fiber: randomFloat(2, 12, 1),
          },
        });
      }
    }
    console.log(`✓ Created 30 days of nutrition for ${user.username}`);
  }

  // ─── Cardio Sessions (20 per user) ───────────────────────────────────────
  for (const user of createdUsers) {
    for (let i = 0; i < 20; i++) {
      const type = pickRandom(CARDIO_TYPES);
      const hasDistance = ['Running', 'Cycling', 'Swimming', 'Walking'].includes(type);

      await prisma.cardioSession.create({
        data: {
          userId: user.id,
          date: daysAgo(randomInt(0, 59)),
          type,
          duration: randomInt(20, 75),
          distance: hasDistance ? randomFloat(2, 15, 2) : null,
          calories: randomInt(150, 600),
          avgHeartRate: randomInt(120, 165),
          notes: Math.random() > 0.6 ? `Felt great! ${type} session completed.` : null,
        },
      });
    }
    console.log(`✓ Created 20 cardio sessions for ${user.username}`);
  }

  // ─── Learning Sessions (10 per user) ─────────────────────────────────────
  for (const user of createdUsers) {
    for (let i = 0; i < 10; i++) {
      const subject = pickRandom(SUBJECTS);
      const duration = randomInt(30, 120);
      const xpEarned = Math.round((duration / 60) * 40);

      await prisma.learningSession.create({
        data: {
          userId: user.id,
          date: daysAgo(randomInt(0, 59)),
          subject,
          language: ['JavaScript', 'TypeScript', 'Python', 'SQL'].includes(subject) ? subject : null,
          duration,
          xpEarned,
          notes: `Studied ${subject}. Good progress!`,
        },
      });
    }
    console.log(`✓ Created 10 learning sessions for ${user.username}`);
  }

  // ─── Goals (15 per user, mix of completed and active) ────────────────────
  for (const user of createdUsers) {
    const shuffled = [...GOAL_TEMPLATES].sort(() => 0.5 - Math.random());

    for (let i = 0; i < 15; i++) {
      const template = shuffled[i % shuffled.length];
      const isCompleted = i < 5; // first 5 are completed
      const currentValue = isCompleted
        ? template.targetValue
        : randomFloat(template.targetValue * 0.1, template.targetValue * 0.9, 1);

      const deadlineOffset = randomInt(30, 365);

      await prisma.goal.create({
        data: {
          userId: user.id,
          title: template.title,
          description: `Working toward: ${template.title}`,
          category: template.category,
          targetValue: template.targetValue,
          currentValue,
          unit: template.unit,
          deadline: daysAgo(-deadlineOffset),
          status: isCompleted ? 'completed' : i < 12 ? 'active' : 'paused',
          priority: template.priority,
        },
      });
    }
    console.log(`✓ Created 15 goals for ${user.username}`);
  }

  // ─── Finance Entries ──────────────────────────────────────────────────────
  for (const user of createdUsers) {
    // Monthly salary for 6 months
    for (let m = 5; m >= 0; m--) {
      const d = new Date();
      d.setMonth(d.getMonth() - m);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);

      await prisma.financeEntry.create({
        data: {
          userId: user.id,
          date: d,
          type: 'income',
          category: 'Salary',
          amount: randomFloat(3500, 6000, 2),
          description: 'Monthly salary',
        },
      });

      // Freelance income some months
      if (Math.random() > 0.4) {
        await prisma.financeEntry.create({
          data: {
            userId: user.id,
            date: new Date(d.getFullYear(), d.getMonth(), randomInt(5, 25)),
            type: 'income',
            category: 'Freelance',
            amount: randomFloat(300, 1500, 2),
            description: 'Freelance project',
          },
        });
      }

      // Expenses per month
      const expenseCount = randomInt(8, 15);
      for (let e = 0; e < expenseCount; e++) {
        const category = pickRandom(FINANCE_CATEGORIES_EXPENSE);
        const amounts = {
          Rent: [800, 1500],
          Food: [100, 400],
          Gym: [30, 80],
          Transport: [50, 200],
          Entertainment: [20, 150],
          Clothing: [30, 200],
          Health: [20, 100],
          Education: [50, 300],
          Utilities: [40, 120],
          Subscriptions: [10, 60],
        };
        const [min, max] = amounts[category] || [20, 200];

        await prisma.financeEntry.create({
          data: {
            userId: user.id,
            date: new Date(d.getFullYear(), d.getMonth(), randomInt(1, 28)),
            type: 'expense',
            category,
            amount: randomFloat(min, max, 2),
            description: `${category} expense`,
          },
        });
      }
    }
    console.log(`✓ Created finance entries for ${user.username}`);
  }

  // ─── Messages ─────────────────────────────────────────────────────────────
  const conversations = [
    { from: diego, to: pedro },
    { from: pedro, to: cristopher },
    { from: cristopher, to: diego },
    { from: diego, to: cristopher },
  ];

  const messageTemplates = [
    "Bro, how was your workout today?",
    "Crushed leg day! Volume is up 10% this week 💪",
    "Don't forget we're competing on XP this week haha",
    "Just hit a new PR on deadlift! 180kg!",
    "What's your split looking like this week?",
    "Nutrition on point today, 200g protein done",
    "That new running route is 🔥",
    "Challenge: who gets more XP this week?",
    "My streak is at 25 days, don't break yours!",
    "Learning session done. TypeScript is getting easier",
    "Have you tried the new HIIT protocol?",
    "Sleep quality has been amazing this week",
    "Goal update: 75% done on the bench press target",
    "Post your macros, let's compare",
    "Morning session at 6am, who's joining?",
  ];

  for (const conv of conversations) {
    const numMessages = randomInt(8, 15);
    for (let i = numMessages; i >= 0; i--) {
      const isFromSender = Math.random() > 0.4;
      const sender = isFromSender ? conv.from : conv.to;
      const receiver = isFromSender ? conv.to : conv.from;
      const createdAt = new Date();
      createdAt.setHours(createdAt.getHours() - randomInt(i * 2, i * 4 + 1));

      await prisma.message.create({
        data: {
          senderId: sender.id,
          receiverId: receiver.id,
          content: pickRandom(messageTemplates),
          read: i > 2,
          createdAt,
        },
      });
    }
  }
  console.log('✓ Created messages between users');

  // ─── Badges ───────────────────────────────────────────────────────────────
  const badges = [
    { name: 'First Workout', description: 'Completed your first gym session', icon: '🏋️', xpRequired: 0, category: 'gym' },
    { name: 'Consistency King', description: '30-day streak', icon: '🔥', xpRequired: 500, category: 'streak' },
    { name: 'Iron Will', description: 'Completed 50 gym sessions', icon: '⚡', xpRequired: 2500, category: 'gym' },
    { name: 'Speed Demon', description: 'Ran 5K in under 25 minutes', icon: '🏃', xpRequired: 1000, category: 'cardio' },
    { name: 'Bookworm', description: 'Completed 10 learning sessions', icon: '📚', xpRequired: 400, category: 'learning' },
    { name: 'Gold Standard', description: 'Reached Gold rank', icon: '🥇', xpRequired: 2001, category: 'rank' },
    { name: 'Diamond Mind', description: 'Reached Diamond rank', icon: '💎', xpRequired: 10001, category: 'rank' },
    { name: 'Nutrition Ninja', description: 'Logged meals for 14 days straight', icon: '🥗', xpRequired: 300, category: 'nutrition' },
    { name: 'Habit Hero', description: 'Completed all habits for 7 days', icon: '⭐', xpRequired: 200, category: 'habits' },
    { name: 'Money Maestro', description: 'Logged 30 finance entries', icon: '💰', xpRequired: 0, category: 'finance' },
  ];

  const createdBadges = [];
  for (const badge of badges) {
    const b = await prisma.badge.upsert({
      where: { name: badge.name },
      update: badge,
      create: badge,
    });
    createdBadges.push(b);
  }
  console.log('✓ Created badges');

  // Award badges based on XP and activity
  for (const user of createdUsers) {
    const earned = createdBadges.filter((b) => user.xp >= b.xpRequired);
    for (const badge of earned) {
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
        update: {},
        create: {
          userId: user.id,
          badgeId: badge.id,
          unlockedAt: daysAgo(randomInt(5, 30)),
        },
      });
    }
    console.log(`✓ Awarded ${earned.length} badges to ${user.username}`);
  }

  console.log('\n✅ Seeding complete!');
  console.log('\nUsers created:');
  for (const user of createdUsers) {
    console.log(`  📧 ${user.email} | 🔑 Elite2024! | 🏆 ${user.rank} | ⭐ Level ${user.level} | 💎 ${user.xp} XP`);
  }
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
