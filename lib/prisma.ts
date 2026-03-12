import { PrismaClient } from '@prisma/client'
import { Pool as NeonPool } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool as PgPool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL!
  const isNeon = url?.includes('neon.tech')

  if (isNeon) {
    // Neon serverless pool — works in Vercel serverless functions
    const pool = new NeonPool({ connectionString: url })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = new PrismaNeon(pool as any)
    return new PrismaClient({ adapter, log: ['error'] })
  }

  // Local PostgreSQL — standard pg Pool
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pool = new PgPool({ connectionString: url }) as any
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
