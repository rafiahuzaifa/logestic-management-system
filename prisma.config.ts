import { defineConfig } from 'prisma/config'

// Prisma 7: database URL for migrations lives here (not in schema.prisma)
export default defineConfig({
  migrations: {
    seed: 'ts-node ./prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres@localhost:5432/lsm_db?schema=public',
  },
})
