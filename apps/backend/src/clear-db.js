const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clearAll() {
  console.log('Clearing all user data from ELITE OS database...')

  await prisma.$transaction([
    prisma.earnedReward.deleteMany(),
    prisma.betAcceptance.deleteMany(),
    prisma.bet.deleteMany(),
    prisma.savingsEntry.deleteMany(),
    prisma.savingsConfig.deleteMany(),
    prisma.userBadge.deleteMany(),
    prisma.message.deleteMany(),
    prisma.financeEntry.deleteMany(),
    prisma.debuff.deleteMany(),
    prisma.dailyCombo.deleteMany(),
    prisma.dailyLog.deleteMany(),
    prisma.habitLog.deleteMany(),
    prisma.habit.deleteMany(),
    prisma.sessionExercise.deleteMany(),
    prisma.personalRecord.deleteMany(),
    prisma.gymSession.deleteMany(),
    prisma.exercise.deleteMany(),
    prisma.meal.deleteMany(),
    prisma.cardioSession.deleteMany(),
    prisma.learningSession.deleteMany(),
    prisma.learningInterest.deleteMany(),
    prisma.learningItem.deleteMany(),
    prisma.milestone.deleteMany(),
    prisma.goal.deleteMany(),
    prisma.user.deleteMany(),
  ])

  console.log('Done. All users and data cleared.')
  await prisma.$disconnect()
}

clearAll().catch(e => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
