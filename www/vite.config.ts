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
  optimizeDeps: {
    // maplibre-gl loads its tile-processing work off a Web Worker it
    // constructs internally; esbuild's dep pre-bundling rewrites that
    // worker's URL and breaks it ("Worker failed to load"), leaving the
    // map canvas blank. Excluding it from pre-bundling lets it load as
    // real ESM, where its own worker loading works correctly.
    exclude: ["maplibre-gl"],
  },
  plugins: [
    paraglideVitePlugin({
      project: path.resolve(import.meta.dirname, './project.inlang'),
      outdir: path.resolve(import.meta.dirname, './src/paraglide'),
      outputStructure: 'message-modules',
      cookieName: 'PARAGLIDE_LOCALE',
      strategy: ['url', 'cookie', 'preferredLanguage', 'baseLocale'],
      emitTsDeclarations: true,
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
