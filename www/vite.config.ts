import { paraglideVitePlugin } from '@inlang/paraglide-js'
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { cloudflare } from "@cloudflare/vite-plugin"
import { devtools } from "@tanstack/devtools-vite"
import tailwindcss from "@tailwindcss/vite"
import babel from "@rolldown/plugin-babel"
import { defineConfig } from "vite"
import path from "path"

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": path.resolve(import.meta.dirname, "./src")
    },
  },
  plugins: [
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './collections',
      outputStructure: 'message-modules',
      cookieName: 'PARAGLIDE_LOCALE',
      strategy: ['url', 'cookie', 'preferredLanguage', 'baseLocale']
    }),
    cloudflare({
      viteEnvironment: {
        name: "ssr",
      },
      persistState: true,
    }),
    devtools(),
    tailwindcss(),
    tanstackStart(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    viteReact()
  ],
})

export default config
