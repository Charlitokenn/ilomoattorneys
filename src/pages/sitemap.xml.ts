import type { APIRoute } from "astro"
import { getPublishedArticles } from "../lib/db"

export const GET: APIRoute = async ({ site, url }) => {
  const base = (site?.toString().replace(/\/$/, "")) || url.origin
  const articles = await getPublishedArticles()

  const staticUrls = [
    { loc: `${base}/`, priority: "1.0" },
    { loc: `${base}/blog`, priority: "0.8" },
  ]

  const articleUrls = articles.map((a) => ({
    loc: `${base}/blog/${a.slug}`,
    lastmod: (a.updated_at || a.published_at || "").slice(0, 10),
    priority: "0.7",
  }))

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...articleUrls]
  .map(
    (u: any) =>
      `  <url>\n    <loc>${u.loc}</loc>${
        u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""
      }\n    <priority>${u.priority}</priority>\n  </url>`
  )
  .join("\n")}
</urlset>`

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  })
}
