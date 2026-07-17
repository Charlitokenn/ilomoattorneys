import crypto from "node:crypto"
import type { AstroCookies } from "astro"

const COOKIE_NAME = "admin_session"

function getPassword(): string {
  return (
    (import.meta as any).env?.ADMIN_PASSWORD
  )
}

function getSecret(): string {
  return (
    (import.meta as any).env?.SESSION_SECRET || "insecure-dev-secret"
  )
}

/** Deterministic session token derived from the secret. */
function expectedToken(): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update("admin-authenticated")
    .digest("hex")
}

export function isPasswordConfigured(): boolean {
  return getPassword().length > 0
}

export function verifyPassword(candidate: string): boolean {
  const expected = getPassword()
  if (!expected) return false
  const a = Buffer.from(candidate)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function createSession(cookies: AstroCookies): void {
  cookies.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export function destroySession(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: "/" })
}

export function isAuthenticated(cookies: AstroCookies): boolean {
  const token = cookies.get(COOKIE_NAME)?.value
  if (!token) return false
  const expected = expectedToken()
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
