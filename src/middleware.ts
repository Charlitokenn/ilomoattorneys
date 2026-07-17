import { defineMiddleware } from "astro:middleware"
import { isAuthenticated } from "./lib/auth"

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url

  const isAdminPage =
    pathname.startsWith("/admin") && pathname !== "/admin/login"
  const isProtectedApi = pathname.startsWith("/api/articles")

  if (isAdminPage || isProtectedApi) {
    if (!isAuthenticated(context.cookies)) {
      if (isProtectedApi) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      }
      return context.redirect("/admin/login")
    }
  }

  return next()
})
