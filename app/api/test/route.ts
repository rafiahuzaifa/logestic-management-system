import { NextResponse } from 'next/server'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL
  const hasDb = !!dbUrl
  const isNeon = dbUrl?.includes('neon.tech') ?? false
  const prefix = dbUrl ? dbUrl.slice(0, 30) + '...' : 'UNDEFINED'

  // Try importing prisma dynamically
  try {
    const { prisma } = await import('@/lib/prisma')
    const count = await prisma.user.count()
    return NextResponse.json({ ok: true, hasDb, isNeon, prefix, userCount: count })
  } catch (err) {
    return NextResponse.json({ ok: false, hasDb, isNeon, prefix, error: String(err) }, { status: 500 })
  }
}
