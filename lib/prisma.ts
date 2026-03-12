import { PrismaClient } from '@prisma/client'
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
    // PrismaNeon v7 takes a PoolConfig directly (not a Pool instance)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = new PrismaNeon({ connectionString: url } as any)
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
