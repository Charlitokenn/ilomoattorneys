import { defineConfig } from "astro/config"
import tailwindcss from "@tailwindcss/vite"
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    // You don't use <Image> transforms, so skip provisioning the
    // Cloudflare Images binding entirely.
    imageService: "passthrough", prerenderEnvironment: "node"
  }),
  vite: {
    plugins: [tailwindcss()],
  },
})