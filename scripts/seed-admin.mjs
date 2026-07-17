import { neon } from "@neondatabase/serverless"

const URL = import.meta.env?.DATABASE_URL
const EMAIL = (import.meta).env?.ADMIN_EMAIL
const PASSWORD = (import.meta).env?.ADMIN_PASSWORD

if (!URL) throw new Error("DATABASE_URL is required")
if (!EMAIL) throw new Error("ADMIN_EMAIL is required")
if (!PASSWORD || PASSWORD.length < 12) {
    throw new Error("ADMIN_PASSWORD is required and should be at least 12 characters")
}

const sql = neon(URL)

const rows = await sql`
  INSERT INTO users (email, password_hash)
  VALUES (${EMAIL.toLowerCase().trim()}, crypt(${PASSWORD}, gen_salt('bf', 10)))
  ON CONFLICT (email)
  DO UPDATE SET password_hash = crypt(${PASSWORD}, gen_salt('bf', 10))
  RETURNING id, email
`

console.log(`✅ Admin user ready: ${rows[0].email} (id ${rows[0].id})`)