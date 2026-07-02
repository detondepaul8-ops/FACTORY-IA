import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
<<<<<<< HEAD
    log: ['query'],
=======
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db