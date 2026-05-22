const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'crisunipersonal@gmail.com' },
    select: { id: true, username: true, email: true, password: true, level: true, xp: true }
  })

  if (!user) {
    console.log('USER NOT FOUND in database')
    return
  }

  console.log('User found:', { id: user.id, username: user.username, email: user.email, level: user.level, xp: user.xp })

  const match = await bcrypt.compare('Cris200$', user.password)
  console.log('Password "Cris200$" matches:', match)

  if (!match) {
    const newHash = await bcrypt.hash('Cris200$', 12)
    await prisma.user.update({
      where: { email: 'crisunipersonal@gmail.com' },
      data: { password: newHash }
    })
    console.log('Password has been reset to Cris200$')
  } else {
    console.log('Password is correct — login issue is not about the password')
  }
}

main()
  .catch(e => { console.error('DB Error:', e.message) })
  .finally(() => prisma.$disconnect())
