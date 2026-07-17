import type { AstroCookies } from "astro"
import { sql } from "./db"

const COOKIE_NAME = "admin_session"
const SESSION_DAYS = 7

export interface AuthUser {
  id: number
  email: string
}

/** 256 bits of randomness from the Web Crypto API — native on Cloudflare
 *  Workers, no node:crypto / nodejs_compat flag required. */
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

/** Only a SHA-256 hash of the token is ever stored/compared — a DB leak
 *  alone can't be used to log in. */
async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
}

/** Verifies email + password. Hashing/verification happens inside Postgres
 *  via pgcrypto's crypt(), so no bcrypt library is needed in the Worker. */
export async function verifyCredentials(email: string, password: string): Promise<AuthUser | null> {
  if (!email || !password) return null
  const rows = (await sql`
    SELECT id, email FROM users
    WHERE email = ${email.toLowerCase().trim()}
      AND password_hash = crypt(${password}, password_hash)
    LIMIT 1
  `) as AuthUser[]
  return rows[0] ?? null
}

/** Creates a server-side session record and sets the session cookie. */
export async function createSession(cookies: AstroCookies, userId: number): Promise<void> {
  const token = generateToken()
  const tokenHash = await hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  await sql`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
  `

  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

/** Returns the authenticated user for this request, or null. An expired/
 *  revoked session clears the stale cookie. */
export async function getSessionUser(cookies: AstroCookies): Promise<AuthUser | null> {
  const token = cookies.get(COOKIE_NAME)?.value
  if (!token) return null

  const tokenHash = await hashToken(token)
  const rows = (await sql`
    SELECT u.id, u.email FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash} AND s.expires_at > now()
    LIMIT 1
  `) as AuthUser[]

  if (!rows[0]) {
    cookies.delete(COOKIE_NAME, { path: "/" })
    return null
  }
  return rows[0]
}

/** Revokes the session in the database, not just the cookie — a stolen
 *  cookie can't keep working after logout. */
export async function destroySession(cookies: AstroCookies): Promise<void> {
  const token = cookies.get(COOKIE_NAME)?.value
  if (token) {
    const tokenHash = await hashToken(token)
    await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`
  }
  cookies.delete(COOKIE_NAME, { path: "/" })
}