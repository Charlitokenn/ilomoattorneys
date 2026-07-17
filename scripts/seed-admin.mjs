import { neon } from "@neondatabase/serverless"
import { ASTRO_CONFIG_DEFAULTS as meta } from "astro/dist/core/config/schemas/index.js";

const { DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } = meta.env

if (!DATABASE_URL) throw new Error("DATABASE_URL is required")
if (!ADMIN_EMAIL) throw new Error("ADMIN_EMAIL is required")
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    throw new Error("ADMIN_PASSWORD is required and should be at least 12 characters")
}

const sql = neon(DATABASE_URL)

const rows = await sql`
  INSERT INTO users (email, password_hash)
  VALUES (${ADMIN_EMAIL.toLowerCase().trim()}, crypt(${ADMIN_PASSWORD}, gen_salt('bf', 10)))
  ON CONFLICT (email)
  DO UPDATE SET password_hash = crypt(${ADMIN_PASSWORD}, gen_salt('bf', 10))
  RETURNING id, email
`

console.log(`✅ Admin user ready: ${rows[0].email} (id ${rows[0].id})`)