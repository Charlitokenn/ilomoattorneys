import type { APIRoute } from "astro"

const TO_EMAIL = "happyilomo1@gmail.com"
// Must be an address on a domain you've verified in Resend — you cannot
// send "from" a Gmail address. See notes in the chat reply for setup.
const FROM_EMAIL = "Website Consultation Request<consultations@ilomoattorneys.com>"

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string
  )

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export const POST: APIRoute = async ({ request }) => {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid form submission." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const name = String(form.get("name") || "").trim()
  const email = String(form.get("email") || "").trim()
  const phone = String(form.get("phone") || "").trim()
  const message = String(form.get("message") || "").trim()
  // Honeypot: real visitors never see or fill this field (hidden in CSS).
  // Bots that auto-fill every input will trip it.
  const honeypot = String(form.get("company_website") || "").trim()

  if (honeypot) {
    // Pretend success so the bot doesn't learn to avoid this field.
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!name || !email) {
    return new Response(JSON.stringify({ error: "Name and email are required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: "Please enter a valid email address." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Matches the import.meta.env pattern already used in lib/db.ts for
  // DATABASE_URL, so it picks up .dev.vars locally and the Cloudflare
  // Worker secret in production the same way.
  const RESEND_API_KEY = import.meta.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured.")
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again shortly." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  const html = `
    <h2 style="font-family:sans-serif;">New consultation request</h2>
    <p style="font-family:sans-serif;"><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p style="font-family:sans-serif;"><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p style="font-family:sans-serif;"><strong>Phone:</strong> ${escapeHtml(phone) || "—"}</p>
    <p style="font-family:sans-serif;"><strong>Goals:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>") || "—"}</p>
  `.trim()

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: email,
        subject: `New consultation request from ${name}`,
        html,
      }),
    })

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text()
      console.error("Resend API error:", resendResponse.status, errorBody)
      return new Response(JSON.stringify({ error: "Something went wrong. Please try again shortly." }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      })
    }
  } catch (err) {
    console.error("Failed to reach Resend:", err)
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again shortly." }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}
