import type { APIRoute } from "astro"

export const GET: APIRoute = ({ site, url }) => {
  const base = (site?.toString().replace(/\/$/, "")) || url.origin
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: ${base}/sitemap.xml
`
  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  })
}
