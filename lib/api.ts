import axios from 'axios'
import { getSession } from 'next-auth/react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'

export const api = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach NextAuth JWT to every FastAPI request
api.interceptors.request.use(async (config) => {
  const session = await getSession()
  if (session) {
    config.headers.Authorization = `Bearer ${(session as any).accessToken ?? ''}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.detail ?? err.message ?? 'Something went wrong'
    return Promise.reject(new Error(message))
  }
)
