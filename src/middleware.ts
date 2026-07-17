import { defineMiddleware } from "astro:middleware"
import { getSessionUser } from "./lib/auth"

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url

  const isAdminPage =
      (pathname === "/admin" || pathname.startsWith("/admin/")) &&
      pathname !== "/admin/login"
  const isProtectedApi = pathname.startsWith("/api/articles")

  if (isAdminPage || isProtectedApi) {
    const user = await getSessionUser(context.cookies)

    if (!user) {
      if (isProtectedApi) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      }
      return context.redirect("/admin/login")
    }

    context.locals.user = user
  }

  const response = await next()

  // Never let a CDN, proxy, or the browser cache an authenticated admin
  // response — a cached 200 served to the next visitor would bypass the
  // auth check above entirely.
  if (isAdminPage || isProtectedApi || pathname === "/admin/login") {
    response.headers.set("Cache-Control", "no-store, private")
  }

  return response
})