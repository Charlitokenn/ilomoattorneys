import type { MiddlewareHandler } from "astro"
import { sequence } from "astro:middleware"
import { clerkMiddleware } from "@clerk/astro/server"

// Populates Astro.locals.auth() on every request. Clerk's Astro SDK
// deliberately dropped path-based route matching here (createRouteMatcher)
// in favor of checking auth in each protected page/route directly — see
// src/pages/admin/*.astro and src/pages/admin/login.astro.
const clerk = clerkMiddleware()

// Never let a CDN, proxy, or the browser cache an authenticated admin
// response — a cached 200 served to the next visitor would bypass the
// auth check in the page entirely.
const noStoreForAdmin: MiddlewareHandler = async (context, next) => {
  const response = await next()
  const { pathname } = context.url
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    response.headers.set("Cache-Control", "no-store, private")
  }
  return response
}

export const onRequest = sequence(clerk, noStoreForAdmin)
