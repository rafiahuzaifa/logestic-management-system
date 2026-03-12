import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // VIEWER: read-only — block all write routes
    if (token?.role === 'VIEWER') {
      const blocked = [
        '/inventory/new',
        '/suppliers/new',
        '/purchase-orders/new',
        '/shipments/new',
        '/warehouses/new',
        '/settings/users',
      ]
      if (blocked.some((b) => path.startsWith(b))) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/inventory/:path*',
    '/suppliers/:path*',
    '/purchase-orders/:path*',
    '/shipments/:path*',
    '/warehouses/:path*',
    '/forecasting/:path*',
    '/reports/:path*',
    '/alerts/:path*',
    '/settings/:path*',
  ],
}
