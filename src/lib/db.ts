import { neon } from "@neondatabase/serverless"

const connectionString =  (import.meta as any).env?.DATABASE_URL

if (!connectionString) {
  console.error("[v0] DATABASE_URL is not set")
}

export const sql = neon(connectionString)

export interface Article {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image: string
  category: string
  author: string
  status: "draft" | "published"
  meta_title: string
  meta_description: string
  meta_keywords: string
  og_image: string
  canonical_url: string
  reading_minutes: number
  published_at: string | null
  created_at: string
  updated_at: string
}

export async function getPublishedArticles(category?: string): Promise<Article[]> {
  if (category && category !== "All") {
    return (await sql`
      SELECT * FROM articles
      WHERE status = 'published' AND category = ${category}
      ORDER BY published_at DESC NULLS LAST, created_at DESC
    `) as Article[]
  }
  return (await sql`
    SELECT * FROM articles
    WHERE status = 'published'
    ORDER BY published_at DESC NULLS LAST, created_at DESC
  `) as Article[]
}

export async function getPublishedCategories(): Promise<string[]> {
  const rows = (await sql`
    SELECT DISTINCT category FROM articles WHERE status = 'published' ORDER BY category
  `) as { category: string }[]
  return rows.map((r) => r.category)
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const rows = (await sql`
    SELECT * FROM articles WHERE slug = ${slug} LIMIT 1
  `) as Article[]
  return rows[0] ?? null
}

export async function getRelatedArticles(
  category: string,
  excludeId: number,
  limit = 3
): Promise<Article[]> {
  return (await sql`
    SELECT * FROM articles
    WHERE status = 'published' AND category = ${category} AND id <> ${excludeId}
    ORDER BY published_at DESC NULLS LAST
    LIMIT ${limit}
  `) as Article[]
}

export async function getAllArticles(): Promise<Article[]> {
  return (await sql`
    SELECT * FROM articles
    ORDER BY created_at DESC
  `) as Article[]
}

export async function getArticleById(id: number): Promise<Article | null> {
  const rows = (await sql`
    SELECT * FROM articles WHERE id = ${id} LIMIT 1
  `) as Article[]
  return rows[0] ?? null
}

export interface ArticleInput {
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image: string
  category: string
  author: string
  status: "draft" | "published"
  meta_title: string
  meta_description: string
  meta_keywords: string
  og_image: string
  canonical_url: string
  reading_minutes: number
}

export async function createArticle(data: ArticleInput): Promise<Article> {
  const publishedAt = data.status === "published" ? new Date().toISOString() : null
  const rows = (await sql`
    INSERT INTO articles (
      title, slug, excerpt, content, cover_image, category, author, status,
      meta_title, meta_description, meta_keywords, og_image, canonical_url,
      reading_minutes, published_at
    ) VALUES (
      ${data.title}, ${data.slug}, ${data.excerpt}, ${data.content}, ${data.cover_image},
      ${data.category}, ${data.author}, ${data.status}, ${data.meta_title},
      ${data.meta_description}, ${data.meta_keywords}, ${data.og_image},
      ${data.canonical_url}, ${data.reading_minutes}, ${publishedAt}
    )
    RETURNING *
  `) as Article[]
  return rows[0]
}

export async function updateArticle(id: number, data: ArticleInput): Promise<Article> {
  // Preserve original published_at; set it when transitioning to published.
  const existing = await getArticleById(id)
  let publishedAt = existing?.published_at ?? null
  if (data.status === "published" && !publishedAt) {
    publishedAt = new Date().toISOString()
  }
  if (data.status === "draft") {
    publishedAt = null
  }
  const rows = (await sql`
    UPDATE articles SET
      title = ${data.title},
      slug = ${data.slug},
      excerpt = ${data.excerpt},
      content = ${data.content},
      cover_image = ${data.cover_image},
      category = ${data.category},
      author = ${data.author},
      status = ${data.status},
      meta_title = ${data.meta_title},
      meta_description = ${data.meta_description},
      meta_keywords = ${data.meta_keywords},
      og_image = ${data.og_image},
      canonical_url = ${data.canonical_url},
      reading_minutes = ${data.reading_minutes},
      published_at = ${publishedAt},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `) as Article[]
  return rows[0]
}

export async function deleteArticle(id: number): Promise<void> {
  await sql`DELETE FROM articles WHERE id = ${id}`
}

export async function slugExists(slug: string, excludeId?: number): Promise<boolean> {
  const rows = excludeId
    ? ((await sql`SELECT 1 FROM articles WHERE slug = ${slug} AND id <> ${excludeId} LIMIT 1`) as unknown[])
    : ((await sql`SELECT 1 FROM articles WHERE slug = ${slug} LIMIT 1`) as unknown[])
  return rows.length > 0
}
