import { defineConfig } from "astro/config"
import tailwindcss from "@tailwindcss/vite"
import cloudflare from '@astrojs/cloudflare';
import clerk from "@clerk/astro"

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    // You don't use <Image> transforms, so skip provisioning the
    // Cloudflare Images binding entirely.
    imageService: "passthrough",
    //TODO - Remove this as it's for dev only
    prerenderEnvironment: "node",
  }),
  integrations: [
    clerk({
      // Sends unauthenticated /admin/* visitors to our own branded
      // sign-in page instead of Clerk's hosted Account Portal.
      signInUrl: "/admin/login",
      signInFallbackRedirectUrl: "/admin",
      // UserButton's sign-out redirect is configured globally, not per-component
      // (the old per-button afterSignOutUrl prop was removed upstream).
      afterSignOutUrl: "/admin/login",
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})